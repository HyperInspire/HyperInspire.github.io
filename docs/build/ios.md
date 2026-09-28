# Build for iOS {#build-for-ios}

The Apple build now includes **Objective-C and Swift interfaces**, an arm64 device build, and arm64 / x86_64 simulator builds. The main outputs are `InspireFace.xcframework` and `InspireFaceSwift.xcframework`. Xcode selects the matching platform and architecture when you add them to an app.

`InspireFace` contains the C API and Objective-C classes; `InspireFaceSwift` adds the Swift API. Existing C/C++ applications can keep using the headers and archives under `SDKs/`. For a ready-made package, see [SDK downloads](./README.md); for application code, see [Objective-C and Swift](../using-with/apple.md).

## Prepare Xcode and dependencies {#prepare-xcode-and-dependencies}

Complete [Develop source setup](./source.md#develop-source) on a Mac, then install Xcode with the iOS SDK, CMake 3.20 or newer, Python 3 and Git. The scripts also use Xcode's Swift compiler, `libtool`, `lipo` and `xcodebuild`. Check the active toolchain:

```bash
xcode-select -p
xcodebuild -version
xcrun --sdk iphoneos --show-sdk-path
xcrun --sdk iphonesimulator --show-sdk-path
xcrun swiftc --version
cmake --version
python3 --version
```

With several Xcode installations, choose one for the current terminal:

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

Run the following commands from the InspireFace repository root. Dependencies are built from the `3rdparty` checkout for each target; the old download into `.macos_cache/MNN.framework` is no longer used. Keep the initialized dependency checkout available for offline builds.

## Build the CPU XCFrameworks {#build-the-standard-framework}

```bash
VERSION=1.2.4 bash command/build_ios.sh --jobs 4
```

This builds the following slices and packages both interfaces:

| SDK | Architectures | Framework linkage |
| --- | --- | --- |
| `iphoneos` | `arm64` | Static |
| `iphonesimulator` | `arm64`, `x86_64` | Static |

The result is placed in `build/inspireface-apple-1.2.4/`. Despite the directory name, this command includes only iOS device and simulator slices. Add macOS with the [complete Apple build](./macos.md#build-all-apple-platforms).

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

`Frameworks/` contains the merged frameworks for each platform. `SDKs/` retains individual architectures with their frameworks, C/C++ headers, raw libraries, `version.txt` and `sdk-info.json`. The iOS raw-library directories also include the dependency archive and a compatibility `MNN.framework`.

`VERSION` adds an output-directory suffix; it does not change the SDK version compiled from `CMakeLists.txt`. Framework bundle versions now use that source version as well. Omit `VERSION` to produce `build/inspireface-apple/`.

::: tip Updating an existing iOS integration
The new static `InspireFace.framework` already contains its inference dependency. When moving to the XCFramework route, remove the separately linked `MNN.framework` and raw `libInspireFace.a` from that target. The raw-library route still needs its matching dependency.
:::

## Build with the Apple extension {#build-with-the-apple-extension}

```bash
VERSION=1.2.4 bash command/build_ios_coreml.sh --jobs 4
```

This enables `ISF_ENABLE_APPLE_EXTENSION` and produces the same device / simulator layout at `build/inspireface-apple-coreml-1.2.4/`. Use an Apple resource pack for CoreML inference. Enabling the extension does not convert a CPU resource pack.

CPU and CoreML packages have the same module names. Select one package per app target, and keep its two XCFrameworks together. Local scripts can build and package both variants; the current release workflow publishes the CPU Apple package.

## Select slices and build settings {#select-slices-and-build-settings}

For a device-only build, call the shared driver directly:

```bash
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform iphoneos --arch arm64 --backend cpu --jobs 4
```

This leaves the individual SDK in `build/inspireface-ios-1.2.4/`. Add `--package` when you also want an XCFramework containing only the selected slices. A simulator-only iteration can use `--platform iphonesimulator --arch arm64` on Apple Silicon, or `--arch x86_64` on Intel.

| Option | Meaning / default |
| --- | --- |
| `--platform` | `macosx`, `iphoneos`, `iphonesimulator`, `ios` or `all`; the driver defaults to `all`. |
| `--arch` | `arm64` or `x86_64`; omitted means arm64 devices and both architectures elsewhere. |
| `--backend` | `cpu`, `coreml` or `all`; the driver defaults to `all`. |
| `--package` | Assemble the selected slices into two XCFrameworks, separately for each backend. |
| `--jobs` | Parallel jobs; `ISF_BUILD_JOBS`, otherwise `4`. |
| `--cache-root` | Incremental build cache; `ISF_APPLE_CACHE_DIR`, otherwise `build/apple-cache/`. |
| `--output-root` | SDK output directory; defaults to `build/`. |

`build_ios.sh` supplies `--platform ios --backend cpu --package`; `build_ios_coreml.sh` supplies the same arguments with `--backend coreml`. Extra command-line arguments are passed to the driver.

Set the minimum iOS version through the environment:

```bash
IOS_DEPLOYMENT_TARGET=14.0 VERSION=1.2.4 \
  bash command/build_ios.sh --jobs 4
```

The default requested target is iOS `11.0`. The actual minimum also depends on the architecture and toolchain: arm64 simulator binaries start at iOS 14. Read the installed binary metadata instead of treating the environment value as a guarantee for every slice.

The cache is separate from the distributable SDK. Builds reuse dependency and SDK objects; the dependency cache key includes Xcode, SDK path, dependency revision, architecture, deployment target and build options. Use another `--cache-root` when you need a clean build. Keep application files outside the output directories, whose managed contents are replaced during installation and packaging.

## Add the result to an app {#add-the-result-to-an-app}

1. Add `InspireFace.xcframework` to the app target. Swift code also needs `InspireFaceSwift.xcframework`.
2. Select **Do Not Embed** for both: the iOS device and simulator slices are static.
3. Enable **Clang Modules** for Objective-C imports and add `-ObjC` to **Other Linker Flags**, preserving `$(inherited)`.
4. Add the model pack to **Copy Bundle Resources** and resolve its path from the bundle when launching the SDK.
5. Build once for a simulator and once for a physical device. These use separate platform slices, even when both are arm64.

The Objective-C module imports with:

```objective-c
@import InspireFace;
```

The Swift module imports with:

```swift
import InspireFaceSwift
```

The framework module map supplies the C++ runtime, Foundation and CoreVideo dependencies, with CoreML and Accelerate added for the extension. For a manual C/C++ link without module imports, link the required system libraries explicitly; the installed-consumer check below exercises that route too.

For an existing raw-library integration, use `SDKs/iphoneos-arm64/InspireFace/include/` and link `libInspireFace.a` with `libMNN.a` from the same SDK slice. The compatibility `MNN.framework` can substitute for `libMNN.a`. Do not add both dependency forms or mix the raw SDK with the combined `InspireFace.framework` in one target.

See the [Apple API guide](../using-with/apple.md) for complete Objective-C / Swift examples, and [iOS integration](../using-with/ios.md) for camera-frame handling.

## Inspect architecture and version {#inspect-architecture-and-version}

```bash
plutil -p build/inspireface-apple-1.2.4/InspireFace.xcframework/Info.plist
plutil -p build/inspireface-apple-1.2.4/InspireFaceSwift.xcframework/Info.plist
cat build/inspireface-apple-1.2.4/sdk-manifest.json
cat build/inspireface-apple-1.2.4/SDKs/iphoneos-arm64/version.txt
```

`AvailableLibraries` lists the platform, platform variant and architectures. `sdk-manifest.json` records the toolchain, backend, dependency revision and binary deployment metadata. `lipo` reports CPU architectures but cannot by itself distinguish an arm64 device archive from an arm64 simulator archive; inspect Mach-O load commands or run the supplied validator.

<details>
<summary>Validate an already packaged SDK</summary>

```bash
python3 cpp/test/apple/verify_xcframeworks.py \
  --package build/inspireface-apple-1.2.4 \
  --output build/apple-package-consumers \
  --native-only
```

</details>

The validator checks platform / architecture matching, package-local symbolic links and matching Swift slices. It compiles installed C, C++, Objective-C and Swift consumers and verifies that the public Swift interface can be imported without the precompiled `.swiftmodule` files. For an iOS-only package, this command performs compile / link checks; it does not run a device app.

## Run the Apple interface tests {#run-the-apple-interface-tests}

`--tests` builds the Objective-C and Swift contract tests. `--verify` enables those tests, validates the installed SDK and runs the tests that can execute on the selected host. Model checks require `test_res/pack/Pikachu` and the tracked `test_res/data/bulk/kun.jpg` image.

To execute simulator tests, start a compatible simulator in Xcode first, then run:

<details>
<summary>Build and test the host-architecture simulator slice</summary>

```bash
bash command/download_models_general.sh Pikachu
VERSION=1.2.4 python3 command/apple/build_sdk.py \
  --platform iphonesimulator --arch "$(uname -m)" --backend cpu \
  --verify --run-simulator --jobs 4
```

</details>

`--run-simulator` requires `--verify`. It uses `ISF_APPLE_SIMULATOR` when set, otherwise a booted simulator. Device builds are compiled and linked here; running on a physical device requires a signed app. A CoreML build still needs a device run with the intended Apple model pack to measure its inference behavior.

## Build issues {#build-issues}

| Symptom | Check |
| --- | --- |
| iOS SDK or Swift compiler cannot be found | The selected Xcode, installed platform components and `DEVELOPER_DIR`. |
| “Building for iOS Simulator” with an iOS object | Use the simulator slice from the XCFramework; an arm64 device slice is a different platform. |
| Duplicate SDK or inference symbols | Remove the old raw archives / separate dependency when linking the combined framework. |
| `No such module InspireFaceSwift` | Both XCFrameworks belong to the target and come from the same package. |
| Swift and core deployment targets differ | Rebuild matching slices together; inspect `sdk-info.json` and framework binaries. |
| Simulator tests do not start | A compatible runtime is installed and booted; the slice matches its CPU architecture. |
| Model initialization fails | Bundle target membership, resolved pack path and CPU / Apple pack selection. |

Source: [Apple build driver](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/command/apple/build_sdk.py), [XCFramework assembly](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/command/apple/package_xcframeworks.py), [framework definitions](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/cpp/inspireface/platform/apple/CMakeLists.txt).
