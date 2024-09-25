import * as Natives from './native/index.js';
const Native = Natives[process.platform];

const timestamps = {};
const names = {};
const pids = {};

export default class {
    constructor(handlers) {
        if (!Native) return;

        this.handlers = handlers;

        this.scan = this.scan.bind(this);

        this.getDB();

        this.scan();
        setInterval(this.scan, 10000); // every 10 seconds instead of 5
    }

    async getDB() {
        if (this.DetectableDB) return this.DetectableDB;

        const data = await fetch("https://discord.com/api/v9/applications/detectable")

        this.DetectableDB = await data.json();

        return this.DetectableDB;
    }

    async scan() {
        const processes = await Native.getProcesses();
        const ids = [];

        const DetectableDB = await this.getDB();

        for (const [pid, _path, args] of processes) {
            const path = _path.toLowerCase().replaceAll('\\', '/');
            const toCompare = [];
            const splitPath = path.split('/');
            for (let i = 1; i < splitPath.length; i++) {
                toCompare.push(splitPath.slice(-i).join('/'));
            }

            for (const p of toCompare.slice()) {
                toCompare.push(p.replace('64', ''));
                toCompare.push(p.replace('.x64', ''));
                toCompare.push(p.replace('x64', ''));
                toCompare.push(p.replace('_64', ''));
            }

            for (const { executables, id, name } of DetectableDB) {
                if (executables?.some(x => {
                    if (x.is_launcher) return false;
                    if (x.name[0] === '>' ? x.name.substring(1) !== toCompare[0] : !toCompare.some(y => x.name === y)) return false;
                    if (args && x.arguments) return args.join(" ").indexOf(x.arguments) > -1;
                    return true;
                })) {
                    names[id] = name;
                    pids[id] = pid;

                    ids.push(id);
                    if (!timestamps[id]) {
                        timestamps[id] = Date.now();
                    }

                    this.handlers.message({
                        socketId: id
                    }, {
                        cmd: 'SET_ACTIVITY',
                        args: {
                            activity: {
                                application_id: id,
                                name,
                                timestamps: {
                                    start: timestamps[id]
                                }
                            },
                            pid
                        }
                    });
                }
            }
        }

        for (const id in timestamps) {
            if (!ids.includes(id)) {
                delete timestamps[id];

                this.handlers.message({
                    socketId: id
                }, {
                    cmd: 'SET_ACTIVITY',
                    args: {
                        activity: null,
                        pid: pids[id]
                    }
                });
            }
        }
    }
}