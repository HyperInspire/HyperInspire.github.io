# 获取和编译 {#build-the-sdk}

平台、后端和接口版本符合要求时，可以直接使用预编译 SDK。需要新接口、更换工具链或调整推理后端时，再从源码构建。本章先介绍原生库的编译，再说明如何用于应用，以及制作 Python 和 Java 包。

## 预编译 SDK {#prebuilt-sdks}

当前 [GitHub Release 为 v1.2.4](https://github.com/HyperInspire/InspireFace/releases/tag/v1.2.4)，下方提供 Linux、Android、Apple 和 HarmonyOS 的原生 SDK。Python 和 Android AAR 的包版本为 **1.2.4.post1**，原生 SDK 同为 **1.2.4**，安装方式见[下方说明](#python-and-android-packages)。

::: tip 直接使用预编译包
**1.2.4** 下载包已提供文档中的快照、抓拍和诊断接口，使用同一个包内的头文件和库即可。需要更换后端、工具链或调整最低系统版本时，再从源码构建。
:::

<div class="sdk-table">

| Platform | Backend | Download |
| --- | --- | --- |
| Linux x86_64 | CPU | [Ubuntu 18.04](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-x86-ubuntu18-1.2.4.zip) · [manylinux2014](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-x86-manylinux2014-1.2.4.zip) |
| Linux ARM64 | CPU | [aarch64](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-aarch64-1.2.4.zip) |
| Linux ARMv7 | CPU | [armhf](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-armv7-armhf-1.2.4.zip) |
| macOS / iOS | CPU | [Apple XCFrameworks + C/C++](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip) |
| Android | CPU | [Native SDK + Java/JNI](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-1.2.4.zip) |
| HarmonyOS ARM64 | CPU | [Native SDK + HAR project](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-harmonyos-arm64-v8a-1.2.4.zip) |
| Linux x86_64 | TensorRT | [CUDA 12.2 / Ubuntu 22.04](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-tensorrt-cuda12.2_ubuntu22.04-1.2.4.zip) |
| Linux ARM64 | RK356x / RK3588 | [aarch64 / RKNPU2](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-aarch64-rk356x-rk3588-1.2.4.zip) |
| Linux ARMv7 | RV1109 / RV1126 | [armhf / RKNPU1](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-armv7-rv1109rv1126-armhf-1.2.4.zip) |
| Linux ARMv7 | RV1103 / RV1106 | [armhf / uClibc / RKNPU2](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-armv7-rv1106-armhf-uclibc-1.2.4.zip) |
| Android | RK356x / RK3588 | [Android / RKNPU2](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-rk356x-rk3588-1.2.4.zip) |

</div>

表中的 CUDA / Ubuntu 版本来自发布文件名，部署时仍需检查库的实际依赖。HarmonyOS 包内包含 arm64 原生 SDK、HAR 工程和配套的 Node-API 库，导入方式见 [HarmonyOS 接入](../using-with/harmonyos.md)。此版本没有 Windows、CoreML 或独立桌面 Java 的预编译包，CoreML 和 Java 的构建方式见下方对应章节。

按**应用进程**选择架构和 C 运行库。64 位设备上的应用也可能是 32 位进程。使用同一压缩包中的头文件和库；静态 Framework、GPU / NPU 库的链接方式见对应平台章节。

## Apple SDK 产物 {#apple-sdk-packaging}

CPU 版本直接下载 [inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip)。一个包同时覆盖 macOS Intel / Apple Silicon、iOS arm64 真机以及 arm64 / x86_64 模拟器，包含示例使用的 Objective-C、Swift Framework 和 C/C++ 头文件、库。

| Application | 需要添加的库 | 接入指南 |
| --- | --- | --- |
| Objective-C | `InspireFace.xcframework` | [Apple API](../using-with/apple.md) |
| Swift | `InspireFace.xcframework` + `InspireFaceSwift.xcframework` | [Apple API](../using-with/apple.md) |
| Native C / C++ | 对应架构 `InspireFace/` 目录下的头文件与库 | [C](../using-with/c-cpp.md)、[C++](../using-with/cpp.md) |
| macOS Python | 配套的 `libInspireFace.dylib` 和 Python 封装 | [Python 打包](./python.md) |

`InspireFace.framework` 包含 C 与 Objective-C 接口，`InspireFaceSwift.framework` 提供 Swift 配置类型和限定作用域的缓冲区辅助方法。两个 Framework 应来自同一次构建。打包结果还包含各平台合并后的 Framework、原生 SDK 目录，以及用于核对架构和最低系统版本的元数据。

真机与模拟器的构建见 [iOS](./ios.md)，Intel、Apple Silicon 与通用架构的构建见 [macOS](./macos.md)。iOS Framework 是静态库，macOS Framework 是动态库，在 Xcode 中采用不同的嵌入设置。新版 iOS Framework 已合入推理依赖，应用 target 无需再添加 `MNN.framework`。

包内 macOS 库的最低版本为 **arm64 14.0**、**x86_64 15.0**；iOS 真机最低为 **11.0**，模拟器分别为 **arm64 14.0**、**x86_64 11.0**。CoreML 版本需要本地构建，并搭配兼容的 CoreML 模型资源包；自定义构建见 [iOS](./ios.md) 和 [macOS](./macos.md)。

## Python 与 Android 包 {#python-and-android-packages}

[PyPI 上的 Python 包](https://pypi.org/project/inspireface/1.2.4.post1/)已更新为 **1.2.4.post1**，包含 **1.2.4 CPU 原生库**，直接安装即可：

```bash
python -m pip install inspireface opencv-python
```

已有安装使用 `python -m pip install --upgrade inspireface` 升级。此版本提供以下 `py3-none` wheel，按 Python 进程的架构选择：

| Platform | Architecture | Published wheel tag |
| --- | --- | --- |
| Linux | x86_64 | `manylinux2014_x86_64` |
| Linux | ARM64 | `manylinux2014_aarch64` |
| macOS | Apple Silicon | `macosx_11_0_arm64` |
| macOS | Intel | `macosx_12_0_x86_64` |

下载文件及校验值见 [PyPI 文件列表](https://pypi.org/project/inspireface/1.2.4.post1/#files)。需要替换原生库或制作 wheel 时，参照 [Python 打包与原生库替换](./python.md)。

::: warning 1.2.4.post1 的 macOS 系统要求
包内原生库要求 **arm64 使用 macOS 14.0 或更新版本**，**x86_64 使用 macOS 15.0 或更新版本**，高于 wheel 文件名标出的版本。需要支持更早的 macOS 时，请按 [Python 打包](./python.md#package-the-current-macos-sdk)构建兼容的动态库，并使用匹配的 wheel 标签。
:::

Android 使用完整的 **1.2.4.post1 AAR**，依赖为 `com.github.HyperInspire:inspireface-android-sdk:v1.2.4.post1`，保留版本前的 `v`。包内含 Android 封装、完整 Java API、模型与 R8 规则，支持 `arm64-v8a`、`armeabi-v7a` 和 `x86_64`，最低 Android API 24；每个 ABI 只有一份 `libInspireFace.so`。原生版本查询返回 **1.2.4**，C API level 为 **2**。

仓库地址与 Gradle 配置见 [Android 接入](../using-with/android.md#choose-a-package-or-source-build)。需要本地构建时，[Android 构建](./android.md)说明如何生成 JAR、原生库并放入应用；使用 AAR 时无需额外添加这些文件。

## Java SDK {#java-sdk}

Java 版通过 JNI 提供 C API 对应的功能，不依赖 Android。使用包含 `command/build_java.sh` 的 [Develop 源码](./source.md#develop-source)构建，安装目录 `build/java-sdk/install/Java/` 中包含兼容 Java 8 的 `inspireface.jar`、当前目标的原生库、Java 源文件和示例。

JAR 可跨目标使用，原生库按运行 JVM 的系统和架构选择，并与 JAR 保持配套。当前接入使用本地 JAR；构建步骤见 [Java 打包](./java.md)，完整调用示例见 [Java 接入](../using-with/java.md)。

## 单独下载模型包 {#download-the-model-separately}

原生 SDK、JVM 包和 Python wheel 运行时还需要模型资源包。Android 1.2.4.post1 AAR 已附带 `Pikachu` 与 `Megatron`，可直接按 [Android 初始化步骤](../using-with/android.md#add-the-model-and-initialize)使用；替换模型时再准备外部资源包。通过[模型发布页](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x)下载：CPU 使用 `Pikachu` 或 `Megatron`，TensorRT 使用 `Megatron_TRT`，Rockchip 使用与 SoC 对应的 `Gundam` 文件。完整对应关系和加载方法见[模型选择](../guides/models-and-builds.md#pick-a-resource-pack)。

## 选择构建章节 {#choose-a-build-guide}

<div class="sdk-table">

| Guide | 内容 |
| --- | --- |
| [源码准备与通用选项](./source.md) | 获取源码、准备依赖、CMake 选项和产物结构。 |
| [Linux](./linux.md) | CPU 本机构建、ARM 交叉编译、Ubuntu 与 manylinux。 |
| [macOS](./macos.md) | Intel、Apple Silicon、通用 Framework、Swift 模块与 CoreML。 |
| [Android](./android.md) | NDK、ABI、JNI 库与 AAR 打包。 |
| [iOS](./ios.md) | 真机与模拟器切片、XCFramework 打包和 CoreML。 |
| [HarmonyOS](./harmonyos.md) | Native SDK、Node-API 适配层和 HAR 工程。 |
| [NVIDIA TensorRT](./nvidia.md) | CUDA / TensorRT 依赖和 Linux 构建。 |
| [Rockchip NPU](./rockchip.md) | 板端工具链、RKNN / RGA 与 Android NPU 构建。 |
| [Java 打包](./java.md) | JDK、JAR 与 JNI 构建、原生库分发和 JVM 测试。 |
| [Python 打包](./python.md) | 替换 `.so` / `.dylib`、构建 wheel 和安装验证。 |

</div>
