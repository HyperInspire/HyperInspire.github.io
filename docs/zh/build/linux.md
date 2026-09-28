# Linux SDK {#linux-sdk}

本章构建 Linux x86_64、ARMv7 和 ARM64 的 CPU 动态库，可用于原生应用，也可以[放入 Python 包](./python.md)。NVIDIA 和 Rockchip 分别见 [TensorRT](./nvidia.md) 和 [RKNPU](./rockchip.md) 构建章节。

先完成[源码准备](./source.md)，以下命令均在 InspireFace 仓库根目录执行。需要现成的二进制包时，直接查看 [SDK 下载](./README.md)。

ARM CPU 的图像处理、特征比对优化与相机循环调优见 [ARM 部署](../using-with/arm.md)。

## 选择构建环境 {#choose-the-build-environment}

| Target | Build environment | Entry point |
| --- | --- | --- |
| Native CPU | Linux、CMake 3.20+、C++14 编译器、Make 或 Ninja、`readelf` | 下方的 CMake 命令 |
| x86_64 / Ubuntu 18.04 | 仓库提供的 Docker 镜像 | `command/build_linux_ubuntu18.sh` |
| x86_64 / manylinux2014 | 仓库提供的 manylinux2014 镜像 | `command/build_linux_manylinux2014.sh` |
| ARMv7 hard-float | Linux x86_64 主机、`arm-linux-gnueabihf` 工具链 | `command/build_cross_armv7_armhf.sh` |
| ARM64 | Linux x86_64 主机、`aarch64-linux-gnu` 工具链 | `command/build_cross_aarch64.sh` |

除了 CPU 架构，还要匹配目标设备的 C 库和编译器运行库。这两套通用 ARM 脚本使用 GNU/Linux 工具链；RV1106 的 uClibc 构建见 Rockchip 章节。

## 在目标机器上编译 {#build-on-the-target-machine}

在 Linux 电脑、服务器或 ARM 开发板上，下面的命令会按当前编译器的架构构建，并保留构建目录，方便修改选项后继续增量编译。

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

默认 CPU 构建会把 MNN 编入 SDK 动态库，图像处理也不需要单独安装 OpenCV。头文件和库安装在：

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

使用 [C API 链接示例](../using-with/c-cpp.md#link-the-sdk)时，将 `INSPIREFACE_ROOT` 指向 `build/linux-cpu/install/InspireFace`。资源包需要单独准备，下载方法见[模型与构建](../guides/models-and-builds.md#pick-a-resource-pack)。

## 生成 x86_64 发布目录 {#build-an-x86-64-release-directory}

打包脚本使用 4 个编译任务，关闭测试和示例，并将安装文件整理到指定目录。设置 `VERSION=1.2.4` 后：

| Script | SDK directory |
| --- | --- |
| `build_linux_ubuntu18.sh` | `build/inspireface-linux-x86-ubuntu18-1.2.4/InspireFace` |
| `build_linux_manylinux2014.sh` | `build/inspireface-linux-x86-manylinux2014-1.2.4/InspireFace` |

::: warning 打包目录
这些脚本在安装后会清理各自输出目录中的编译中间文件，不要把应用文件放进该目录。需要保留编译缓存时，使用上面的 CMake 构建方式。
:::

在装有 Docker Compose 的 Linux x86_64 主机上，使用仓库的 Ubuntu 18.04 环境：

```bash
VERSION=1.2.4 docker compose run --build --rm build-ubuntu18
```

使用 manylinux2014 环境时，覆盖服务的默认命令，只构建原生 SDK：

```bash
VERSION=1.2.4 docker compose run --build --rm \
  build-manylinux2014-x86 bash command/build_linux_manylinux2014.sh
```

两个命令都会将当前仓库挂载到容器的 `/workspace`，产物写回仓库的 `build/` 目录。`VERSION` 只改变目录后缀，SDK 的实际版本由源码决定；不设置时，目录名不带版本号。

### Ubuntu 与 manylinux {#ubuntu-and-manylinux}

构建环境决定了产物所需的 glibc 和 C++ 运行库版本。在较新的发行版上直接运行 `build_linux_ubuntu18.sh`，使用的仍然是当前系统的编译器和库；脚本名称不会改变 Ubuntu 兼容基线。

制作对应的 Linux Python 包时，使用 manylinux 容器。Compose 服务默认执行 `build_wheel_manylinux2014_x86.sh`，除了构建 SDK，还会把 `.so` 复制到 Python 项目并制作 wheel。上面的覆盖命令只生成原生 SDK。包内容、平台标签和替换 `.so` 的方法见 [Python 打包](./python.md)。

## ARM 交叉编译 {#cross-compile-for-arm}

准备在 Linux x86_64 主机上运行的 GNU 工具链，并确认其目标运行库与开发板匹配。`ARM_CROSS_COMPILE_TOOLCHAIN` 指向工具链根目录，也就是 `bin/` 的上一级。每次构建前切换为对应的工具链。

### ARMv7 hard-float {#armv7-hard-float}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/arm-linux-gnueabihf-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/arm-linux-gnueabihf-gcc" --version
VERSION=1.2.4 bash command/build_cross_armv7_armhf.sh
```

脚本设置 `CMAKE_SYSTEM_PROCESSOR=armv7` 和 `ISF_BUILD_LINUX_ARM7=ON`。SDK 位于 `build/inspireface-linux-armv7-armhf-1.2.4/InspireFace`，包含 `include/` 和 `lib/libInspireFace.so`。

### ARM64 {#arm64}

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/opt/aarch64-linux-gnu-toolchain
"$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-gcc" --version
VERSION=1.2.4 bash command/build_cross_aarch64.sh
```

脚本设置 `CMAKE_SYSTEM_PROCESSOR=aarch64` 和 `ISF_BUILD_LINUX_AARCH64=ON`。SDK 位于 `build/inspireface-linux-aarch64-1.2.4/InspireFace`。

两个脚本都会向 CMake 传入编译器路径，使用工具链默认的 sysroot。如果开发板厂商单独提供了 sysroot，可以在 CMake 工具链文件中设置编译器和 `CMAKE_SYSROOT`，再启用对应的 `ISF_BUILD_LINUX_*` 选项。应用的链接和运行都要使用开发板对应的运行库。

仓库中的 ARM Dockerfile 使用 Linaro GCC 6.3.1 工具链。构建前先在镜像中执行 `cmake --version`：ARM64 Dockerfile 安装的是 Ubuntu 18.04 的发行版 CMake，构建本版本源码前需要将其升级到 3.20 或以上。工具链中的编译器本身也是 Linux x86_64 程序，需要在对应的主机或容器环境中运行。

## 检查与部署 {#check-and-deploy-the-library}

检查本机构建的 CPU 库：

```bash
file build/linux-cpu/install/InspireFace/lib/libInspireFace.so
readelf -h build/linux-cpu/install/InspireFace/lib/libInspireFace.so
readelf -d build/linux-cpu/install/InspireFace/lib/libInspireFace.so
```

交叉编译时换成对应的输出路径，并使用该工具链的 `readelf`。通过 `Machine` 和 `Class` 检查架构与位数，通过 `NEEDED` 检查动态库依赖。构建过程也会确认动态库没有要求可执行栈。

一起复制 SDK 的 `include/` 和 `lib/` 目录，配置应用的运行时库搜索路径，再在目标机器上用匹配的 CPU 资源包运行[完整检测程序](../using-with/c-cpp.md#a-complete-detection-program)。ARM 库需要在 ARM 应用中验证，不能加载到 x86_64 应用里运行。

## 常见构建问题 {#common-build-issues}

| Symptom | What to check |
| --- | --- |
| CMake 找不到编译器 | 工具链变量应指向 `bin/` 的上一级，同时检查 `gcc` 和 `g++`。 |
| 目标机器缺少 `GLIBC_*` 或 `GLIBCXX_*` | 使用目标 sysroot 或合适的旧版构建环境重新编译。 |
| `Exec format error` | 分别检查应用、SDK 和工具链程序自身的架构。 |
| 构建缓存引用了另一套编译器 | 为每种架构、工具链和后端使用独立的构建目录。 |
| Python 仍然加载旧 SDK | 检查实际加载路径，并按 [Python 章节](./python.md)的步骤替换。 |

构建定义：[Linux 打包脚本](https://github.com/HyperInspire/InspireFace/tree/master/command)、[Docker 环境](https://github.com/HyperInspire/InspireFace/blob/master/docker-compose.yml)和 [SDK 安装规则](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/CMakeLists.txt)。
