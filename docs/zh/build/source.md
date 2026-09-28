# 源码准备与通用选项 {#source-and-common-options}

先准备 SDK 源码和依赖，再选择对应平台构建。除代码中明确切换目录外，本章命令都在 InspireFace 仓库根目录执行。

## 获取源码 {#get-the-source}

下面从 develop 仓库获取源码，并将 SDK 和依赖固定到这份 **1.2.4** 示例使用的提交。在用于存放项目的目录执行：

```bash
git clone https://github.com/HyperInspire/InspireFace.git
cd InspireFace
git checkout 1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9
git clone https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
git -C 3rdparty checkout dfb1f29c511954bc0764c232ed62e713d972844d
git -C 3rdparty submodule update --init --recursive
```

已有 `3rdparty` 时，在现有目录初始化子模块即可：

```bash
git -C 3rdparty submodule update --init --recursive
```

依赖仓库与 SDK 分别更新。保存产物时，一并记录两个仓库的提交：

```bash
git rev-parse HEAD
git -C 3rdparty rev-parse HEAD
git -C 3rdparty submodule status --recursive
```

需要跟进后续开发时，选择新的 SDK 提交，并同步更新头文件、语言封装和原生库。构建脚本中的 `VERSION` 环境变量只用于产物目录命名，不会改变运行库的接口版本。

## 准备构建工具 {#prepare-the-build-tools}

| Tool | 要求 |
| --- | --- |
| Git | 获取 SDK 和第三方依赖子模块。 |
| CMake | 3.20 或更新版本。 |
| C++ compiler | 支持 C++14，使用目标平台的编译器或交叉工具链。 |
| Build tool | 直接使用 CMake 时可选 Make 或 Ninja；多数 `command/` 脚本调用 Make。 |
| Platform SDK | 按平台准备 Android NDK、Xcode、OpenHarmony Native SDK 或板端工具链。 |

部分依赖使用较早的 CMake policy 设置。本文直接调用 CMake 的命令通过 `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` 兼容 CMake 4。部分平台脚本也带有此项；iOS 和 HarmonyOS HAR 脚本尚未传入该设置，运行这几份脚本时请使用 CMake 3.20–3.x。

## 构建 CPU SDK {#build-a-cpu-sdk}

在 Linux 或 macOS 上，下面的命令按当前编译器的目标平台生成动态库，并保留中间文件供后续增量编译：

```bash
cmake -S . -B build/local-cpu \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_INSTALL_CPP_HEADER=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF
cmake --build build/local-cpu --parallel 4
cmake --install build/local-cpu
```

不同架构和后端使用独立构建目录。[Linux](./linux.md) 和 [macOS](./macos.md) 章节提供平台设置与库文件检查命令。

## 了解产物目录 {#understand-the-output-layout}

直接使用 CMake 时，项目将安装目录设为构建目录下的 `install`。上面的 CPU 构建生成：

```text
build/local-cpu/install/
  InspireFace/
    include/
      inspireface.h
      intypedef.h
      herror.h
      inspireface/
      inspirecv/
    lib/
      libInspireFace.so       # Linux; libInspireFace.dylib on macOS
  version.txt
```

使用 [C](../using-with/c-cpp.md#link-the-sdk) 或 [C++](../using-with/cpp.md#build-the-example) 应用示例时，将 `INSPIREFACE_ROOT` 指向 `build/local-cpu/install/InspireFace`。Python 使用完整的动态库文件路径，详见 [Python 打包](./python.md)。

::: warning 发布脚本会整理构建目录
`command/` 下的许多脚本会将安装产物移到自身构建目录顶层，并删除编译中间文件，因此最终路径与直接使用 CMake 不同。应用文件放在这些目录之外，取用产物时以对应平台章节给出的路径为准。
:::

## 常用 CMake 选项 {#common-cmake-options}

| Option | Default | 作用 |
| --- | --- | --- |
| `ISF_BUILD_SHARED_LIBS` | `ON` | 构建动态库；静态链接应用时还需链接相关依赖。 |
| `ISF_INSTALL_CPP_HEADER` | `ON` | 同时安装 C++、图像处理和 C API 头文件。 |
| `ISF_BUILD_WITH_SAMPLE` | `ON` | 编译源码中的示例程序。 |
| `ISF_BUILD_WITH_TEST` | `ON` | 编译测试目标；运行测试时还需准备模型和测试数据。 |
| `ISF_NEVER_USE_OPENCV` | `ON` | 默认图像处理路径不依赖 OpenCV。 |
| `ISF_ENABLE_TENSORRT` | `OFF` | 启用 NVIDIA TensorRT 后端。 |
| `ISF_ENABLE_RKNN` | `OFF` | 启用 Rockchip NPU 后端。 |
| `ISF_ENABLE_RGA` | `OFF` | 在支持的 RKNPU2 配置下启用 Rockchip 预处理。 |
| `ISF_ENABLE_APPLE_EXTENSION` | `OFF` | 启用 Apple 扩展，包括 CoreML 支持。 |
| `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS` | `OFF` | 使用 Task 预处理路径。 |

表中列的是顶层默认值。平台脚本会覆盖其中部分选项，尤其是动态 / 静态链接、示例、测试和硬件后端。`ISF_INSPIRECV_SOURCE_DIR` 可以指定其他图像处理源码目录；更换后重新编译 SDK，并使用本次构建安装的配套头文件。

## 在应用中检查构建结果 {#check-the-build-in-an-application}

先按平台章节检查二进制架构和动态库依赖，再加载[匹配的模型包](../guides/models-and-builds.md#pick-a-resource-pack)，运行单张图像示例并查询 SDK 版本。确认这条流程后，再接入摄像头、打包 Python 或调整硬件参数。版本与构建信息的查询方法见[补充 API 示例](../guides/api-recipes.md)。
