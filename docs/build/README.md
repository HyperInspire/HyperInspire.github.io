# Get and build the SDK {#build-the-sdk}

Use a prebuilt SDK when its platform, backend and API version fit your application. Build from source when you need newer interfaces, a different toolchain or custom backend options. This section covers the native libraries first, then packaging them for an application or Python environment.

## Prebuilt SDKs {#prebuilt-sdks}

The download list below reflects [GitHub Releases](https://github.com/HyperInspire/InspireFace/releases) on **September 28, 2026**. The latest published native SDK is **v1.2.3**. Links point to that release so the selected package does not change underneath an integration.

::: warning Match the API version
The native and Python examples in this documentation use the **1.2.4 source API**, including newer snapshot, capture and diagnostic interfaces. For those examples, build the native library and use the headers or wrapper from the same source revision. A v1.2.3 archive does not provide every interface shown here.
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

The CUDA/Ubuntu label above is the release asset name. Check the linked library dependencies on the deployment machine. The release has no separate HarmonyOS, Windows or CoreML archive; [HarmonyOS](./harmonyos.md) and the Apple build pages cover their source build routes. There is no dedicated Windows build guide in this section.

Choose the library for the **application process**, including its architecture and C runtime. A 64-bit device can still run a 32-bit application. Keep each archive’s headers and libraries together, and check the platform guide before linking static frameworks or GPU/NPU libraries.

## Python and Android packages {#python-and-android-packages}

The current [PyPI package](https://pypi.org/project/inspireface/) is **1.2.3.post5**. Its wheels cover Linux x86_64/aarch64 with CPython 3.8–3.12 and several macOS CPython/platform combinations. Let `pip` select a compatible wheel; availability depends on the interpreter and platform tags. It is a separate release from the 1.2.4 source wrapper.

```bash
python -m pip install "inspireface==1.2.3.post5"
```

For the 1.2.4 examples or a custom backend, follow [Python packaging and native library replacement](./python.md). That chapter covers testing a local `.so`/`.dylib`, bundling it in a wheel and checking the installed result.

The Android example uses the JitPack dependency `com.github.HyperInspire:inspireface-android-sdk:1.2.0`. Its [integration page](../using-with/android.md#choose-a-package-or-source-build) includes the repository and Gradle configuration. Building a native Android SDK produces JNI libraries; assembling Java classes and libraries into an AAR is a separate packaging step explained in [Android builds](./android.md).

## Download the model separately {#download-the-model-separately}

SDK libraries and Python wheels need a resource pack at runtime. Download packs from the [model release](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x): `Pikachu` and `Megatron` for CPU, `Megatron_TRT` for TensorRT, or the `Gundam` file for the target Rockchip SoC. See [model selection and loading](../guides/models-and-builds.md#pick-a-resource-pack) for the full mapping.

## Choose a build guide {#choose-a-build-guide}

<div class="sdk-table">

| Guide | What it covers |
| --- | --- |
| [Source and common options](./source.md) | Checkouts, dependencies, CMake options and output layout. |
| [Linux](./linux.md) | Native CPU, ARM cross-compilation, Ubuntu and manylinux builds. |
| [macOS](./macos.md) | Intel, Apple Silicon and CoreML. |
| [Android](./android.md) | NDK, ABIs, JNI libraries and AAR packaging. |
| [iOS](./ios.md) | Device frameworks, CoreML and Xcode integration. |
| [HarmonyOS](./harmonyos.md) | Native SDK, Node-API adapter and HAR staging. |
| [NVIDIA TensorRT](./nvidia.md) | CUDA/TensorRT dependencies and Linux builds. |
| [Rockchip NPU](./rockchip.md) | Board toolchains, RKNN/RGA and Android NPU builds. |
| [Python packaging](./python.md) | Replace `.so`/`.dylib`, build wheels and verify installation. |

</div>
