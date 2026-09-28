# 获取和编译 {#build-the-sdk}

平台、后端和接口版本符合要求时，可以直接使用预编译 SDK。需要新接口、更换工具链或调整推理后端时，再从源码构建。本章先介绍原生库的编译，再说明如何用于应用或打包进 Python 环境。

## 预编译 SDK {#prebuilt-sdks}

下面按 **2026 年 9 月 28 日**的 [GitHub Releases](https://github.com/HyperInspire/InspireFace/releases) 整理。目前公开的原生 SDK 最新版本为 **v1.2.3**，下载链接固定到该版本，便于接入时选用一致的产物。

::: warning 注意接口版本
本文档的原生接口和 Python 示例使用 **1.2.4 源码接口**，其中包含较新的 snapshot、抓拍和诊断接口。运行这些示例时，请从配套源码构建原生库，并使用同版本的头文件或语言封装。v1.2.3 预编译包并不包含这里展示的全部接口。
:::

<div class="sdk-table">

| Platform | Backend | Download |
| --- | --- | --- |
| Linux x86_64 | CPU / MNN | [Ubuntu 18.04](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-x86-ubuntu18-1.2.3.zip) · [manylinux2014](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-x86-manylinux2014-1.2.3.zip) |
| Linux ARM64 | CPU / MNN | [aarch64](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-aarch64-1.2.3.zip) |
| Linux ARMv7 | CPU / MNN | [armhf](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-armv7-armhf-1.2.3.zip) |
| macOS Intel | CPU / MNN | [x86_64](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-macos-intel-x86-64-1.2.3.zip) |
| macOS Apple Silicon | CPU / MNN | [arm64](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-macos-apple-silicon-arm64-1.2.3.zip) |
| Android | CPU / MNN | [Android SDK](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-android-1.2.3.zip) |
| iOS | CPU / MNN | [iOS SDK](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-ios-1.2.3.zip) |
| Linux x86_64 | TensorRT | [CUDA 12.2 / Ubuntu 22.04](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-tensorrt-cuda12.2_ubuntu22.04-1.2.3.zip) |
| Linux ARM64 | RK356x / RK3588 | [aarch64 / RKNPU2](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-aarch64-rk356x-rk3588-1.2.3.zip) |
| Linux ARMv7 | RV1109 / RV1126 | [armhf / RKNPU1](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-armv7-rv1109rv1126-armhf-1.2.3.zip) |
| Linux ARMv7 | RV1106 | [armhf / uClibc / RKNPU2](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-linux-armv7-rv1106-armhf-uclibc-1.2.3.zip) |
| Android | RK356x / RK3588 | [Android / RKNPU2](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.3/inspireface-android-rk356x-rk3588-1.2.3.zip) |

</div>

表中的 CUDA / Ubuntu 版本来自发布文件名，部署时仍需检查库依赖。这个发布版本没有独立的 HarmonyOS、Windows 或 CoreML 压缩包；HarmonyOS 和 Apple 平台的源码构建方式见下方对应章节。本章暂不提供 Windows 构建步骤。

按**应用进程**选择架构和 C 运行库。64 位设备上的应用也可能是 32 位进程。使用同一压缩包中的头文件和库；静态 Framework、GPU / NPU 库的链接方式见对应平台章节。

## Python 与 Android 包 {#python-and-android-packages}

目前 [PyPI 包](https://pypi.org/project/inspireface/)为 **1.2.3.post5**。其 wheel 提供 Linux x86_64 / aarch64 的 CPython 3.8–3.12 版本，以及若干 macOS Python / 平台组合。由 `pip` 选择匹配的 wheel，具体取决于解释器版本和平台标签。它与 1.2.4 源码封装属于不同版本。

```bash
python -m pip install "inspireface==1.2.3.post5"
```

需要运行 1.2.4 示例或使用自定义后端时，参照 [Python 打包与原生库替换](./python.md)。其中包含本地 `.so` / `.dylib` 的切换、wheel 打包，以及安装后的检查步骤。

Android 示例使用 JitPack 依赖 `com.github.HyperInspire:inspireface-android-sdk:1.2.0`，仓库地址和 Gradle 配置见 [Android 接入](../using-with/android.md#choose-a-package-or-source-build)。Android 原生构建生成 JNI 库；将 Java 类与原生库组成 AAR 的步骤见 [Android 构建](./android.md)。

## 单独下载模型包 {#download-the-model-separately}

SDK 和 Python wheel 运行时还需要模型资源包。通过[模型发布页](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x)下载：CPU 使用 `Pikachu` 或 `Megatron`，TensorRT 使用 `Megatron_TRT`，Rockchip 使用与 SoC 对应的 `Gundam` 文件。完整对应关系和加载方法见[模型选择](../guides/models-and-builds.md#pick-a-resource-pack)。

## 选择构建章节 {#choose-a-build-guide}

<div class="sdk-table">

| Guide | 内容 |
| --- | --- |
| [源码准备与通用选项](./source.md) | 获取源码、准备依赖、CMake 选项和产物结构。 |
| [Linux](./linux.md) | CPU 本机构建、ARM 交叉编译、Ubuntu 与 manylinux。 |
| [macOS](./macos.md) | Intel、Apple Silicon 和 CoreML。 |
| [Android](./android.md) | NDK、ABI、JNI 库与 AAR 打包。 |
| [iOS](./ios.md) | 真机 Framework、CoreML 和 Xcode 接入。 |
| [HarmonyOS](./harmonyos.md) | Native SDK、Node-API 适配层和 HAR 工程。 |
| [NVIDIA TensorRT](./nvidia.md) | CUDA / TensorRT 依赖和 Linux 构建。 |
| [Rockchip NPU](./rockchip.md) | 板端工具链、RKNN / RGA 与 Android NPU 构建。 |
| [Python 打包](./python.md) | 替换 `.so` / `.dylib`、构建 wheel 和安装验证。 |

</div>
