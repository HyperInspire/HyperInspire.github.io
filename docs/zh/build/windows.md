# Windows SDK {#windows-sdk}

使用 Visual Studio 2022 构建 Windows **x64 CPU** SDK。它提供 C 和 C++ 接口，可用于图像读取、跟踪、识别、关键点和可选分析。Python 用户可以直接安装已发布的 Windows 包，见 [Windows 接入](../using-with/windows.md)。

## 准备工具 {#prepare-the-tools}

安装 Visual Studio 2022 或 Build Tools 2022，勾选 **使用 C++ 的桌面开发（Desktop development with C++）**：

<div class="sdk-table">

| Component | 要求 |
| --- | --- |
| Compiler | MSVC v143，x64 工具 |
| Platform SDK | Windows 10 或 Windows 11 SDK |
| CMake | 3.20 或更新版本 |
| Build tool | Ninja，可通过 **用于 Windows 的 C++ CMake 工具** 组件安装 |
| Shell | 64 位 PowerShell 和 Git |

</div>

打开 **x64 Native Tools Command Prompt for VS 2022**，再运行 `powershell`。脚本使用该环境中的编译器；安装了 Visual Studio 自带的 CMake 和 Ninja 时，会自动找到它们。

当前构建入口面向 x64 CPU 推理，不包含 Windows x86、ARM64、CUDA 或 TensorRT 配置。

## 获取源码 {#get-the-source}

Windows 构建入口目前位于 Develop 仓库的 [`feature/win` 分支](https://github.com/HyperInspire/InspireFace/tree/feature/win)。获取该分支及其依赖：

```powershell
git clone --branch feature/win --single-branch https://github.com/HyperInspire/InspireFace.git
cd InspireFace
git clone --recurse-submodules https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
```

使用当前源码配套的依赖。构建过程会编译 CPU 推理和图像处理依赖，默认 SDK 无需另行安装 OpenCV。

## 构建动态库 {#build-a-shared-sdk}

只生成 SDK、暂不准备测试资源时：

```powershell
.\command\build_windows.ps1 -SkipTests
```

命令生成并安装 Release DLL、导入库、头文件和 CMake 包，同时保留中间文件，方便后续增量编译：

```text
build/windows-x64-Release-shared/install/
  InspireFace/
    include/
      inspireface.h
      intypedef.h
      herror.h
      inspireface/
      inspirecv/
    lib/
      libInspireFace.dll
      InspireFace.lib
      cmake/InspireFace/
        InspireFaceConfig.cmake
        InspireFaceConfigVersion.cmake
  version.txt
```

`-SkipTests` 会关闭测试的编译和执行。不传此参数时，脚本要求测试资源已准备好，并在安装前运行所有已注册的 CTest 测试，见[运行测试](#run-the-tests)。

DLL 已包含默认的 CPU 推理依赖。接入应用时，将完整安装目录复制到固定位置，再按[链接应用](../using-with/windows.md#link-an-application)配置。

### 构建选项 {#build-options}

<div class="sdk-table">

| Option | Default | 作用 |
| --- | --- | --- |
| `-Configuration` | `Release` | 选择 `Release` 或 `Debug`。 |
| `-Static` | Off | 构建静态 SDK，并安装静态推理依赖。 |
| `-Samples` | Off | 编译源码中的示例程序。 |
| `-SkipTests` | Off | 不编译测试，也不运行 CTest。 |
| `-Jobs` | `4` | 并行编译任务数。 |
| `-BuildDirectory` | 按配置和链接方式生成 | 指定独立构建目录。 |
| `-CMakeOptions` | Empty | 传入额外的 CMake 配置参数。 |

</div>

```powershell
.\command\build_windows.ps1 -Static -SkipTests
.\command\build_windows.ps1 -Configuration Debug -SkipTests
.\command\build_windows.ps1 -Samples -SkipTests -Jobs 2
```

默认分别使用 `windows-x64-Release-shared`、`windows-x64-Release-static` 和 `windows-x64-Debug-shared` 目录。自行指定 `-BuildDirectory` 时也要分开，避免旧缓存混用编译选项、运行库和依赖产物。

使用 CMake 4 时，为依赖中的较早 policy 声明传入兼容设置：

```powershell
.\command\build_windows.ps1 -SkipTests `
  -CMakeOptions '-DCMAKE_POLICY_VERSION_MINIMUM=3.5'
```

## 运行测试 {#run-the-tests}

测试需要 `test_res/pack/Pikachu` 和完整的图像数据，其中包括视频帧。在 SDK 源码目录使用 PowerShell 准备：

```powershell
$testArchive = Join-Path $env:TEMP 'inspireface-test-res-lite2.zip'
Invoke-WebRequest `
  -Uri 'https://github.com/tunmx/inspireface-store/raw/main/resource/test_res-lite2.zip' `
  -OutFile $testArchive
Expand-Archive -LiteralPath $testArchive -DestinationPath . -Force
New-Item -ItemType Directory -Force .\test_res\pack | Out-Null
Invoke-WebRequest `
  -Uri 'https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Pikachu' `
  -OutFile .\test_res\pack\Pikachu
.\command\build_windows.ps1
```

脚本会创建 `test_res/save/video_frames`，编译测试，运行 `ctest --output-on-failure --no-tests=error`，通过后才安装 SDK。运行示例时，工作目录需要可写，临时数据库和归档文件可能写入这里；如为归档操作设置 `TMPDIR`，该路径须使用 UTF-8。

要确认安装后的头文件、库和 CMake target 可以脱离 SDK 构建目录使用，可运行独立接入检查：

```powershell
$sdkPackage = (Resolve-Path .\build\windows-x64-Release-shared\install\InspireFace\lib\cmake\InspireFace).Path
$modelPath = (Resolve-Path .\test_res\pack\Pikachu).Path
cmake -S ci/windows/consumer -B build/windows-consumer -G Ninja `
  -DCMAKE_BUILD_TYPE=Release `
  "-DInspireFace_DIR=$sdkPackage" `
  "-DISF_CONSUMER_MODEL=$modelPath"
cmake --build build/windows-consumer --parallel 4
ctest --test-dir build/windows-consumer --output-on-failure --no-tests=error
```

这会通过安装包编译独立的 C 和 C++ 应用。模型检查使用空白图像执行检测；需要查看真实人脸结果时，运行[图像检测示例](../using-with/windows.md#a-complete-detection-program)。

## 部署与打包 {#deploy-or-package-the-result}

Release 使用动态 MSVC 运行库。目标机器需安装 Microsoft Visual C++ 2022 x64 Redistributable，并将 `libInspireFace.dll` 放在应用可执行文件旁。Debug 需要 Visual Studio 配套的调试运行库，用于开发调试。

静态 SDK 同样需要兼容的编译器和运行库设置。通过安装包提供的 `InspireFace::InspireFace` CMake target 链接，静态推理依赖会一并传入；`-Static` 不表示应用不再需要 MSVC 运行库。

需要 Python 包时，按 [Windows wheel 打包](./python.md#windows-wheel)操作。该流程使用 Release 动态 CPU SDK，模型文件单独准备。
