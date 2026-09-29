# 构建 iOS SDK {#build-for-ios}

Apple 构建已加入 **Objective-C 和 Swift 接口**，同时提供 arm64 真机、arm64 / x86_64 模拟器版本。主要产物是 `InspireFace.xcframework` 和 `InspireFaceSwift.xcframework`，加入应用后由 Xcode 选择对应的平台和架构。

`InspireFace` 包含 C API 和 Objective-C 类，`InspireFaceSwift` 提供 Swift API。已有 C/C++ 项目仍可使用 `SDKs/` 下的头文件与库。可以直接使用下方 CPU 发布包，需要修改配置时再从源码构建。应用代码见 [Objective-C 与 Swift 接入](../using-with/apple.md)。

## 下载 CPU SDK {#download-the-cpu-sdk}

[inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip) 包含 iOS 真机、模拟器和 macOS 切片。解压到 `build/` 后，可以直接使用本文的路径：

```bash
mkdir -p build
curl -L --fail -o build/inspireface-apple-1.2.4.zip \
  https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip
ditto -x -k build/inspireface-apple-1.2.4.zip build
```

两个 XCFramework 位于 `build/inspireface-apple-1.2.4/`。iOS 真机切片最低要求 iOS 11.0；模拟器 arm64 要求 iOS 14.0，x86_64 要求 iOS 11.0。使用 CPU 推理可直接继续[加入 Xcode 应用](#add-the-result-to-an-app)。压缩包仅包含 SDK 库，[模型资源](./README.md#download-the-model-separately)需单独下载。CoreML 版本使用下方源码构建方式。

## 准备 Xcode 和依赖 {#prepare-xcode-and-dependencies}

在 Mac 上完成[Develop 版本源码准备](./source.md#develop-source)，安装带 iOS SDK 的 Xcode、CMake 3.20 或更新版本、Python 3 和 Git。脚本还会使用 Xcode 自带的 Swift 编译器、`libtool`、`lipo` 和 `xcodebuild`。先检查工具链：

```bash
xcode-select -p
xcodebuild -version
xcrun --sdk iphoneos --show-sdk-path
xcrun --sdk iphonesimulator --show-sdk-path
xcrun swiftc --version
cmake --version
python3 --version
```

安装了多个 Xcode 时，可以在当前终端指定：

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

以下命令从 InspireFace 仓库根目录运行。依赖会从 `3rdparty` 源码按目标平台分别编译，不再使用旧的 `.macos_cache/MNN.framework` 下载缓存。离线构建前需要准备好完整的依赖仓库。

## 构建 CPU XCFramework {#build-the-standard-framework}

```bash
VERSION=1.2.4 bash command/build_ios.sh --jobs 4
```

这条命令会构建以下 slice，并打包两套接口：

| SDK | Architectures | Framework linkage |
| --- | --- | --- |
| `iphoneos` | `arm64` | Static |
| `iphonesimulator` | `arm64`, `x86_64` | Static |

输出目录为 `build/inspireface-apple-1.2.4/`。虽然目录名包含 `apple`，这条命令只构建 iOS 真机和模拟器；需要一起加入 macOS 时，使用[完整 Apple 构建](./macos.md#build-all-apple-platforms)。

```text
build/inspireface-apple-1.2.4/
  InspireFace.xcframework/
  InspireFaceSwift.xcframework/
  Frameworks/
    iphoneos/
    iphonesimulator/
  SDKs/
    iphoneos-arm64/
    iphonesimulator-arm64/
    iphonesimulator-x86_64/
  sdk-manifest.json
```

`Frameworks/` 保存按平台合并架构后的 framework。`SDKs/` 保留各个架构独立的 framework、C/C++ 头文件、原始库、`version.txt` 和 `sdk-info.json`。iOS 原始库目录还包含依赖静态库，以及供原有接入方式使用的 `MNN.framework`。

`VERSION` 只修改输出目录后缀，不会改变 `CMakeLists.txt` 中定义的 SDK 版本。framework 的 bundle 版本也已使用源码版本。不设置 `VERSION` 时，输出到 `build/inspireface-apple/`。

::: tip 从旧版 iOS 构建迁移
新版静态 `InspireFace.framework` 已合入推理依赖。改用 XCFramework 时，应从同一个 target 中移除单独链接的 `MNN.framework` 和原始 `libInspireFace.a`。继续使用原始库时，仍需链接配套依赖。
:::

## 启用 Apple 扩展 {#build-with-the-apple-extension}

```bash
VERSION=1.2.4 bash command/build_ios_coreml.sh --jobs 4
```

该命令启用 `ISF_ENABLE_APPLE_EXTENSION`，在 `build/inspireface-apple-coreml-1.2.4/` 中生成相同的真机 / 模拟器结构。CoreML 推理需要搭配 Apple 资源包；启用扩展不会自动转换 CPU 资源包。

CPU 和 CoreML 包使用相同的模块名，一个应用 target 选择其中一套，并配套使用包内的两个 XCFramework。1.2.4 Release 提供 CPU Apple 包，CoreML 版本使用这条脚本在本地构建。

## 选择 slice 和构建参数 {#select-slices-and-build-settings}

只构建真机版本时，可以直接调用统一构建脚本：

```bash
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform iphoneos --arch arm64 --backend cpu --jobs 4
```

单独的 SDK 保存在 `build/inspireface-ios-1.2.4/`。加上 `--package`，会额外生成只包含所选 slice 的 XCFramework。调试模拟器时，Apple Silicon 可用 `--platform iphonesimulator --arch arm64`，Intel 则用 `--arch x86_64`。

| Option | Meaning / default |
| --- | --- |
| `--platform` | `macosx`、`iphoneos`、`iphonesimulator`、`ios` 或 `all`；统一脚本默认 `all`。 |
| `--arch` | `arm64` 或 `x86_64`；省略时真机为 arm64，其余平台构建两种架构。 |
| `--backend` | `cpu`、`coreml` 或 `all`；统一脚本默认 `all`。 |
| `--package` | 将本次选择的 slice 打包为两个 XCFramework，各后端分别打包。 |
| `--jobs` | 并行任务数；读取 `ISF_BUILD_JOBS`，未设置时为 `4`。 |
| `--cache-root` | 增量构建缓存；读取 `ISF_APPLE_CACHE_DIR`，未设置时为 `build/apple-cache/`。 |
| `--output-root` | SDK 输出目录；默认 `build/`。 |

`build_ios.sh` 预设 `--platform ios --backend cpu --package`；`build_ios_coreml.sh` 将后端改为 `coreml`。后续参数会传给统一构建脚本。

通过环境变量设置最低 iOS 版本：

```bash
IOS_DEPLOYMENT_TARGET=14.0 VERSION=1.2.4 \
  bash command/build_ios.sh --jobs 4
```

默认请求 iOS `11.0`，实际最低版本还受架构和工具链影响，例如 arm64 模拟器从 iOS 14 起支持。最终以安装后二进制中的部署信息为准，不能将这个环境变量值视为所有 slice 的兼容性保证。

缓存与交付 SDK 分开保存，后续构建会复用依赖和 SDK 的编译结果。依赖缓存键包含 Xcode、SDK 路径、依赖提交、架构、最低系统版本及编译选项。需要全新构建时，可以换一个 `--cache-root`。安装、打包会替换输出目录中由脚本管理的内容，应用文件应放在其他目录。

## 加入 Xcode 应用 {#add-the-result-to-an-app}

1. 将 `InspireFace.xcframework` 加入应用 target。使用 Swift API 时，再加入 `InspireFaceSwift.xcframework`。
2. 两者都选择 **Do Not Embed**：iOS 真机和模拟器 slice 均为静态库。
3. Objective-C 模块导入需要启用 **Clang Modules**；在 **Other Linker Flags** 中保留 `$(inherited)` 并加入 `-ObjC`。
4. 将模型包加入 **Copy Bundle Resources**，启动 SDK 时从 bundle 解析路径。
5. 分别构建一次模拟器和真机。即使两者都是 arm64，也需要各自的平台 slice。

Objective-C 使用：

```objective-c
@import InspireFace;
```

Swift 使用：

```swift
import InspireFaceSwift
```

framework 的 module map 提供 C++ runtime、Foundation 和 CoreVideo 链接声明，Apple 扩展还加入 CoreML 和 Accelerate。手动链接 C/C++ 且不使用模块导入时，需要显式链接所需系统库；下文的安装产物检查也会验证这条路径。

原始库接入继续使用 `SDKs/iphoneos-arm64/InspireFace/include/`，并链接同一 slice 中的 `libInspireFace.a` 与 `libMNN.a`。兼容目录中的 `MNN.framework` 可替代 `libMNN.a`，两种依赖形式选其一即可，也不要将原始 SDK 和已合并的 `InspireFace.framework` 同时链接到一个 target。

Objective-C / Swift 完整示例见 [Apple API 指南](../using-with/apple.md)，相机帧处理见 [iOS 接入](../using-with/ios.md)。

## 检查架构和版本 {#inspect-architecture-and-version}

```bash
plutil -p build/inspireface-apple-1.2.4/InspireFace.xcframework/Info.plist
plutil -p build/inspireface-apple-1.2.4/InspireFaceSwift.xcframework/Info.plist
cat build/inspireface-apple-1.2.4/sdk-manifest.json
cat build/inspireface-apple-1.2.4/SDKs/iphoneos-arm64/version.txt
```

`AvailableLibraries` 列出平台、平台变体和架构；`sdk-manifest.json` 记录工具链、后端、依赖提交和二进制部署信息。`lipo` 只能显示 CPU 架构，不能单独用来区分 arm64 真机库和 arm64 模拟器库；应检查 Mach-O load commands，或运行仓库提供的校验脚本。

<details>
<summary>检查已打包的 SDK</summary>

```bash
python3 cpp/test/apple/verify_xcframeworks.py \
  --package build/inspireface-apple-1.2.4 \
  --output build/apple-package-consumers \
  --native-only
```

</details>

该脚本检查平台与架构、包内符号链接、Swift slice 是否匹配，并使用安装后的 SDK 编译 C、C++、Objective-C 和 Swift 调用程序。它还会移除预编译的 `.swiftmodule` 文件，检查公开 Swift interface 能否独立导入。对于只包含 iOS 的包，这条命令完成编译、链接检查，不会运行真机应用。

## 运行 Apple 接口测试 {#run-the-apple-interface-tests}

`--tests` 编译 Objective-C 和 Swift 接口测试；`--verify` 会同时启用这些测试、检查安装产物，并运行当前目标能够执行的测试。模型验证需要 `test_res/pack/Pikachu` 和仓库中的 `test_res/data/bulk/kun.jpg`。

要执行模拟器测试，先在 Xcode 中启动一个兼容的模拟器，再运行：

<details>
<summary>构建并测试与当前 Mac 架构一致的模拟器 slice</summary>

```bash
bash command/download_models_general.sh Pikachu
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform iphonesimulator --arch "$(uname -m)" --backend cpu \
  --verify --run-simulator --jobs 4
```

</details>

`--run-simulator` 必须与 `--verify` 同时使用。设置了 `ISF_APPLE_SIMULATOR` 时使用该模拟器，否则使用已启动的模拟器。真机版本在这里进行编译、链接检查，实际执行需要签名后的应用。CoreML 构建仍应搭配目标 Apple 模型包在设备上运行，测量实际推理表现。

## 常见构建问题 {#build-issues}

| Symptom | Check |
| --- | --- |
| 找不到 iOS SDK 或 Swift 编译器 | 当前选中的 Xcode、已安装的平台组件和 `DEVELOPER_DIR`。 |
| “Building for iOS Simulator” 却包含 iOS 对象 | 使用 XCFramework 中的模拟器 slice；arm64 真机 slice 属于另一个平台。 |
| SDK 或推理符号重复 | 使用合并后的 framework 时，移除旧的原始库及单独依赖。 |
| `No such module InspireFaceSwift` | 两个 XCFramework 都加入了 target，且来自同一套包。 |
| Swift 与核心库最低版本不一致 | 配套重建 slice，检查 `sdk-info.json` 和 framework 二进制。 |
| 模拟器测试无法启动 | 已安装并启动兼容的 runtime，slice 与模拟器 CPU 架构一致。 |
| 模型初始化失败 | 模型包的 target membership、实际路径，以及 CPU / Apple 包是否选对。 |

构建定义：[Apple 构建脚本](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/command/apple/build_sdk.py)、[XCFramework 打包](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/command/apple/package_xcframeworks.py)、[framework 配置](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/cpp/inspireface/platform/apple/CMakeLists.txt)。
