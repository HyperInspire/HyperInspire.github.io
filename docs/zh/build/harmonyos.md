# 构建 HarmonyOS SDK {#build-for-harmonyos}

HarmonyOS 有两种构建产物：C/C++ native SDK 和 ArkTS HAR 模块。ArkTS 应用选择 HAR 模块，自行编写 native 接入层时选择 native SDK。已提供的预编译包见 [SDK 下载概述](./README.md)。

下面的配置使用 InspireFace `1.2.4`，目标 ABI 为 `arm64-v8a`，通过 MNN 在 CPU 上推理，以原始像素缓冲作为图像输入。本地构建并打包应用后，应在计划支持的设备上验证。

## 准备 Native SDK {#prepare-the-native-sdk}

先完成[源码准备](./source.md)，再安装 OpenHarmony Native SDK、CMake 3.20–3.x、Make 和 Node.js。HAR 脚本没有传入依赖在 CMake 4 下所需的额外 policy 设置。后续通过 DevEco Studio 接入和打包 HAR 模块。

将 `OHOS_NATIVE_HOME` 指向包含 toolchain 文件的 Native SDK 目录：

```bash
export OHOS_NATIVE_HOME=/absolute/path/to/native-sdk/native
test -f "$OHOS_NATIVE_HOME/build/cmake/ohos.toolchain.cmake"
cmake --version
node --version
```

未设置这个变量时，脚本会查找仓库内的 `build/harmony-tools/openharmony-6.1/native-sdk/native`。脚本不会自动下载 Native SDK。

源码中的 `cmake/ohos/node_modules/@ali/tcpkg/tcpkg.cmake` 提供 MNN OHOS 配置所需的打包 hook。构建脚本会将 `NODE_PATH` 指向这个目录。准备源码时保留这部分文件即可，不需要为此另装一套 `tcpkg`。

## 构建 ArkTS 模块 {#build-the-arkts-module}

从 InspireFace 仓库根目录运行：

```bash
bash command/build_harmonyos_napi.sh
```

脚本构建 `InspireFaceNapi` 目标，安装产物，并对安装后的库执行 strip。native 核心和第三方依赖静态链接进 `libinspireface_napi.so`，HAR 不需要再附带一份 `libInspireFace.so`。

```text
build/inspireface-harmonyos-napi-arm64-v8a/install/HarmonyOS/
  libs/arm64-v8a/libinspireface_napi.so
  har/
    Index.ets
    oh-package.json5
    build-profile.json5
    hvigorfile.ts
    src/main/
      module.json5
      ets/InspireFace.ets
      cpp/types/libinspireface_napi/
        index.d.ts
        oh-package.json5
      libs/arm64-v8a/libinspireface_napi.so
```

`har/` 是已放入 native 库和 ArkTS 源码的 **HAR 工程目录**。通过应用现有的 DevEco Studio/Hvigor 流程，将它打包成 HAR。

| Setting | HAR build |
| --- | --- |
| Build type | `Release` |
| ABI | `arm64-v8a` |
| C++ runtime | `c++_static` |
| Native core | 静态链接，启用位置无关代码 |
| Public native entry | `libinspireface_napi.so` 中的 Node-API 注册入口 |
| Inference backend | MNN CPU |
| Optional backends | 关闭 RKNN、RGA、TensorRT、CUDA 和 Apple 扩展 |

## 将 HAR 加入应用 {#add-the-har-to-an-app}

将安装后的 `har/` 目录复制到 DevEco Studio 应用中，作为 `inspireface` 模块注册，并在 entry 模块中添加本地依赖。`entry/` 和 `inspireface/` 位于同一级目录时，可以使用：

```json
{
  "dependencies": {
    "@hyperinspire/inspireface": "file:../inspireface"
  }
}
```

同步工程依赖，再按项目选定的 DevEco SDK 和 Hvigor 配置构建应用或 HAR。分发模块时，将 `Index.ets`、ArkTS 包装层、native 类型声明和编译后的 `.so` 一起更新。

源码目录 `harmony/inspireface/` 是这个包的模板。接入时应使用**安装后的** `har/` 目录，因为这里还包含构建生成的 native 库。

两个 `oh-package.json5` 的版本都必须与 native SDK 一致。CMake 会将顶层模块 manifest 和 `libinspireface_napi` 类型包 manifest 与源码版本比较（此份源码为 `1.2.4`）。切换 SDK 版本时，一起更新这些文件。

把模型包放在应用可读的文件位置。如果随 raw resource 打包，先将它复制到应用的 files 目录，再调用启动接口。[HarmonyOS 使用指南](../using-with/harmonyos.md)提供了 ArkTS 检测示例和 worker 生命周期说明。

## 只构建 native SDK {#build-the-native-sdk-only}

面向 native 应用或自定义桥接层时运行：

```bash
bash command/build_harmonyos.sh
```

标准配置生成 `libInspireFace.so`，并安装 C 头文件：

```text
build/inspireface-harmonyos-arm64-v8a/install/
  InspireFace/
    include/
    lib/libInspireFace.so
  version.txt
```

在 native 目标中使用这份库及其配套头文件。这个输出不包含 ArkTS 模块；ArkTS 应用使用前面的 Node-API 构建，将 native 导出、声明和包装层一起打包。

## 构建目录和检查 {#build-locations-and-checks}

| Environment variable | Purpose |
| --- | --- |
| `OHOS_NATIVE_HOME` | Native SDK 目录。 |
| `OHOS_BUILD_DIR` | C/C++ SDK 的输出目录。 |
| `OHOS_NAPI_BUILD_DIR` | Node-API/HAR 的输出目录。 |
| `OHOS_BUILD_JOBS` | 并行构建任务数，默认为 `4`。 |

HarmonyOS 脚本不会用 `VERSION` 修改输出目录名。需要带版本的目录时，设置对应的构建目录变量：

```bash
OHOS_NAPI_BUILD_DIR="$PWD/build/harmonyos-napi-1.2.4" \
OHOS_BUILD_JOBS=4 \
  bash command/build_harmonyos_napi.sh
```

Node-API 目标链接后会进行检查：库必须是 AArch64、注册 Node-API 模块、依赖 `libace_napi.z.so`、隐藏核心 C API，并且不链接 Android 专用库。另一项接口检查覆盖 C API、native 桥接层、类型声明和 ArkTS 包装层。

| Symptom | Check |
| --- | --- |
| 找不到 Native SDK | `OHOS_NATIVE_HOME` 中应包含 `build/cmake/ohos.toolchain.cmake`。 |
| 缺少 `tcpkg` 兼容模块 | 检查源码中的 `cmake/ohos/` 目录是否完整。 |
| 包版本检查失败 | 两个 manifest 与 native 源码应使用相同 SDK 版本。 |
| ArkTS 类型正常，但 native 库加载失败 | 检查安装后的模块是否包含 `src/main/libs/arm64-v8a/libinspireface_napi.so`。 |
| 接口或 ABI 检查失败 | 先处理报告中缺失的方法、声明或库，再打包模块。 |

打包后，在目标设备上检查模型启动、单张 RGBA 图像检测、结果释放和关闭流程，再测试应用中的相机格式转换和 worker 调度。完整接入流程见 [HarmonyOS 使用指南](../using-with/harmonyos.md)。

源码：[native 构建脚本](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_harmonyos.sh)、[Node-API 构建脚本](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_harmonyos_napi.sh)、[HAR 安装和版本检查](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/inspireface/platform/ohos/napi/CMakeLists.txt)。
