# Rockchip NPU 构建 {#rockchip-npu-builds}

按板端 CPU 架构、C 运行库和 NPU 代际选择构建方式。先准备 [SDK 源码](./source.md)，以及与板端 Linux 根文件系统配套的交叉工具链。在 Linux 主机上完成编译，再将库放到板端运行。

## 选择板型与工具链 {#match-the-board-and-toolchain}

| Target | Compiler prefix | Model pack |
| --- | --- | --- |
| RV1109 / RV1126 | `arm-linux-gnueabihf` | `Gundam_RV1109` |
| RV1103 / RV1106 | `arm-rockchip830-linux-uclibcgnueabihf` | `Gundam_RV1106` |
| RK3566 / RK3568 | `aarch64-linux-gnu` | `Gundam_RK356X` |
| RK3588 | `aarch64-linux-gnu` | `Gundam_RK3588` |

`ARM_CROSS_COMPILE_TOOLCHAIN` 指向包含 `bin/` 的工具链根目录。编译器的 sysroot、glibc / uClibc 和 C++ 运行库应与板端系统匹配。通用 ARM64 CPU 构建不会自动启用 RKNN 推理。

## RV1109 与 RV1126 {#rv1109-and-rv1126}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/rv1109-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/arm-linux-gnueabihf-gcc" --version
VERSION=1.2.4 bash command/build_cross_rv1109rv1126_armhf.sh
```

脚本启用 RKNN，并设置 `ISF_RK_DEVICE_TYPE=RV1109RV1126`。SDK 目录为 `build/inspireface-linux-armv7-rv1109rv1126-armhf-1.2.4/InspireFace`。

## RV1106 与 uClibc {#rv1106-with-uclibc}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/rv1106-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/arm-rockchip830-linux-uclibcgnueabihf-gcc" --version
VERSION=1.2.4 bash command/build_cross_rv1106_armhf_uclibc.sh
```

该构建使用 RKNPU2，设置 `ISF_RK_DEVICE_TYPE=RV1106`、`ISF_RK_COMPILER_TYPE=armhf-uclibc` 并启用 RGA。首次构建还会将 MNN 2.3.0 源码下载到 `.rknpu2_cache`。SDK 位于 `build/inspireface-linux-armv7-rv1106-armhf-uclibc-1.2.4/InspireFace`。

应用也使用板端对应的 uClibc 工具链。glibc 可执行文件或 Python wheel 无法通过修改文件名变成 uClibc 兼容产物。

## RK356x 与 RK3588 {#rk356x-and-rk3588}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/rk-aarch64-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-gcc" --version
VERSION=1.2.4 bash command/build_cross_rk356x_rk3588_aarch64.sh
```

RK356x 与 RK3588 共用这条 ARM64 RKNPU2 构建路径。脚本设置 `ISF_RK_DEVICE_TYPE=RK356X`、`ISF_RK_COMPILER_TYPE=aarch64` 并启用 RGA，模型包仍按实际 SoC 选择。SDK 位于 `build/inspireface-linux-aarch64-rk356x-rk3588-1.2.4/InspireFace`。

## 检查 Linux 产物 {#inspect-the-linux-output}

以上 Linux 脚本均生成动态库，关闭示例、测试和 benchmark，安装后只保留 SDK 产物并删除编译中间文件。使用 SDK 目录内配套的 `include/` 和 `lib/libInspireFace.so`。

```bash
file build/inspireface-linux-aarch64-rk356x-rk3588-1.2.4/InspireFace/lib/libInspireFace.so
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-readelf" -d \
  build/inspireface-linux-aarch64-rk356x-rk3588-1.2.4/InspireFace/lib/libInspireFace.so
```

这里以 RK356x / RK3588 的产物和工具链为例。根据列出的动态依赖检查板端文件系统，包括 RKNN / RGA 库及其驱动配套关系。板端环境提供 `ldd` 时可直接检查；主机加载器不能通过加载异构库来验证板端依赖。

## RK356x 与 RK3588 的 Android 构建 {#android-on-rk356x-and-rk3588}

Rockchip Android 设备使用 NDK 构建脚本，不能使用上述 Linux 工具链产物。将 `ANDROID_NDK` 设为已安装的 NDK 目录：

```bash
export ANDROID_NDK=/path/to/android-ndk
VERSION=1.2.4 bash command/build_android_rk356x_rk3588.sh
```

脚本分别构建 `arm64-v8a` 和 `armeabi-v7a`，均使用 Android API 24 与 `c++_static`，启用 RKNN，关闭 RGA。整理后的产物包含：

```text
build/inspireface-android-rk356x-rk3588-1.2.4/
  lib/arm64-v8a/libInspireFace.so
  lib/armeabi-v7a/libInspireFace.so
  version.txt
```

按 [Android 打包说明](./android.md)配套 Java 类与 JNI 库，为每个 ABI 配齐所需的厂商运行库，并在装有匹配驱动的 Rockchip 设备上使用对应 NPU 模型验证。这个脚本整理后的目录不保留安装头文件；编译自定义 JNI 适配层时，使用同一源码提交的公共头文件。

## 接入应用或打包 Python {#run-an-application-or-package-python}

[Rockchip 部署指南](../using-with/rknpu.md)提供完整 C 示例、应用交叉编译、设备文件布局和 RGA 选择。Python 接入先按 [Rockchip 上的 Python](../guides/python-rockchip-device.md)验证封装与板端库，再按 [Python 打包](./python.md)将库放入 wheel。模型包和板端运行库需要单独准备。
