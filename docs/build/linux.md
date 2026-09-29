# Linux SDK {#linux-sdk}

Build a shared CPU SDK for Linux x86_64, ARMv7 or ARM64, then link it from a native application or [package it with Python](./python.md). NVIDIA and Rockchip builds have separate [TensorRT](./nvidia.md) and [RKNPU](./rockchip.md) instructions.

Java applications also need the JAR and JNI adapter; follow [Java packaging](./java.md) to build them.

Complete [source preparation](./source.md) first. Run the commands below from the InspireFace SDK directory. For an existing binary package, use the [SDK downloads](./README.md).

For ARM CPU image processing, feature comparison and camera-loop tuning, see [ARM deployment](../using-with/arm.md).

## Choose the build environment {#choose-the-build-environment}

| Target | Build environment | Entry point |
| --- | --- | --- |
| Native CPU | Linux, CMake 3.20+, C++14 compiler, Make or Ninja, `readelf` | CMake commands below |
| x86_64 / Ubuntu 18.04 | Repository Docker image | `command/build_linux_ubuntu18.sh` |
| x86_64 / manylinux2014 | Repository manylinux2014 image | `command/build_linux_manylinux2014.sh` |
| ARMv7 hard-float | Linux x86_64 host and `arm-linux-gnueabihf` toolchain | `command/build_cross_armv7_armhf.sh` |
| ARM64 | Linux x86_64 host and `aarch64-linux-gnu` toolchain | `command/build_cross_aarch64.sh` |

Choose the C library and compiler runtime for the target device as well as its CPU architecture. These generic ARM scripts use GNU/Linux toolchains; use the Rockchip chapter for the RV1106 uClibc build.

## Build on the target machine {#build-on-the-target-machine}

On a Linux desktop, server or ARM development board, this builds for the active compiler's architecture. It keeps the build tree so you can change options and rebuild incrementally.

```bash
cmake -S . -B build/linux-cpu \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_NEVER_USE_OPENCV=ON
cmake --build build/linux-cpu --parallel 4
cmake --install build/linux-cpu
```

The default CPU build compiles MNN into the shared SDK. Its image handling does not require an OpenCV installation. Headers and the library are installed here:

```text
build/linux-cpu/install/
  InspireFace/
    include/inspireface.h
    include/intypedef.h
    include/herror.h
    include/inspireface/
    include/inspirecv/
    lib/libInspireFace.so
  version.txt
```

Set `INSPIREFACE_ROOT` to `build/linux-cpu/install/InspireFace` when following the [C API linking example](../using-with/c-cpp.md#link-the-sdk). A model pack remains a separate file; download it using [Models and builds](../guides/models-and-builds.md#pick-a-resource-pack).

## Build an x86_64 release directory {#build-an-x86-64-release-directory}

The packaging scripts build with four jobs, disable tests and samples, and collect the installed files into a named directory. With `VERSION=1.2.4`:

| Script | SDK directory |
| --- | --- |
| `build_linux_ubuntu18.sh` | `build/inspireface-linux-x86-ubuntu18-1.2.4/InspireFace` |
| `build_linux_manylinux2014.sh` | `build/inspireface-linux-x86-manylinux2014-1.2.4/InspireFace` |

::: warning Packaging directory
These scripts remove the intermediate files in their own output directory after installation. Keep your application files elsewhere. Use the CMake build above when you want to keep the compilation cache.
:::

On an x86_64 Linux host with Docker Compose, use the repository's Ubuntu 18.04 environment:

```bash
VERSION=1.2.4 docker compose run --build --rm build-ubuntu18
```

For the manylinux2014 environment, override the service command to build only the native SDK:

```bash
VERSION=1.2.4 docker compose run --build --rm \
  build-manylinux2014-x86 bash command/build_linux_manylinux2014.sh
```

Both commands mount the checkout at `/workspace` and write the result back to its `build/` directory. `VERSION` changes the directory suffix; the SDK's actual version comes from the source. Omit it for an unversioned directory.

### Ubuntu and manylinux {#ubuntu-and-manylinux}

The build environment determines the required glibc and C++ runtime versions. Running `build_linux_ubuntu18.sh` directly on a newer distribution uses that newer system's compiler and libraries; the script name does not set an Ubuntu compatibility level.

Use the manylinux container when preparing the corresponding Linux Python package. The Compose service normally runs `build_wheel_manylinux2014_x86.sh`, which also copies the `.so` into the Python project and builds a wheel. The override above stops at the native SDK. Wheel contents, platform tags and replacing the `.so` are covered in [Python packaging](./python.md).

## Cross-compile for ARM {#cross-compile-for-arm}

Install an x86_64-hosted GNU toolchain whose target runtime matches your board. `ARM_CROSS_COMPILE_TOOLCHAIN` points to the toolchain root, one level above `bin/`. Run each build with the matching toolchain.

### ARMv7 hard-float {#armv7-hard-float}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/arm-linux-gnueabihf-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/arm-linux-gnueabihf-gcc" --version
VERSION=1.2.4 bash command/build_cross_armv7_armhf.sh
```

This sets `CMAKE_SYSTEM_PROCESSOR=armv7` and `ISF_BUILD_LINUX_ARM7=ON`. The result is `build/inspireface-linux-armv7-armhf-1.2.4/InspireFace`, containing `include/` and `lib/libInspireFace.so`.

### ARM64 {#arm64}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/aarch64-linux-gnu-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-gcc" --version
VERSION=1.2.4 bash command/build_cross_aarch64.sh
```

This sets `CMAKE_SYSTEM_PROCESSOR=aarch64` and `ISF_BUILD_LINUX_AARCH64=ON`. The result is `build/inspireface-linux-aarch64-1.2.4/InspireFace`.

Both scripts pass the compiler paths to CMake and use the toolchain's default sysroot. For a board with a separate vendor sysroot, use a CMake toolchain file that defines the compiler and `CMAKE_SYSROOT`, then apply the corresponding `ISF_BUILD_LINUX_*` option. Link and run the application against the board's own runtime libraries.

The repository's ARM Dockerfiles use Linaro GCC 6.3.1 toolchains. Check `cmake --version` inside the image before building: the ARM64 Dockerfile installs Ubuntu 18.04's distribution CMake, so it needs upgrading to at least 3.20 for this source tree. The compiler itself is an x86_64 Linux executable; use a Linux x86_64 host or container environment for these toolchains.

## Check and deploy the library {#check-and-deploy-the-library}

Inspect the native CPU build with:

```bash
file build/linux-cpu/install/InspireFace/lib/libInspireFace.so
readelf -h build/linux-cpu/install/InspireFace/lib/libInspireFace.so
readelf -d build/linux-cpu/install/InspireFace/lib/libInspireFace.so
```

For a cross build, substitute its output path and use the matching toolchain's `readelf`. Check `Machine` and `Class` for architecture and bitness, and `NEEDED` entries for runtime dependencies. The build also checks that the shared library does not request an executable stack.

Copy the SDK's `include/` and `lib/` directories together. Configure the application's runtime search path to find its packaged libraries, then run the [complete detection program](../using-with/c-cpp.md#a-complete-detection-program) on the target with a matching CPU resource pack. An ARM library cannot be smoke-tested by loading it into an x86_64 application.

## Common build issues {#common-build-issues}

| Symptom | What to check |
| --- | --- |
| CMake cannot find the compiler | The toolchain variable must point above `bin/`; check both `gcc` and `g++`. |
| `GLIBC_*` or `GLIBCXX_*` missing on the target | Build with the target's sysroot or an appropriate older build environment. |
| `Exec format error` | Check the application, SDK and toolchain executable architectures separately. |
| Build cache refers to another compiler | Give each architecture, toolchain and backend its own build directory. |
| Python still loads the previous SDK | Check the loaded library path and follow the [replacement procedure](./python.md). |

Build definitions: [Linux packaging scripts](https://github.com/HyperInspire/InspireFace/tree/master/command), [Docker environments](https://github.com/HyperInspire/InspireFace/blob/master/docker-compose.yml) and [SDK installation rules](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/CMakeLists.txt).
