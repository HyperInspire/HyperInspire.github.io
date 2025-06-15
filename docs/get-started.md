# Get Started
InspireFace is a cross-platform face recognition SDK developed in C/C++, supporting multiple operating systems and various backend types for inference, such as CPU, GPU, and NPU.

If you require further information on tracking development branches, CI/CD processes, or downloading pre-compiled libraries, please visit our [development repository](https://github.com/HyperInspire/InspireFace).

Please contact [contact@insightface.ai](mailto:contact@insightface.ai?subject=InspireFace) for commercial support, including obtaining and integrating higher accuracy models, as well as custom development.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/blogs_box/inspireface-banner.jpg" alt="banner" style="zoom:80%;" />

## Supported

We have completed the adaptation and testing of the software across various operating systems and CPU architectures. This includes compatibility verification for platforms such as Linux, macOS, iOS, and Android, as well as testing for specific hardware support to ensure stable operation in diverse environments.

| Platform | Architecture<br>(CPU) | Device<br>(Special) | **Supported** | Passed Tests | Release<br>(Online) |
| :------------------: | :-------------------: | :------------------------: | ------------- | ------------------ | ------------------ |
| **Linux**<br>(CPU)      | ARMv7                 | -                          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
|                      | ARMv8                 | -                          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
|                      | x86/x86_64            | -                          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **Linux**<br>(Rockchip) | ARMv7                 | RV1109/RV1126              | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| | ARMv7 | RV1103/RV1106 | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| | ARMv8 | RK3566/RK3568 | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| | ARMv8 | RK3588 | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **Linux**<br>(MNN_CUDA) | x86/x86_64            | NVIDIA-GPU          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - |
| **Linux**<br>(CUDA) | x86/x86_64            | NVIDIA-GPU          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **MacOS**           | Intel       | CPU/Metal/**ANE** | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
|                      | Apple Silicon         | -                          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **iOS**              | ARM                   | CPU/Metal/**ANE**         | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **Android**          | ARMv7                 | -                          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
|                      | ARMv8                 | -                          | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **Android**<br>(Rockchip) | ARMv8 | RK3566/RK3568 | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
|  | ARMv8 | RK3588 | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![build](https://img.shields.io/github/actions/workflow/status/HyperInspire/InspireFace/release-sdks.yaml?label=✓&labelColor=success&color=success&failedLabel=✗&failedColor=critical&logo=github&logoColor=white)](https://github.com/HyperInspire/InspireFace/actions/workflows/release-sdks.yaml) |
| **HarmonyOS** | ARMv8 | - | - | - | - |
| **Linux**<br>(Jetson series) | ARMv8 | Jetson series | - | - | - |

- **Device**: Some special device support, primarily focused on computing power devices.
- **Supported**: The solution has been fully developed and successfully verified on offline devices.
- **Passed Tests**: The feature has at least **passed unit tests** on offline devices.
- **Release**: The solution is already supported and has been successfully compiled and released through **[GitHub Actions](https://github.com/HyperInspire/InspireFace/actions/workflows/built_release_from_docker.yaml)**.

::: tip
See the [develop repository](https://github.com/HyperInspire/InspireFace) for the latest **platform/device** adaptations.

If the **platform/device** you need is not in the table above, you can ask in the [issues](https://github.com/HyperInspire/InspireFace/issues/187).
:::

## How to Get SDK

If you are using C/C++ with InspireFace, you can download the corresponding library files from the [Release Pages](https://github.com/HyperInspire/InspireFace/releases). If you are using Android or Python, you can try simpler installation methods.



::: code-tabs#shell

@tab cmake

```cmake
# Prepare your inspireface-sdk directory in advance
set(INSPIREFACE_DIR your_dir/InspireFace)
include_directories(${INSPIREFACE_DIR}/include)
link_directories(${INSPIREFACE_DIR}/lib)

# Link to your project
target_link_libraries(YourProject InspireFace)
```

@tab android

```groovy
// build.gradle
allprojects {
    repositories {
       ...
       maven { url 'https://jitpack.io' }
    }
}

dependencies {
    implementation 'com.github.HyperInspire:inspireface-android-sdk:1.2.2'
}
```

@tab python

```bash
pip install -U inspireface
```

:::

## How to Get Model

For different scenarios, we currently provide several Packs, each containing multiple models and configurations.

| Name | Supported Devices | Note | Last Update | Link |
| --- | --- | --- | --- | --- |
| Pikachu | CPU | Lightweight edge-side models | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Pikachu) |
| Megatron | CPU, GPU | Mobile and server models | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Megatron) |
| Megatron_TRT | GPU | CUDA-based server models | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Megatron_TRT) |
| Gundam-RV1109 | RKNPU | Supports RK1109 and RK1126 | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Gundam_RV1109) |
| Gundam-RV1106 | RKNPU | Supports RV1103 and RV1106 | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Gundam_RV1106) |
| Gundam-RK356X | RKNPU | Supports RK3566 and RK3568 | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Gundam_RK356X) |
| Gundam-RK3588 | RKNPU | Supports RK3588 | Jun 15, 2025 | [Download](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Gundam_RK3588) |

## Compile

If you want to compile InspireFace, you can check the more detailed section.