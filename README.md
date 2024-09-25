<img src="https://cdn.jsdelivr.net/gh/wont-stream/bunRPC@main/assets/bunRPC-Banner.png" align="center" />

<h2 align="center">OpenASAR ported to bun.</h2>

<h3>Compiled Builds</h3>

| --target              | Operating System | Architecture | Modern | Baseline |
| --------------------- | ---------------- | ------------ | ------ | -------- |
| bunRPC-linux-x64         | Linux            | x64          | ✅     | ✅       |
| bunRPC-linux-arm64       | Linux            | arm64        | ✅     | N/A      |
| bunRPC-windows-x64       | Windows          | x64          | ✅     | ✅       |
| ~~bunRPC-windows-arm64~~ | Windows          | arm64        | ❌     | ❌       |
| bunRPC-darwin-x64        | macOS            | x64          | ✅     | ✅       |
| bunRPC-darwin-arm64      | macOS            | arm64        | ✅     | N/A      |

On x64 platforms, bunRPC uses SIMD optimizations which require a modern CPU supporting AVX2 instructions. The `baseline` build of bunRPC is for older CPUs that don't support these optimizations. You usually don't need to worry about it on Darwin x64, but it is relevant for Windows x64 and Linux x64. If you or your users see `"Illegal instruction"` errors, you might need to use the baseline version.