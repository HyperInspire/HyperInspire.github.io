# 构建 iOS SDK {#build-for-ios}

iOS 构建会生成静态 `InspireFace.framework`，并附带所需的 MNN framework。常规模型包使用标准构建，Apple 模型包使用启用 Apple 扩展的构建。预编译包见 [SDK 下载概述](./README.md)。

::: warning iOS 接口
目前在 iOS 上接入需要混合调用 C/C++ 接口。后续会推出 Objective-C 和 Swift 接口。
:::

## 准备 Xcode 和依赖 {#prepare-xcode-and-dependencies}

在 macOS 上完成[源码准备](./source.md)，并安装带有 iOS SDK 的 Xcode。运行这两份脚本时使用 CMake 3.20–3.x；CMake 4 下的依赖配置还需要额外的 policy 设置。确认当前开发工具目录指向 Xcode：

```bash
xcode-select -p
xcrun --sdk iphoneos --show-sdk-path
xcrun --find make
cmake --version
```

安装了多个 Xcode 版本时，可以在当前构建终端设置 `DEVELOPER_DIR`：

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

构建命令从 InspireFace 仓库根目录运行。两个脚本首次运行都会下载 MNN `2.8.1` 的 iOS 包，将 `MNN.framework` 保存在 `.macos_cache/`，后续构建复用这个 framework。离线构建时，可以提前按同样的目录结构准备好缓存。

| Setting | Both scripts |
| --- | --- |
| Target | iOS 真机，`arm64` |
| Deployment target | iOS `11.0` |
| Library | 静态 `InspireFace.framework` |
| Bitcode | 关闭 |
| Samples and tests | 关闭 |
| MNN package | `mnn_2.8.1_ios_armv82_cpu_metal_coreml.zip` |

## 构建标准 framework {#build-the-standard-framework}

```bash
VERSION=1.2.4 bash command/build_ios.sh
```

`VERSION` 修改输出目录的后缀，SDK 运行时版本取决于源码。未设置 `VERSION` 时，脚本写入 `build/inspireface-ios`。

```text
build/inspireface-ios-1.2.4/
  InspireFace.framework/
    InspireFace
    Headers/
    Resources/Info.plist
  MNN.framework/
  InspireFace/
    include/
    lib/libInspireFace.a
  version.txt
```

脚本安装 SDK、生成 framework 后，会清理中间构建文件。framework 已包含静态库，应用链接它或原始 `.a` 文件中的一种即可，避免在同一个目标中重复添加。

## 启用 Apple 扩展 {#build-with-the-apple-extension}

```bash
VERSION=1.2.4 bash command/build_ios_coreml.sh
```

这个脚本启用 `ISF_ENABLE_APPLE_EXTENSION`，将相同结构的产物写入 `build/inspireface-ios-coreml-arm64-1.2.4/`。未设置 `VERSION` 时，目录为 `build/inspireface-ios-coreml-arm64/`。

此构建搭配 Apple 资源包使用，具体模型是否通过 Apple 加速取决于资源包和所选推理后端。比较启动时间和逐帧耗时时，在应用中分别保留标准版与 Apple 版的构建配置，并在目标设备上测试。

两个脚本都复用 `.macos_cache/MNN.framework`。更换缓存中的依赖后，记录对应版本，重新构建 SDK，再更新应用中的库。

## 加入 Xcode 应用 {#add-the-result-to-an-app}

1. 将 `InspireFace.framework` 和 `MNN.framework` 复制到应用的 framework 目录，并将该目录加入 **Framework Search Paths**。
2. 在 **Link Binary With Libraries** 中加入 framework。`InspireFace.framework` 内是静态库，应选择 **Do Not Embed**。
3. 链接此构建所需的系统依赖：Metal、CoreML、Foundation、CoreVideo、CoreMedia，以及 C++ runtime。Apple 扩展还使用 Accelerate。
4. 将模型包加入 **Copy Bundle Resources**，启动 SDK 时使用它的文件系统路径。
5. 选择 arm64 真机，先完成初始化和单张图像检测，再接相机。

[iOS 使用指南](../using-with/ios.md)提供了 Xcode 设置、模型加载和像素缓冲转换示例。桥接层包含 C++ 代码时使用 Objective-C++ `.mm` 文件；Swift 可以调用桥接层，也可以通过 bridging header 调用 C API。

配套的 MNN framework 应与目标平台和所用包的链接方式一致。修改 Xcode 的嵌入设置前，和 InspireFace 一起检查这两个产物。

## 检查架构和版本 {#inspect-architecture-and-version}

```bash
file build/inspireface-ios-1.2.4/InspireFace.framework/InspireFace
lipo -info build/inspireface-ios-1.2.4/InspireFace.framework/InspireFace
file build/inspireface-ios-1.2.4/MNN.framework/MNN
cat build/inspireface-ios-1.2.4/version.txt
```

打包脚本目前在 framework 的 `Info.plist` 中写入固定的 `1.0.0`。识别实际构建版本时，使用 `version.txt` 和 SDK 版本查询接口；设置 `VERSION` 只会改变输出目录名。

这些脚本和下载的 MNN framework 面向真机。模拟器构建需要 InspireFace **及其依赖**都提供 iOS Simulator slice。arm64 真机 slice 不能用于 arm64 模拟器。如果同时维护真机和模拟器配置，应分别构建并验证，再将产物打包成 XCFramework。

## 构建问题 {#build-issues}

| Symptom | Check |
| --- | --- |
| 找不到 `iphoneos` SDK | 检查选中的 Xcode、已安装的 iOS SDK 和 `DEVELOPER_DIR`。 |
| MNN 下载或解压失败 | 检查能否访问脚本中的包地址，以及 `.macos_cache/` 的内容。 |
| 找不到 framework 头文件 | 检查 Framework Search Paths 和目标链接的 framework。 |
| MNN 或系统符号未定义 | 检查两个 framework 及所需系统框架是否都已链接。 |
| 提示正在构建 iOS Simulator，但输入是 iOS object | 当前 framework 是真机产物；选择真机，或提供为模拟器构建的依赖。 |
| 应用编译成功，但模型启动失败 | 检查模型包类型、资源的 target membership 和解析出的文件路径。 |

为每次构建记录源码 revision、Xcode 版本、依赖版本和模型包名称。[性能测试指南](../guides/benchmark-remark(updating).md)说明了如何分别测量启动、预热和持续帧处理。

源码：[标准 iOS 构建](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_ios.sh)、[Apple 扩展构建](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_ios_coreml.sh)。
