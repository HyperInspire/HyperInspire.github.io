# macOS SDK {#macos-sdk}

macOS 构建支持 Apple Silicon arm64 和 Intel x86_64，并提供 C/C++、Objective-C 与 Swift 接口。可以只构建本机架构，也可以将两个架构合成 XCFramework，或与 iOS 真机、模拟器一起打包。

1.2.4 Release 已提供包含两种 macOS 架构的 CPU 包。需要从源码构建时，先完成[Develop 版本源码准备](./source.md#develop-source)，再从 InspireFace 仓库根目录执行构建命令。

## 下载 CPU SDK {#download-the-cpu-sdk}

下载 [inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip)，其中包含 macOS、iOS 真机和模拟器版本。解压到 `build/` 后，可以直接使用下方路径：

```bash
mkdir -p build
curl -L --fail -o build/inspireface-apple-1.2.4.zip \
  https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip
ditto -x -k build/inspireface-apple-1.2.4.zip build
```

| Contents under `build/inspireface-apple-1.2.4/` | 用途 |
| --- | --- |
| `InspireFace.xcframework`, `InspireFaceSwift.xcframework` | 加入 Xcode 应用；macOS 选择 **Embed & Sign**。 |
| `Frameworks/macosx/` | 合并架构后的 macOS Framework，可直接链接。 |
| `SDKs/macosx-arm64/InspireFace/` | Apple Silicon 的原始头文件与 `.dylib`；要求 macOS 14.0 或更新版本。 |
| `SDKs/macosx-x86_64/InspireFace/` | Intel 的原始头文件与 `.dylib`；要求 macOS 15.0 或更新版本。 |

发布包使用 Xcode 16.4 构建，[模型资源](./README.md#download-the-model-separately)需单独下载。可直接继续[链接应用](#link-the-application)使用这个包；需要 CoreML 或自定义配置时，再从源码构建。

## 准备编译器与 SDK {#prepare-the-compiler-and-sdk}

安装 Xcode、CMake 3.20 或更新版本、Python 3 和 Git。framework 构建会使用 Objective-C 和 Swift 编译器；完整 Apple 包还需要 Xcode 的 iOS SDK。

```bash
xcode-select -p
xcodebuild -version
xcrun --sdk macosx --show-sdk-path
xcrun swiftc --version
cmake --version
python3 --version
uname -m
```

需要选择特定 Xcode 时，设置 `DEVELOPER_DIR`。脚本现在会显式指定目标架构，不再依赖当前终端推断架构；执行编译好的测试程序时，仍需要兼容的运行环境。

## 选择构建脚本 {#pick-a-script}

在 Apple Silicon 上构建 CPU 版本：

```bash
VERSION=1.2.4 bash command/build_macos_arm64.sh --jobs 4
```

| Architecture | Backend | Script in `command/` | Raw library |
| --- | --- | --- | --- |
| `arm64` | CPU | `build_macos_arm64.sh` | `libInspireFace.dylib` |
| `x86_64` | CPU | `build_macos_x86.sh` | `libInspireFace.dylib` |
| `arm64` | CoreML extension | `build_macos_coreml_arm64.sh` | `libInspireFace.a` + `libMNN.a` |
| `x86_64` | CoreML extension | `build_macos_coreml_x86.sh` | `libInspireFace.dylib` |

每一项还会生成**动态** `InspireFace.framework` 和 `InspireFaceSwift.framework`。CoreML arm64 的原始库是静态库，但同一次构建生成的 framework 仍是动态库。

这些脚本统一调用 `command/apple/build_sdk.py`，从 `3rdparty` 源码编译依赖，并在 `build/apple-cache/` 保留增量构建文件。设置 `VERSION=1.2.4` 时，安装产物目录如下：

| Script | Directory under `build/` |
| --- | --- |
| `build_macos_arm64.sh` | `inspireface-macos-apple-silicon-arm64-1.2.4/` |
| `build_macos_x86.sh` | `inspireface-macos-intel-x86-64-1.2.4/` |
| `build_macos_coreml_arm64.sh` | `inspireface-macos-coreml-apple-silicon-arm64-1.2.4/` |
| `build_macos_coreml_x86.sh` | `inspireface-macos-coreml-intel-x86-64-1.2.4/` |

```text
inspireface-macos-apple-silicon-arm64-1.2.4/
  InspireFace.framework/
  InspireFaceSwift.framework/
  InspireFace/
    include/
    lib/libInspireFace.dylib
  version.txt
  sdk-info.json
```

`VERSION` 修改输出目录后缀。编译到 SDK 中的版本和 framework bundle 版本来自 `CMakeLists.txt` 中的源码版本。`sdk-info.json` 记录架构、后端、依赖提交、Xcode 版本和二进制部署信息。

## 构建通用 macOS framework {#build-universal-macos-frameworks}

省略 `--arch` 会构建两个 macOS 架构，加上 `--package` 将它们打包：

```bash
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform macosx --backend cpu --package --jobs 4
```

`build/inspireface-apple-1.2.4/` 中包含 `InspireFace.xcframework`、`InspireFaceSwift.xcframework`、`Frameworks/macosx/` 下合并架构后的 framework、`SDKs/` 下的原始架构目录，以及 `sdk-manifest.json`。这条命令只包含 macOS。改用 `--backend coreml`，会输出到单独的 `build/inspireface-apple-coreml-1.2.4/`。

## 构建完整 Apple 包 {#build-all-apple-platforms}

将 macOS、iOS 真机和模拟器一起打成 CPU 包：

```bash
VERSION=1.2.4 bash command/build_apple_xcframeworks.sh --backend cpu --jobs 4
```

| Platform | Architectures | Framework linkage |
| --- | --- | --- |
| macOS | `arm64`, `x86_64` | Dynamic |
| iOS device | `arm64` | Static |
| iOS Simulator | `arm64`, `x86_64` | Static |

不指定 `--backend cpu` 时，这个脚本会同时构建 **CPU 和 CoreML**，分别输出两套包。两者的模块名和 framework 名相同，不要同时加入一个应用 target。

打包脚本先合并同一平台的架构，再通过 `xcodebuild -create-xcframework` 将不同平台组合起来。它会检查各个 slice 的依赖提交和 Xcode 工具链是否一致。分开构建 slice 时，也应保持 SDK 源码、依赖源码和工具链一致。

::: tip CPU 发布包与 CoreML 构建
1.2.4 CPU 发布包已包含上表的全部五个架构 / 平台切片。需要 CoreML 时，使用 `--backend coreml` 在本地构建独立的包。
:::

## 设置架构和最低系统版本 {#set-architecture-and-deployment-target}

统一构建脚本支持 `--platform`、`--arch`、`--backend`、`--package`、`--jobs`、`--cache-root` 和 `--output-root`，默认值见 [参数表](./ios.md#select-slices-and-build-settings)。注意，直接调用脚本时后端默认为 `all`，只需要 CPU 版应显式指定 `cpu`。

通过环境变量设置最低 macOS 版本：

```bash
MACOSX_DEPLOYMENT_TARGET=14.0 VERSION=1.2.4 \
  bash command/build_macos_arm64.sh --jobs 4
```

省略时，由所选编译器和 SDK 决定最低版本。1.2.4 发布包的 arm64 二进制要求 macOS 14.0，x86_64 要求 macOS 15.0。自行构建时可以请求其他目标版本，并在应用计划支持的最早 macOS 版本上验证。

需要自定义 CMake 配置时，下面的示例同时生成 framework 和原始 arm64 CoreML `.dylib`。Python 需要动态库，可以使用这种构建方式，替代 `build_macos_coreml_arm64.sh` 默认选择的原始静态库。

<details>
<summary>自定义 arm64 CoreML 动态库构建</summary>

```bash
cmake -S . -B build/macos-arm64-coreml-shared \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_SYSROOT="$(xcrun --sdk macosx --show-sdk-path)" \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0 \
  -DISF_BUILD_APPLE_FRAMEWORK=ON \
  -DISF_ENABLE_APPLE_EXTENSION=ON \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_NEVER_USE_OPENCV=ON \
  -DMNN_BUILD_SHARED_LIBS=OFF \
  -DMNN_BUILD_TOOLS=OFF \
  -DMNN_BUILD_DEMO=OFF \
  -DMNN_METAL=OFF \
  -DMNN_COREML=OFF
cmake --build build/macos-arm64-coreml-shared --parallel 4
cmake --install build/macos-arm64-coreml-shared
```

</details>

安装根目录为 `build/macos-arm64-coreml-shared/install/`，两个 framework 与 `InspireFace/include/`、`InspireFace/lib/` 并列。直接调用 CMake 时，`ISF_BUILD_APPLE_FRAMEWORK` 默认为 `OFF`，Apple 脚本会将其打开。`ISF_BUILD_SHARED_LIBS` 控制原始 SDK 库的类型，macOS framework 始终为动态库。不同架构和编译配置分别使用独立构建目录。

## 链接应用 {#link-the-application}

### Objective-C 和 Swift framework {#objective-c-and-swift-frameworks}

Objective-C target 加入 `InspireFace.xcframework`；使用 Swift API 时，还需加入 `InspireFaceSwift.xcframework`。macOS 应用对动态 framework 选择 **Embed & Sign**，并保留应用的 framework runpath。在 **Other Linker Flags** 中保留 `$(inherited)` 并加入 `-ObjC`。

```objective-c
@import InspireFace;
```

```swift
import InspireFaceSwift
```

`InspireFaceSwift` 会重新导出核心模块，使用 Swift API 不需要自行添加 bridging header。推理依赖已经链接进 `InspireFace.framework`，该 target 不应再额外链接原始 SDK 或单独的推理静态库。

下面的 Swift 命令行程序不需要加载模型。解压上方 CPU 下载包后，将代码保存为 `main.swift` 并编译：

<details>
<summary>main.swift 与编译命令</summary>

```swift
import InspireFaceSwift

var level: UInt32 = 0
try InspireFaceDiagnostics.getCAPILevel(&level)
precondition(level == HF_C_API_LEVEL)
let stream = try ImageStream()
try stream.close()
print("InspireFace API level:", level)
```

```bash
SDK_DIR="$PWD/build/inspireface-apple-1.2.4/Frameworks/macosx"
xcrun swiftc main.swift \
  -target arm64-apple-macosx14.0 \
  -F "$SDK_DIR" \
  -framework InspireFace -framework InspireFaceSwift \
  -Xlinker -ObjC \
  -Xlinker -rpath -Xlinker "$SDK_DIR" \
  -o check-inspireface
./check-inspireface
```

</details>

这条命令使用 arm64、macOS 14.0。Intel 可使用同一套通用 Framework，将 `-target` 改为 `x86_64-apple-macosx15.0`。使用本地单架构构建时，将 `SDK_DIR` 改为对应输出目录，并匹配最低系统版本。应用 bundle 交给 Xcode 复制和签名 framework，打包后再验证一次。[Apple API 指南](../using-with/apple.md)提供模型初始化与人脸检测示例，macOS 使用相同的 Objective-C 和 Swift API。

### 原始动态库 {#shared-sdk}

C/C++ 应用和 Python 可以继续使用 `InspireFace/lib/libInspireFace.dylib`。参考 [C API](../using-with/c-cpp.md#link-the-sdk) 或 [C++](../using-with/cpp.md#build-the-example) 的构建示例，将 `INSPIREFACE_ROOT` 指向包含 `include/` 和 `lib/` 的目录。发布包中按应用架构选择 `SDKs/macosx-arm64/InspireFace` 或 `SDKs/macosx-x86_64/InspireFace`。

```bash
SDK_ROOT="build/inspireface-apple-1.2.4/SDKs/macosx-arm64/InspireFace"
file "$SDK_ROOT/lib/libInspireFace.dylib"
lipo -info "$SDK_ROOT/lib/libInspireFace.dylib"
otool -L "$SDK_ROOT/lib/libInspireFace.dylib"
```

Apple framework 构建也会把原始 dylib 的 install name 设置为 `@rpath`。根据库在应用 bundle 中的位置配置 runpath，并在打包时签名。应用选择原始 SDK 或 framework 其中一条链接路径即可，两者都包含 SDK 实现。

### 原始 CoreML 静态库 {#static-coreml-sdk}

`build_macos_coreml_arm64.sh` 保留了 `libInspireFace.a` 与 `libMNN.a` 的原始静态库接入方式。最终应用需要链接两个静态库、C++ runtime、Foundation、CoreML 和 Accelerate。这个接入方式与同一命令生成的动态 framework 分开使用。

<details>
<summary>完整 C 检测程序对应的 CMakeLists.txt</summary>

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

将[完整 C 检测程序](../using-with/c-cpp.md#a-complete-detection-program)保存为 `detect.c`，并将 `INSPIREFACE_ROOT` 设置为 `build/inspireface-macos-coreml-apple-silicon-arm64-1.2.4/InspireFace`。自定义构建启用其他推理后端时，还需加入对应的系统依赖。

## 验证安装产物 {#validate-the-installed-sdk}

加上 `--verify`，会编译、运行安装后的调用程序及 Objective-C / Swift 接口测试。模型测试需要 Pikachu 资源包和仓库中的测试图像：

<details>
<summary>构建并验证当前 Mac 架构</summary>

```bash
bash command/download_models_general.sh Pikachu
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform macosx --arch "$(uname -m)" --backend cpu \
  --verify --jobs 4
```

</details>

`--tests` 只编译接口测试；`--verify` 还检查 C/C++ 兼容性、framework 导入、运行时依赖、移动位置后的 Swift interface，以及实际模型执行。日常验证可以直接选择本机架构；同时执行两种 macOS 架构的测试，需要当前 Mac 支持运行这两种架构。

`--coverage` 可与 `--verify --platform macosx` 一起使用，检查 API 执行覆盖情况，再关闭插桩重新编译后安装。只检查已有 XCFramework 包、不重新编译 SDK 时，使用：

```bash
python3 cpp/test/apple/verify_xcframeworks.py \
  --package build/inspireface-apple-1.2.4 \
  --output build/apple-package-consumers \
  --native-only
```

它会执行本机 macOS 架构的安装产物调用程序，对其他 slice 进行编译、链接检查。模拟器执行需要单独开启，见 [iOS 测试](./ios.md#run-the-apple-interface-tests)。

## 资源包与 Python {#resource-packs-and-python}

CoreML 推理需要 Apple 扩展构建和 Apple 资源包，普通 CPU 资源包仍走 CPU 后端。需要选择 CPU、GPU 或 ANE 偏好时，在创建 session 前设置 CoreML 推理模式。

Python 继续加载 `libInspireFace.dylib`，Objective-C 和 Swift framework 不会替代这个文件。动态库架构应与 Python 进程一致。使用 CPU 脚本生成的动态库，或上文自定义的 CoreML 动态库，再参考 [Python 打包](./python.md)完成库替换、路径配置和 wheel 制作。

## 常见构建问题 {#common-build-issues}

| Symptom | What to check |
| --- | --- |
| `incompatible architecture` | SDK slice、应用架构，以及 Python / 测试进程的架构。 |
| CoreML arm64 原始产物只有 `.a` | Python 改用 CMake 动态库构建；配套 framework 已经是动态库。 |
| `No such module InspireFaceSwift` | 加入配套的两个 XCFramework，或同一安装目录下的两个 framework。 |
| 打包后无法加载 framework | 检查嵌入、签名和相对于最终应用 bundle 的 `@rpath`。 |
| 应用要求更新的 macOS 版本 | 检查 SDK 及每个链接依赖中的最低系统版本。 |
| XCFramework 打包拒绝某个 slice | 后端、依赖提交、工具链和公开接口应保持一致。 |

构建定义：[Apple 构建脚本](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/command/apple/build_sdk.py)、[framework 配置](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/cpp/inspireface/platform/apple/CMakeLists.txt)、[Apple CI](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/.github/workflows/apple-sdk.yaml)。
