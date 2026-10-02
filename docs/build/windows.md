# Windows SDK {#windows-sdk}

Build the Windows **x64 CPU** SDK with Visual Studio 2022. It provides the C and C++ APIs, including image loading, tracking, recognition, landmarks and optional analysis. Python users can install the published Windows package directly; see [Windows integration](../using-with/windows.md).

## Prepare the tools {#prepare-the-tools}

Install Visual Studio 2022 or Build Tools 2022 with **Desktop development with C++**:

<div class="sdk-table">

| Component | Requirement |
| --- | --- |
| Compiler | MSVC v143, x64 tools |
| Platform SDK | Windows 10 or Windows 11 SDK |
| CMake | 3.20 or newer |
| Build tool | Ninja; available in the **C++ CMake tools for Windows** component |
| Shell | 64-bit PowerShell and Git |

</div>

Open **x64 Native Tools Command Prompt for VS 2022**, then run `powershell`. The script uses this environment's compiler and discovers Visual Studio's bundled CMake and Ninja when installed.

The current build entry point targets x64 CPU inference. Windows x86, ARM64, CUDA and TensorRT are outside this build configuration.

## Get the source {#get-the-source}

The Windows build entry point is currently on the Develop repository’s [`feature/win` branch](https://github.com/HyperInspire/InspireFace/tree/feature/win). Get that branch and its dependencies:

```powershell
git clone --branch feature/win --single-branch https://github.com/HyperInspire/InspireFace.git
cd InspireFace
git clone --recurse-submodules https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
```

Keep the dependencies from this checkout together. The build compiles the CPU inference and image-processing dependencies automatically; the default SDK does not require a separate OpenCV installation.

## Build a shared SDK {#build-a-shared-sdk}

For an SDK build without the test resources:

```powershell
.\command\build_windows.ps1 -SkipTests
```

This builds and installs a Release DLL, its import library, headers and CMake package. It keeps intermediate files for incremental builds:

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

`-SkipTests` disables test compilation and execution. Without it, the script requires the test resources and runs all registered CTest tests before installation; see [Run the tests](#run-the-tests).

The DLL already contains the default CPU inference dependency. For an application, copy the complete installed SDK to a stable location and follow [Link an application](../using-with/windows.md#link-an-application).

### Build options {#build-options}

<div class="sdk-table">

| Option | Default | Effect |
| --- | --- | --- |
| `-Configuration` | `Release` | Select `Release` or `Debug`. |
| `-Static` | Off | Build a static SDK and install its static inference dependency. |
| `-Samples` | Off | Build the source sample programs. |
| `-SkipTests` | Off | Omit test targets and CTest execution. |
| `-Jobs` | `4` | Number of parallel build jobs. |
| `-BuildDirectory` | Derived from configuration and linkage | Select a separate build directory. |
| `-CMakeOptions` | Empty | Pass additional CMake configuration arguments. |

</div>

```powershell
.\command\build_windows.ps1 -Static -SkipTests
.\command\build_windows.ps1 -Configuration Debug -SkipTests
.\command\build_windows.ps1 -Samples -SkipTests -Jobs 2
```

The defaults use separate `windows-x64-Release-shared`, `windows-x64-Release-static` and `windows-x64-Debug-shared` directories. Keep them separate if you supply `-BuildDirectory` too: switching configuration in an old cache can mix compiler settings, runtime libraries and dependencies.

With CMake 4, pass the compatibility setting required by older dependency policy declarations:

```powershell
.\command\build_windows.ps1 -SkipTests `
  -CMakeOptions '-DCMAKE_POLICY_VERSION_MINIMUM=3.5'
```

## Run the tests {#run-the-tests}

The tests need `test_res/pack/Pikachu` and the complete image fixtures, including video frames. From the SDK source directory, download them with PowerShell:

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

The script creates `test_res/save/video_frames`, builds the tests, runs `ctest --output-on-failure --no-tests=error`, and installs only after they pass. Run samples from a writable directory: their temporary databases and archives can use the working directory. If you set `TMPDIR` for archive operations, use a UTF-8 path.

To check the installed headers, library and CMake target independently of the SDK build tree:

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

This builds standalone C and C++ applications against the installed package. The model checks run detection on a blank image; use the [file-detection example](../using-with/windows.md#a-complete-detection-program) to inspect results on a real face image.

## Deploy or package the result {#deploy-or-package-the-result}

Release builds use the dynamic MSVC runtime. Install the Microsoft Visual C++ 2022 x64 Redistributable on the target machine and place `libInspireFace.dll` beside the application executable. Debug builds need Visual Studio's matching debug runtime and are for development.

A static SDK still needs compatible compiler and runtime settings. Use the installed `InspireFace::InspireFace` CMake target to carry its inference dependency into the final link; `-Static` does not make the application independent of the MSVC runtime.

For Python, use [Windows wheel packaging](./python.md#windows-wheel). That workflow packages a Release shared CPU SDK; models remain separate files.
