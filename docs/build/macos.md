# macOS SDK {#macos-sdk}

macOS builds support Intel x86_64 and Apple Silicon arm64. Use the ordinary MNN build with a CPU resource pack, or enable the Apple extension for CoreML resource packs. Applications use the same C/C++ interfaces in either build.

Start with [source preparation](./source.md). For ready-made packages, see [SDK downloads](./README.md). The commands below run from the InspireFace repository root.

## Prepare the compiler and SDK {#prepare-the-compiler-and-sdk}

Install Xcode or its Command Line Tools and CMake 3.20 or newer. Check the selected tools:

```bash
xcode-select -p
xcrun --sdk macosx --show-sdk-path
clang --version
cmake --version
uname -m
```

Use an arm64 shell on Apple Silicon and an x86_64 shell on Intel. The four packaging scripts use the active compiler's architecture; their filenames do not set `CMAKE_OSX_ARCHITECTURES`. If you run under Rosetta, check the architecture before building.

## Pick a script {#pick-a-script}

| CPU | Backend | Script in `command/` | Library |
| --- | --- | --- | --- |
| Apple Silicon arm64 | MNN | `build_macos_arm64.sh` | `libInspireFace.dylib` |
| Intel x86_64 | MNN | `build_macos_x86.sh` | `libInspireFace.dylib` |
| Apple Silicon arm64 | CoreML extension | `build_macos_coreml_arm64.sh` | `libInspireFace.a` + `libMNN.a` |
| Intel x86_64 | CoreML extension | `build_macos_coreml_x86.sh` | `libInspireFace.dylib` |

Both CoreML scripts enable `ISF_ENABLE_APPLE_EXTENSION=ON`. The arm64 CoreML script additionally sets `ISF_BUILD_SHARED_LIBS=OFF`, so it produces static libraries. If you need a CoreML `.dylib` for Python, use the explicit CMake configuration below.

On Apple Silicon, build the ordinary shared SDK with:

```bash
VERSION=1.2.4 bash command/build_macos_arm64.sh
```

For another row, substitute its script name. `VERSION` adds a directory suffix; the compiled SDK version still comes from the source. With this suffix, the output directories are:

| Script | Directory under `build/` |
| --- | --- |
| `build_macos_arm64.sh` | `inspireface-macos-apple-silicon-arm64-1.2.4/` |
| `build_macos_x86.sh` | `inspireface-macos-intel-x86-64-1.2.4/` |
| `build_macos_coreml_arm64.sh` | `inspireface-macos-coreml-apple-silicon-arm64-1.2.4/` |
| `build_macos_coreml_x86.sh` | `inspireface-macos-coreml-intel-x86-64-1.2.4/` |

Each directory contains `version.txt` and `InspireFace/include/` plus `InspireFace/lib/`. The ordinary shared build compiles MNN into `libInspireFace.dylib`; the static CoreML build ships `libMNN.a` separately for the application's link step.

::: warning Packaging directory
The scripts remove intermediate files from their own output directory after installation and move the installed SDK into its place. Keep application files outside that directory. Use a separate CMake build below for incremental development.
:::

## Set architecture and deployment target {#set-architecture-and-deployment-target}

This example builds an arm64 CoreML shared SDK using the selected macOS SDK, with macOS 13.0 as the application's minimum version:

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

The SDK is installed at `build/macos-arm64-coreml-shared/install/InspireFace`. Adjust the deployment target to your application's supported macOS versions and test on the oldest one. The packaging scripts leave the SDK selection and deployment target to the build environment.

For Intel, use `CMAKE_OSX_ARCHITECTURES=x86_64` and a separate build directory. For an ordinary CPU SDK, set `ISF_ENABLE_APPLE_EXTENSION=OFF`. For static linkage, set `ISF_BUILD_SHARED_LIBS=OFF`. Keep one architecture and one library type per build directory.

## Link the application {#link-the-application}

### Shared SDK {#shared-sdk}

Use the [C API](../using-with/c-cpp.md#link-the-sdk) or [C++](../using-with/cpp.md#build-the-example) CMake example with `INSPIREFACE_ROOT` pointing to the directory containing `include/` and `lib/`. Check the actual file and its dependencies before copying it into your app:

```bash
file build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
lipo -info build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
otool -L build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
otool -l build/macos-arm64-coreml-shared/install/InspireFace/lib/libInspireFace.dylib
```

`otool -L` shows the install name and runtime dependencies. `otool -l` includes the minimum OS and load commands. In a packaged app, place the library in the app bundle, configure its install name and the executable's runpath for that location, and include it in your app's code-signing step. Validate loading from the packaged app as well as the build directory.

### Static CoreML SDK {#static-coreml-sdk}

The final application links both archives and the Apple frameworks. Save the [complete C detection program](../using-with/c-cpp.md#a-complete-detection-program) as `detect.c`, then use this CMake configuration beside it:

<details>
<summary>CMakeLists.txt — Static CoreML example</summary>

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

From the example directory, set the SDK path to the full path of the arm64 CoreML script's output:

```bash
cmake -S . -B build \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DINSPIREFACE_ROOT=/path/to/InspireFace/build/inspireface-macos-coreml-apple-silicon-arm64-1.2.4/InspireFace
cmake --build build --parallel 4
./build/detect_c /path/to/resource-pack /path/to/face.jpg
```

This link setup matches the script's default backend options. If you additionally enable MNN Metal or another backend, include that backend's framework or library dependencies in the application as well.

## Resource packs and Python {#resource-packs-and-python}

Enabling the Apple extension adds CoreML support; it does not convert an MNN resource pack. Use a CoreML pack for CoreML inference. Ordinary CPU packs still use the MNN backend. Set the CoreML inference mode before creating sessions when your application needs a specific CPU, GPU or ANE preference.

Python loads `libInspireFace.dylib`, so use a shared build and match the Python process architecture. An arm64 library needs an arm64 Python process, even if an x86_64 interpreter can run on the same Mac through Rosetta. The [Python packaging chapter](./python.md) covers replacement, library lookup and wheel creation.

## Common build issues {#common-build-issues}

| Symptom | What to check |
| --- | --- |
| `incompatible architecture` | Compare `lipo -info` with the application or Python process architecture. |
| CoreML build produced only `.a` files | The arm64 CoreML script builds static libraries; use `ISF_BUILD_SHARED_LIBS=ON` for a `.dylib`. |
| Undefined MNN or Objective-C symbols | For static linkage, include `libMNN.a`, the Apple frameworks and the C++ runtime. |
| App works locally but cannot load the bundled SDK | Check the dylib install name, app runpath and signing after packaging. |
| App requires a newer macOS version | Set an explicit deployment target in a fresh build directory and check all linked dependencies. |

Build definitions: [macOS scripts](https://github.com/HyperInspire/InspireFace/tree/master/command), [CoreML workflow](https://github.com/HyperInspire/InspireFace/blob/master/.github/workflows/coreml_series.yaml) and [framework and library linkage](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/CMakeLists.txt).
