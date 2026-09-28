# macOS SDK {#macos-sdk}

macOS builds provide C/C++, Objective-C and Swift interfaces for Apple Silicon arm64 and Intel x86_64. You can build one architecture for local development, combine both into an XCFramework, or package macOS with iOS device and simulator slices.

Start with [Develop source setup](./source.md#develop-source). Ready-made packages are listed in [SDK downloads](./README.md); the commands below build the current source and run from the InspireFace repository root.

## Prepare the compiler and SDK {#prepare-the-compiler-and-sdk}

Install Xcode, CMake 3.20 or newer, Python 3 and Git. The framework build uses both the Objective-C and Swift compilers. The complete Apple package also requires Xcode's iOS SDKs.

```bash
xcode-select -p
xcodebuild -version
xcrun --sdk macosx --show-sdk-path
xcrun swiftc --version
cmake --version
python3 --version
uname -m
```

Set `DEVELOPER_DIR` when selecting a particular Xcode installation. The scripts now set the target architecture explicitly; it is no longer inferred from the shell. Executing a compiled test still requires a compatible host environment.

## Pick a script {#pick-a-script}

For a CPU build on Apple Silicon:

```bash
VERSION=1.2.4 bash command/build_macos_arm64.sh --jobs 4
```

| Architecture | Backend | Script in `command/` | Raw library |
| --- | --- | --- | --- |
| `arm64` | CPU | `build_macos_arm64.sh` | `libInspireFace.dylib` |
| `x86_64` | CPU | `build_macos_x86.sh` | `libInspireFace.dylib` |
| `arm64` | CoreML extension | `build_macos_coreml_arm64.sh` | `libInspireFace.a` + `libMNN.a` |
| `x86_64` | CoreML extension | `build_macos_coreml_x86.sh` | `libInspireFace.dylib` |

Every row also builds **dynamic** `InspireFace.framework` and `InspireFaceSwift.framework`. The CoreML arm64 raw archive being static does not make its frameworks static.

The scripts all call `command/apple/build_sdk.py`. They build their dependencies from the `3rdparty` checkout and retain incremental build files in `build/apple-cache/`. With `VERSION=1.2.4`, the installed SDK directories are:

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

`VERSION` changes the output-directory suffix. The compiled SDK and framework bundle versions come from the source version in `CMakeLists.txt`. `sdk-info.json` records the architecture, backend, dependency revision, Xcode version and binary deployment metadata.

## Build universal macOS frameworks {#build-universal-macos-frameworks}

Omit `--arch` to build both macOS architectures, and add `--package` to combine them:

```bash
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform macosx --backend cpu --package --jobs 4
```

The output at `build/inspireface-apple-1.2.4/` contains `InspireFace.xcframework`, `InspireFaceSwift.xcframework`, merged frameworks in `Frameworks/macosx/`, the original architectures in `SDKs/`, and `sdk-manifest.json`. This command includes macOS only. Use `--backend coreml` for a separate package at `build/inspireface-apple-coreml-1.2.4/`.

## Build all Apple platforms {#build-all-apple-platforms}

To create one CPU package covering macOS, iOS devices and simulators:

```bash
VERSION=1.2.4 bash command/build_apple_xcframeworks.sh --backend cpu --jobs 4
```

| Platform | Architectures | Framework linkage |
| --- | --- | --- |
| macOS | `arm64`, `x86_64` | Dynamic |
| iOS device | `arm64` | Static |
| iOS Simulator | `arm64`, `x86_64` | Static |

Without `--backend cpu`, this wrapper builds **both CPU and CoreML** and writes two separate packages. Never add both variants to the same app target: their module and framework names are identical.

The packager combines architectures within one platform, then passes separate platform frameworks to `xcodebuild -create-xcframework`. It checks that the dependency revision and Xcode toolchain match across slices. Keep a consistent source checkout, dependency checkout and toolchain when building slices separately.

::: tip Local packages and release downloads
The current source can create the new Apple packages locally. The release pipeline is configured to publish one CPU archive named `inspireface-apple-<version>.zip`; CoreML builds are separate. Check [SDK downloads](./README.md) for the assets that have actually been published.
:::

## Set architecture and deployment target {#set-architecture-and-deployment-target}

The shared driver accepts `--platform`, `--arch`, `--backend`, `--package`, `--jobs`, `--cache-root` and `--output-root`. See the [option table](./ios.md#select-slices-and-build-settings) for defaults. In particular, the driver's default backend is `all`; specify `cpu` when that is the build you need.

Set the minimum macOS version through the environment:

```bash
MACOSX_DEPLOYMENT_TARGET=14.0 VERSION=1.2.4 \
  bash command/build_macos_arm64.sh --jobs 4
```

When omitted, the selected compiler and SDK determine the minimum. The current Apple CI explicitly targets macOS 14.0 for arm64 and 15.0 for x86_64 with Xcode 16.4. These are the CI build settings, rather than a fixed minimum imposed on every source build. Test your own build on the oldest macOS version your app supports.

For a custom CMake build, this example produces the frameworks **and** a raw arm64 CoreML `.dylib`. It is useful when Python needs a shared library instead of the static raw library selected by `build_macos_coreml_arm64.sh`.

<details>
<summary>Custom arm64 CoreML shared build</summary>

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

The install root is `build/macos-arm64-coreml-shared/install/`, with the two frameworks beside `InspireFace/include/` and `InspireFace/lib/`. `ISF_BUILD_APPLE_FRAMEWORK` defaults to `OFF` in a direct CMake build; the Apple scripts turn it on. `ISF_BUILD_SHARED_LIBS` controls the raw SDK library, while macOS frameworks remain dynamic. Keep different architectures and build configurations in separate build directories.

## Link the application {#link-the-application}

### Objective-C and Swift frameworks {#objective-c-and-swift-frameworks}

Add `InspireFace.xcframework` to an Objective-C target. A Swift target using the Swift API also needs `InspireFaceSwift.xcframework`. For a macOS app, select **Embed & Sign** for the dynamic frameworks and retain the app's framework runpath. Add `-ObjC` to **Other Linker Flags**, preserving `$(inherited)`.

```objective-c
@import InspireFace;
```

```swift
import InspireFaceSwift
```

`InspireFaceSwift` re-exports the core module. You do not need a custom bridging header to use its Swift API. The inference dependency is linked into `InspireFace.framework`; do not additionally link the raw SDK or a separate inference archive into that target.

The following command-line Swift program checks the frameworks without loading a model. First build the arm64 CPU SDK with `MACOSX_DEPLOYMENT_TARGET=14.0` as shown above, then compile the program:

<details>
<summary>main.swift and compile command</summary>

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
SDK_DIR="$PWD/build/inspireface-macos-apple-silicon-arm64-1.2.4"
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

This command explicitly targets arm64 and macOS 14.0. For Intel, use the matching `SDK_DIR` and set `-target` to `x86_64-apple-macosx<minimum>`, with the minimum matching the package's binary deployment metadata. For app bundles, let Xcode copy and sign the frameworks, then test the packaged app as well as the development build. The [Apple API guide](../using-with/apple.md) covers model initialization and detection using the same Objective-C and Swift APIs.

### Raw shared SDK {#shared-sdk}

C/C++ applications and Python can continue using `InspireFace/lib/libInspireFace.dylib`. Follow the [C API](../using-with/c-cpp.md#link-the-sdk) or [C++](../using-with/cpp.md#build-the-example) build example with `INSPIREFACE_ROOT` pointing to the directory containing `include/` and `lib/`.

```bash
file build/inspireface-macos-apple-silicon-arm64-1.2.4/InspireFace/lib/libInspireFace.dylib
lipo -info build/inspireface-macos-apple-silicon-arm64-1.2.4/InspireFace/lib/libInspireFace.dylib
otool -L build/inspireface-macos-apple-silicon-arm64-1.2.4/InspireFace/lib/libInspireFace.dylib
```

The Apple framework build also sets the raw dylib's install name to `@rpath`. Configure a runpath matching the library's location in the app bundle, and include it in signing. Link the raw SDK or the framework route within an application; both contain the SDK implementation.

### Raw static CoreML SDK {#static-coreml-sdk}

`build_macos_coreml_arm64.sh` retains the raw `libInspireFace.a` and `libMNN.a` route. Link both archives, the C++ runtime, Foundation, CoreML and Accelerate. This is separate from the dynamic frameworks produced by the same command.

<details>
<summary>CMakeLists.txt for the complete C detection example</summary>

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

Use the [complete C detection program](../using-with/c-cpp.md#a-complete-detection-program) as `detect.c`, and set `INSPIREFACE_ROOT` to `build/inspireface-macos-coreml-apple-silicon-arm64-1.2.4/InspireFace`. If you enable additional inference backends in a custom build, include their system dependencies too.

## Validate the installed SDK {#validate-the-installed-sdk}

Add `--verify` to compile and run installed consumers and the Objective-C / Swift contracts. The model tests need the Pikachu resource pack and the tracked test image:

<details>
<summary>Build and verify the current Mac architecture</summary>

```bash
bash command/download_models_general.sh Pikachu
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform macosx --arch "$(uname -m)" --backend cpu \
  --verify --jobs 4
```

</details>

`--tests` only builds the contracts. `--verify` also checks C/C++ compatibility, framework imports, runtime dependencies, relocatable Swift interfaces and real model execution. Use a native slice for the straightforward local test; checking both macOS architectures with execution also requires support for running both architectures on that Mac.

`--coverage` can be added to `--verify --platform macosx`. It checks API execution coverage, then rebuilds without instrumentation before installing the SDK. To inspect an existing XCFramework package without rebuilding, use:

```bash
python3 cpp/test/apple/verify_xcframeworks.py \
  --package build/inspireface-apple-1.2.4 \
  --output build/apple-package-consumers \
  --native-only
```

This runs installed consumers for the host macOS architecture and compiles / links the other slices. Simulator execution is a separate opt-in step described in [iOS tests](./ios.md#run-the-apple-interface-tests).

## Resource packs and Python {#resource-packs-and-python}

CoreML inference requires both the Apple extension build and an Apple resource pack. Ordinary CPU packs still use the CPU backend. Set the CoreML inference mode before creating sessions when choosing CPU, GPU or ANE preferences.

Python continues to load `libInspireFace.dylib`; the Objective-C and Swift frameworks do not replace that file. Match the library architecture to the Python process. Use the CPU script's shared library or the custom CoreML shared build above, then follow [Python packaging](./python.md) for library replacement, lookup and wheel creation.

## Common build issues {#common-build-issues}

| Symptom | What to check |
| --- | --- |
| `incompatible architecture` | SDK slice, application architecture and Python / test process architecture. |
| CoreML arm64 raw output contains only `.a` | Use a direct CMake shared build for Python; the accompanying frameworks are already dynamic. |
| `No such module InspireFaceSwift` | Add both matching XCFrameworks, or both frameworks from the same installed SDK. |
| App cannot load a framework after packaging | Embed, sign and check `@rpath` relative to the final app bundle. |
| App requires a newer macOS version | Check binary deployment metadata for the SDK and every linked dependency. |
| XCFramework packaging rejects a slice | All slices must use the same backend, dependency revision, toolchain and public interfaces. |

Source: [Apple driver](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/command/apple/build_sdk.py), [framework definitions](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/cpp/inspireface/platform/apple/CMakeLists.txt), [Apple CI](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/.github/workflows/apple-sdk.yaml).
