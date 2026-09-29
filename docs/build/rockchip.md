# Rockchip NPU builds {#rockchip-npu-builds}

Prebuilt **1.2.4** packages are available for Linux RK356x/RK3588, RV1109/RV1126 and RV1106, and for Android RK356x/RK3588. Start with [SDK downloads](./README.md) when the package matches the board's ABI and runtime. The instructions below build the SDK with your own toolchain and settings.

Build for the board’s CPU architecture, C library and NPU generation. Prepare the [SDK source](./source.md) and the cross toolchain supplied for the board’s Linux root filesystem. These builds run on a Linux host; run the resulting library on the board.

## Match the board and toolchain {#match-the-board-and-toolchain}

| Target | Compiler prefix | Model pack |
| --- | --- | --- |
| RV1109 / RV1126 | `arm-linux-gnueabihf` | `Gundam_RV1109` |
| RV1103 / RV1106 | `arm-rockchip830-linux-uclibcgnueabihf` | `Gundam_RV1106` |
| RK3566 / RK3568 | `aarch64-linux-gnu` | `Gundam_RK356X` |
| RK3588 | `aarch64-linux-gnu` | `Gundam_RK3588` |

`ARM_CROSS_COMPILE_TOOLCHAIN` points to the directory containing `bin/`. The compiler’s sysroot, glibc/uClibc and C++ runtime must match the board image. A generic ARM64 CPU build does not enable RKNN inference.

## RV1109 and RV1126 {#rv1109-and-rv1126}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/rv1109-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/arm-linux-gnueabihf-gcc" --version
VERSION=1.2.4 bash command/build_cross_rv1109rv1126_armhf.sh
```

The script selects `ISF_RK_DEVICE_TYPE=RV1109RV1126` with RKNN enabled. The SDK directory is `build/inspireface-linux-armv7-rv1109rv1126-armhf-1.2.4/InspireFace`.

## RV1106 with uClibc {#rv1106-with-uclibc}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/rv1106-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/arm-rockchip830-linux-uclibcgnueabihf-gcc" --version
VERSION=1.2.4 bash command/build_cross_rv1106_armhf_uclibc.sh
```

This route selects RKNPU2, `ISF_RK_DEVICE_TYPE=RV1106`, `ISF_RK_COMPILER_TYPE=armhf-uclibc` and RGA. The script also downloads its MNN 2.3.0 source into `.rknpu2_cache` on the first build. The SDK is under `build/inspireface-linux-armv7-rv1106-armhf-uclibc-1.2.4/InspireFace`.

Use the board’s uClibc toolchain for the application too. A glibc executable or Python wheel cannot be made compatible by renaming its file.

## RK356x and RK3588 {#rk356x-and-rk3588}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/rk-aarch64-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-gcc" --version
VERSION=1.2.4 bash command/build_cross_rk356x_rk3588_aarch64.sh
```

RK356x and RK3588 share this ARM64 RKNPU2 build. The script uses `ISF_RK_DEVICE_TYPE=RK356X`, `ISF_RK_COMPILER_TYPE=aarch64` and enables RGA. Select the model pack for the actual SoC. The SDK is under `build/inspireface-linux-aarch64-rk356x-rk3588-1.2.4/InspireFace`.

## Inspect the Linux output {#inspect-the-linux-output}

Each Linux script builds a shared library with samples, tests and benchmarks disabled, then keeps the installed SDK and removes intermediate compilation files. Inside the SDK directory, use `include/` with `lib/libInspireFace.so` from the same build.

```bash
file build/inspireface-linux-aarch64-rk356x-rk3588-1.2.4/InspireFace/lib/libInspireFace.so
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-readelf" -d \
  build/inspireface-linux-aarch64-rk356x-rk3588-1.2.4/InspireFace/lib/libInspireFace.so
```

This inspection example uses the RK356x/RK3588 build and toolchain. Check the listed shared-library dependencies against the board’s filesystem, including RKNN/RGA libraries and their driver pairing. Run `ldd` on the target board if its environment provides it; the host’s loader cannot validate a foreign-architecture library by loading it.

## Android on RK356x and RK3588 {#android-on-rk356x-and-rk3588}

For a Rockchip Android device, use the NDK script instead of the Linux toolchain. Set `ANDROID_NDK` to an installed NDK directory:

```bash
export ANDROID_NDK=/path/to/android-ndk
VERSION=1.2.4 bash command/build_android_rk356x_rk3588.sh
```

The script builds `arm64-v8a` and `armeabi-v7a`, both with Android API 24, `c++_static`, RKNN enabled and RGA disabled. The reorganized output contains:

```text
build/inspireface-android-rk356x-rk3588-1.2.4/
  lib/arm64-v8a/libInspireFace.so
  lib/armeabi-v7a/libInspireFace.so
  version.txt
```

Use the [Android packaging instructions](./android.md) to pair Java classes and JNI libraries. Include any required vendor runtime libraries for each ABI, and validate on the Rockchip device with its matching NPU model and driver. This script’s final layout does not retain the installed headers; use the same source revision’s public headers when building your own JNI adapter.

## Run an application or package Python {#run-an-application-or-package-python}

The [Rockchip deployment guide](../using-with/rknpu.md) includes an inline C example, application cross-compilation, device file layout and RGA selection. For Python, first follow [Python on Rockchip](../guides/python-rockchip-device.md) to test the wrapper with the board library, then use [Python packaging](./python.md) to distribute that library in a wheel. Models and board runtime libraries remain separate deployment inputs.
