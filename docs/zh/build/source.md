# 源码准备与通用选项 {#source-and-common-options}

先获取 SDK 源码和依赖，再选择对应平台构建。除代码中明确切换目录外，后续构建命令都在下面 `cd` 进入的 SDK 目录执行。

## 获取源码 {#get-the-source}

选择以下一种方式获取源码。

### Release 版本（推荐） {#release-source}

常规接入推荐使用 [InsightFace 仓库](https://github.com/deepinsight/insightface/tree/master/cpp-package/inspireface)中的 Release 版本。进入 `cpp-package/inspireface` 后，再下载依赖：

```bash
git clone https://github.com/deepinsight/insightface.git
cd insightface/cpp-package/inspireface
git clone --recurse-submodules https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
```

### Develop 版本 {#develop-source}

需要最新功能、更频繁的版本更新和更快的 bug 修复响应时，使用 [Develop 仓库](https://github.com/HyperInspire/InspireFace)：

```bash
git clone https://github.com/HyperInspire/InspireFace.git
cd InspireFace
git clone --recurse-submodules https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
```

获取源码后，按目标平台的构建指南继续。

## 准备构建工具 {#prepare-the-build-tools}

| Tool | 要求 |
| --- | --- |
| Git | 获取 SDK 和第三方依赖子模块。 |
| CMake | 3.20 或更新版本。 |
| C++ compiler | 支持 C++14，使用目标平台的编译器或交叉工具链。 |
| Build tool | 直接使用 CMake 时可选 Make 或 Ninja；多数 `command/` 脚本调用 Make。 |
| Platform SDK | 按平台准备 Android NDK、Xcode、OpenHarmony Native SDK 或板端工具链。 |

部分依赖使用较早的 CMake policy 设置。本文直接调用 CMake 的命令通过 `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` 兼容 CMake 4。统一的 Apple 构建脚本也带有此项。HarmonyOS HAR 脚本尚未传入该设置，运行该脚本时请使用 CMake 3.20–3.x。

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

这条命令生成原生 C/C++ 库。需要 Objective-C 与 Swift Framework 时，使用 [iOS](./ios.md) 或 [macOS](./macos.md) 章节中的统一 Apple 构建脚本。

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

Apple 构建脚本将可复用的依赖缓存放在 `build/apple-cache`，SDK 产物单独整理；具体路径见 [macOS](./macos.md) 和 [iOS](./ios.md) 章节。
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
| `ISF_BUILD_APPLE_FRAMEWORK` | `OFF` | 在 Apple 平台构建 Objective-C Framework 和 Swift 封装。 |
| `ISF_BUILD_APPLE_TESTS` | `OFF` | 构建 Apple API 合约测试。 |
| `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS` | `OFF` | 使用 Task 预处理路径。 |

表中列的是顶层默认值。平台脚本会覆盖其中部分选项，尤其是动态 / 静态链接、示例、测试和硬件后端。`ISF_INSPIRECV_SOURCE_DIR` 可以指定其他图像处理源码目录；更换后重新编译 SDK，并使用本次构建安装的配套头文件。

## 在应用中检查构建结果 {#check-the-build-in-an-application}

先按平台章节检查二进制架构和动态库依赖，再加载[匹配的模型包](../guides/models-and-builds.md#pick-a-resource-pack)，运行单张图像示例并查询 SDK 版本。确认这条流程后，再接入摄像头、打包 Python 或调整硬件参数。版本与构建信息的查询方法见[补充 API 示例](../guides/api-recipes.md)。
