# macOS SDK {#macos-sdk}

macOS 构建支持 Intel x86_64 和 Apple Silicon arm64。普通 MNN 构建搭配 CPU 资源包使用；启用 Apple 扩展后，也可以加载 CoreML 资源包。两种构建都使用同一套 C/C++ 接口。

先完成[源码准备](./source.md)。现成的二进制包见 [SDK 下载](./README.md)。以下命令均在 InspireFace 仓库根目录执行。

## 准备编译器与系统 SDK {#prepare-the-compiler-and-sdk}

安装 Xcode 或 Command Line Tools，以及 CMake 3.20 或以上版本。检查当前选择的工具：

```bash
xcode-select -p
xcrun --sdk macosx --show-sdk-path
clang --version
cmake --version
uname -m
```

Apple Silicon 使用 arm64 shell，Intel 使用 x86_64 shell。四个打包脚本都沿用当前编译器的架构，脚本名不会设置 `CMAKE_OSX_ARCHITECTURES`。如果通过 Rosetta 运行终端，构建前先确认架构。

## 选择构建脚本 {#pick-a-script}

| CPU | Backend | Script in `command/` | Library |
| --- | --- | --- | --- |
| Apple Silicon arm64 | MNN | `build_macos_arm64.sh` | `libInspireFace.dylib` |
| Intel x86_64 | MNN | `build_macos_x86.sh` | `libInspireFace.dylib` |
| Apple Silicon arm64 | CoreML extension | `build_macos_coreml_arm64.sh` | `libInspireFace.a` + `libMNN.a` |
| Intel x86_64 | CoreML extension | `build_macos_coreml_x86.sh` | `libInspireFace.dylib` |

两个 CoreML 脚本都启用 `ISF_ENABLE_APPLE_EXTENSION=ON`。其中 arm64 脚本还设置了 `ISF_BUILD_SHARED_LIBS=OFF`，因此生成的是静态库。Python 需要 CoreML `.dylib` 时，使用下方显式配置的 CMake 命令。

在 Apple Silicon 上构建普通动态库 SDK：

```bash
VERSION=1.2.4 bash command/build_macos_arm64.sh
```

其他组合替换为表中的脚本名即可。`VERSION` 用于添加目录后缀，SDK 的编译版本仍由源码决定。带该后缀时，各脚本的输出目录为：

| Script | Directory under `build/` |
| --- | --- |
| `build_macos_arm64.sh` | `inspireface-macos-apple-silicon-arm64-1.2.4/` |
| `build_macos_x86.sh` | `inspireface-macos-intel-x86-64-1.2.4/` |
| `build_macos_coreml_arm64.sh` | `inspireface-macos-coreml-apple-silicon-arm64-1.2.4/` |
| `build_macos_coreml_x86.sh` | `inspireface-macos-coreml-intel-x86-64-1.2.4/` |

每个目录都包含 `version.txt`、`InspireFace/include/` 和 `InspireFace/lib/`。普通动态库构建会将 MNN 编入 `libInspireFace.dylib`；CoreML 静态库构建则另外提供 `libMNN.a`，供应用最终链接。

::: warning 打包目录
脚本会在安装后清理各自输出目录中的编译中间文件，再将安装后的 SDK 移到该目录。应用文件应保存在其他位置。需要增量编译时，使用下方独立的 CMake 构建目录。
:::

## 指定架构与最低系统版本 {#set-architecture-and-deployment-target}

以下示例使用当前选择的 macOS SDK，构建 arm64 CoreML 动态库，并将应用的最低系统版本设为 macOS 13.0：

```bash
cmake -S . -B build/macos-arm64-coreml-shared \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_SYSROOT="$(xcrun --sdk macosx --show-sdk-path)" \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=13.0 \
  -DISF_ENABLE_APPLE_EXTENSION=ON \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_NEVER_USE_OPENCV=ON
cmake --build build/macos-arm64-coreml-shared --parallel 4
cmake --install build/macos-arm64-coreml-shared
```

SDK 安装在 `build/macos-arm64-coreml-shared/install/InspireFace`。按应用实际支持的系统版本调整 deployment target，并在最低版本上运行验证。打包脚本本身没有固定系统 SDK 和 deployment target，而是沿用构建环境的设置。

Intel 构建改用 `CMAKE_OSX_ARCHITECTURES=x86_64`，并换一个构建目录。普通 CPU SDK 设置 `ISF_ENABLE_APPLE_EXTENSION=OFF`；静态库设置 `ISF_BUILD_SHARED_LIBS=OFF`。不同架构和库类型分别使用独立目录。

## 链接应用 {#link-the-application}

### 动态库 SDK {#shared-sdk}

使用 [C API](../using-with/c-cpp.md#link-the-sdk) 或 [C++](../using-with/cpp.md#build-the-example) 的 CMake 示例，将 `INSPIREFACE_ROOT` 指向包含 `include/` 和 `lib/` 的目录。复制到应用前，先检查文件与依赖：

```bash
file build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
lipo -info build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
otool -L build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
otool -l build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
```

`otool -L` 显示 install name 和运行时依赖，`otool -l` 包含最低系统版本和加载信息。打包应用时，把动态库放入 app bundle，为该位置设置 install name 和可执行文件的 runpath，并将其纳入应用签名步骤。除了构建目录，也要从打包后的应用中验证加载。

### CoreML 静态库 SDK {#static-coreml-sdk}

应用最终链接时需要带上两个静态库和 Apple framework。将[完整 C 检测程序](../using-with/c-cpp.md#a-complete-detection-program)保存为 `detect.c`，在同一目录使用以下配置：

<details>
<summary>CMakeLists.txt — CoreML 静态链接示例</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_static_detection LANGUAGES C CXX)

set(INSPIREFACE_ROOT "" CACHE PATH "SDK directory containing include/ and lib/")
find_library(FOUNDATION_FRAMEWORK Foundation REQUIRED)
find_library(COREML_FRAMEWORK CoreML REQUIRED)
find_library(ACCELERATE_FRAMEWORK Accelerate REQUIRED)

add_executable(detect_c detect.c)
target_compile_features(detect_c PRIVATE c_std_99)
target_include_directories(detect_c PRIVATE "${INSPIREFACE_ROOT}/include")
set_target_properties(detect_c PROPERTIES LINKER_LANGUAGE CXX)
target_link_libraries(detect_c PRIVATE
    "${INSPIREFACE_ROOT}/lib/libInspireFace.a"
    "${INSPIREFACE_ROOT}/lib/libMNN.a"
    ${FOUNDATION_FRAMEWORK}
    ${COREML_FRAMEWORK}
    ${ACCELERATE_FRAMEWORK})
```

</details>

在示例目录执行，将 SDK 路径改为 arm64 CoreML 脚本产物的完整路径：

```bash
cmake -S . -B build \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DINSPIREFACE_ROOT=/path/to/InspireFace/build/inspireface-macos-coreml-apple-silicon-arm64-1.2.4/InspireFace
cmake --build build --parallel 4
./build/detect_c /path/to/resource-pack /path/to/face.jpg
```

这套链接配置对应脚本默认的后端选项。如果另外启用了 MNN Metal 或其他后端，还需要在应用中补上该后端依赖的 framework 或库。

## 资源包与 Python {#resource-packs-and-python}

Apple 扩展开关会加入 CoreML 支持，但不会转换 MNN 资源包。要使用 CoreML 推理，需要配套的 CoreML 资源包；普通 CPU 资源包仍使用 MNN 后端。应用需要指定 CPU、GPU 或 ANE 偏好时，在创建 session 前设置 CoreML 推理模式。

Python 加载的是 `libInspireFace.dylib`，因此需要动态库构建，并与 Python 进程架构保持一致。arm64 库需要 arm64 Python；即使同一台 Mac 能通过 Rosetta 运行 x86_64 Python，也不能混用两种架构。替换动态库、加载路径和 wheel 制作见 [Python 打包章节](./python.md)。

## 常见构建问题 {#common-build-issues}

| Symptom | What to check |
| --- | --- |
| `incompatible architecture` | 对照 `lipo -info` 与应用或 Python 进程的架构。 |
| CoreML 构建只生成了 `.a` | arm64 CoreML 脚本默认生成静态库；需要 `.dylib` 时设置 `ISF_BUILD_SHARED_LIBS=ON`。 |
| MNN 或 Objective-C 符号未定义 | 静态链接时补上 `libMNN.a`、Apple framework 和 C++ 运行库。 |
| 本地运行正常，打包后加载失败 | 检查动态库 install name、应用 runpath 和打包后的签名。 |
| 应用要求更高的 macOS 版本 | 在新构建目录中设置 deployment target，并检查所有链接依赖的最低版本。 |

构建定义：[macOS 脚本](https://github.com/HyperInspire/InspireFace/tree/master/command)、[CoreML workflow](https://github.com/HyperInspire/InspireFace/blob/master/.github/workflows/coreml_series.yaml)和 [framework 与库链接规则](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/CMakeLists.txt)。
