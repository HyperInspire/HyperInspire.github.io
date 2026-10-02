# Get and build the SDK {#build-the-sdk}

Use a prebuilt SDK when its platform, backend and API version fit your application. Build from source when you need newer interfaces, a different toolchain or custom backend options. This section covers the native libraries first, then packaging them for an application, Python environment or JVM.

## Prebuilt SDKs {#prebuilt-sdks}

The current [GitHub release is v1.2.4](https://github.com/HyperInspire/InspireFace/releases/tag/v1.2.4). The files below contain the native SDK for Linux, Android, Apple and HarmonyOS. Python uses **1.2.4.post3**, including a Windows x64 wheel. The Android AAR remains **1.2.4.post1**. Both contain native SDK **1.2.4**; their installation links are [listed below](#python-and-android-packages).

::: tip Use the packaged SDK
The **1.2.4** downloads provide the snapshot, capture and diagnostic APIs used in these guides. Use the headers and libraries from the same archive. Build from source when changing the backend, toolchain or minimum OS version.
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

The CUDA/Ubuntu label above is the release asset name; check the library's actual dependencies on the deployment machine. The HarmonyOS archive includes an arm64 native SDK and a staged HAR project with its Node-API library; see [HarmonyOS integration](../using-with/harmonyos.md) to import it. Windows x64 CPU is available through PyPI and the [Windows source build](./windows.md). CoreML and standalone desktop Java have their own build guides below.

Choose the library for the **application process**, including its architecture and C runtime. A 64-bit device can still run a 32-bit application. Keep each archive’s headers and libraries together, and check the platform guide before linking static frameworks or GPU/NPU libraries.

## Apple SDK packaging {#apple-sdk-packaging}

Download [inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip) for the CPU SDK. One package covers macOS Intel / Apple Silicon, iOS arm64 devices and arm64 / x86_64 simulators. It includes the Objective-C and Swift frameworks used in the examples, along with C/C++ headers and libraries.

| Application | Libraries to add | Integration guide |
| --- | --- | --- |
| Objective-C | `InspireFace.xcframework` | [Apple API](../using-with/apple.md) |
| Swift | `InspireFace.xcframework` + `InspireFaceSwift.xcframework` | [Apple API](../using-with/apple.md) |
| Native C / C++ | Headers and libraries under the per-architecture `InspireFace/` directory | [C](../using-with/c-cpp.md), [C++](../using-with/cpp.md) |
| macOS Python | Matching `libInspireFace.dylib` and Python wrapper | [Python packaging](./python.md) |

`InspireFace.framework` contains the C and Objective-C interfaces. `InspireFaceSwift.framework` adds Swift configuration types and scoped buffer helpers. Keep both frameworks from the same build. The package also includes merged platform frameworks, native SDK directories and metadata for checking architectures and deployment targets.

Use the [iOS build guide](./ios.md) for device and simulator packages, and the [macOS build guide](./macos.md) for Intel, Apple Silicon and universal packages. iOS frameworks are static; macOS frameworks are dynamic. This distinction controls Xcode's embedding settings. The new iOS framework already incorporates its inference dependency, so it does not need an additional `MNN.framework` in the application target.

The packaged macOS libraries target **14.0 on arm64** and **15.0 on x86_64**. iOS targets **11.0 on devices**, **14.0 on arm64 simulators** and **11.0 on x86_64 simulators**. CoreML packages can be built locally and require a compatible CoreML resource pack; see [iOS](./ios.md) and [macOS](./macos.md) for custom builds.

## Python and Android packages {#python-and-android-packages}

The [Python package on PyPI](https://pypi.org/project/inspireface/1.2.4.post3/) is **1.2.4.post3** and includes the **1.2.4 CPU runtime**. Install it with:

```bash
python -m pip install inspireface opencv-python
```

To upgrade an existing installation, run `python -m pip install --upgrade inspireface`. The release provides these `py3-none` wheels; select the architecture of the Python process:

| Platform | Architecture | Published wheel tag |
| --- | --- | --- |
| Windows | x64 | `win_amd64` |
| Linux | x86_64 | `manylinux2014_x86_64` |
| Linux | ARM64 | `manylinux2014_aarch64` |
| macOS | Apple Silicon | `macosx_11_0_arm64` |
| macOS | Intel | `macosx_12_0_x86_64` |

Windows requires **64-bit Python** and the **Visual C++ x64 Redistributable**. The wheel includes `libInspireFace.dll` for CPU inference; no local compiler is needed. See [Windows integration](../using-with/windows.md) for local model loading and DLL troubleshooting.

The [PyPI file list](https://pypi.org/project/inspireface/1.2.4.post3/#files) contains the downloads and checksums. For a custom native library or wheel, see [Python packaging and library replacement](./python.md).

::: warning macOS requirements for 1.2.4.post3
The bundled native libraries target **macOS 14.0 or later on arm64** and **macOS 15.0 or later on x86_64**. These requirements are higher than the wheel filenames indicate. For an earlier macOS version, build a compatible library and use a matching wheel tag as described in [Python packaging](./python.md#package-the-current-macos-sdk).
:::

For Android, use the complete **1.2.4.post1 AAR**: `com.github.HyperInspire:inspireface-android-sdk:v1.2.4.post1`, including the leading `v`. It contains the Android wrappers, complete Java API, models and R8 rules. It supports `arm64-v8a`, `armeabi-v7a` and `x86_64`, with a minimum Android API of 24 and one `libInspireFace.so` per ABI. Native version queries report **1.2.4**, with C API level **2**.

The [Android integration page](../using-with/android.md#choose-a-package-or-source-build) includes the repository and Gradle configuration. For local builds, [Android builds](./android.md) explains how to produce the JAR and native libraries and add them to an app. Those files are already included when using the AAR.

## Java SDK {#java-sdk}

The Java binding exposes the C API through JNI and runs without Android. Build from the [Develop source](./source.md#develop-source) containing `command/build_java.sh`. The installed `build/java-sdk/install/Java/` directory includes a Java 8-compatible `inspireface.jar`, native libraries for the target, Java sources and an example.

The JAR is shared across targets; select native libraries for the running JVM’s OS and architecture and keep them paired with the JAR. Integration currently uses this local JAR. See [Java packaging](./java.md) for the build and [Java integration](../using-with/java.md) for a complete program.

## Download the model separately {#download-the-model-separately}

Native SDKs, JVM packages and Python wheels need a resource pack at runtime. The Android 1.2.4.post1 AAR includes `Pikachu` and `Megatron`; follow [Android initialization](../using-with/android.md#add-the-model-and-initialize) to use them, or supply an external pack when changing models. Download packs from the [model release](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x): `Pikachu` and `Megatron` for CPU, `Megatron_TRT` for TensorRT, or the `Gundam` file for the target Rockchip SoC. See [model selection and loading](../guides/models-and-builds.md#pick-a-resource-pack) for the full mapping.

## Choose a build guide {#choose-a-build-guide}

<div class="sdk-table">

| Guide | What it covers |
| --- | --- |
| [Source and common options](./source.md) | Checkouts, dependencies, CMake options and output layout. |
| [Linux](./linux.md) | Native CPU, ARM cross-compilation, Ubuntu and manylinux builds. |
| [Windows](./windows.md) | MSVC x64 CPU builds, shared/static libraries, CMake integration and DLL deployment. |
| [macOS](./macos.md) | Intel, Apple Silicon, universal frameworks, Swift modules and CoreML. |
| [Android](./android.md) | NDK, ABIs, JNI libraries and AAR packaging. |
| [iOS](./ios.md) | Device / simulator slices, XCFramework packaging and CoreML. |
| [HarmonyOS](./harmonyos.md) | Native SDK, Node-API adapter and HAR staging. |
| [NVIDIA TensorRT](./nvidia.md) | CUDA/TensorRT dependencies and Linux builds. |
| [Rockchip NPU](./rockchip.md) | Board toolchains, RKNN/RGA and Android NPU builds. |
| [Java packaging](./java.md) | JDK setup, JAR and JNI builds, native-library distribution and JVM tests. |
| [Python packaging](./python.md) | Replace `.so`/`.dylib`/`.dll`, build wheels and verify installation. |

</div>
