# Build for iOS {#build-for-ios}

The iOS build produces a static `InspireFace.framework` and stages its MNN dependency. Choose the standard build for the usual model packs, or the Apple extension build for the corresponding Apple packs. Prebuilt packages are listed in [SDK downloads](./README.md).

::: warning iOS APIs
iOS integration currently requires calling the C/C++ APIs from your app. Dedicated Objective-C and Swift APIs will be available in a future release.
:::

## Prepare Xcode and dependencies {#prepare-xcode-and-dependencies}

Complete [source preparation](./source.md) on macOS and install Xcode with the iOS SDK. Use CMake 3.20–3.x for these scripts; their dependency configuration needs an additional policy setting under CMake 4. Check that the selected developer directory belongs to Xcode:

```bash
xcode-select -p
xcrun --sdk iphoneos --show-sdk-path
xcrun --find make
cmake --version
```

If several Xcode versions are installed, set `DEVELOPER_DIR` for the build shell:

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

Run build commands from the InspireFace repository root. Both scripts download the MNN `2.8.1` iOS package on the first run and keep `MNN.framework` in `.macos_cache/`. Later builds reuse that framework. An offline build can use the same framework layout prepared in this cache beforehand.

| Setting | Both scripts |
| --- | --- |
| Target | iOS physical devices, `arm64` |
| Deployment target | iOS `11.0` |
| Library | Static `InspireFace.framework` |
| Bitcode | Disabled |
| Samples and tests | Disabled |
| MNN package | `mnn_2.8.1_ios_armv82_cpu_metal_coreml.zip` |

## Build the standard framework {#build-the-standard-framework}

```bash
VERSION=1.2.4 bash command/build_ios.sh
```

`VERSION` changes the output directory suffix. The SDK's runtime version comes from the source checkout. Without `VERSION`, this script writes to `build/inspireface-ios`.

```text
build/inspireface-ios-1.2.4/
  InspireFace.framework/
    InspireFace
    Headers/
    Resources/Info.plist
  MNN.framework/
  InspireFace/
    include/
    lib/libInspireFace.a
  version.txt
```

The script installs the SDK, creates the framework and removes the intermediate build files. The framework already contains the static library; link either that framework or the raw archive, rather than adding both to the same app target.

## Build with the Apple extension {#build-with-the-apple-extension}

```bash
VERSION=1.2.4 bash command/build_ios_coreml.sh
```

This enables `ISF_ENABLE_APPLE_EXTENSION` and writes the same framework layout under `build/inspireface-ios-coreml-arm64-1.2.4/`. Without `VERSION`, the directory is `build/inspireface-ios-coreml-arm64/`.

Use an Apple resource pack with this build. The pack and selected inference backend determine which models use Apple acceleration. Keep the standard and Apple builds in separate application configurations while comparing startup time and per-frame latency on a device.

Both scripts reuse `.macos_cache/MNN.framework`. If you replace the cached dependency, record its version with the SDK build and rebuild against that dependency before updating the app.

## Add the result to an app {#add-the-result-to-an-app}

1. Copy `InspireFace.framework` and `MNN.framework` into the app's framework directory and add that directory to **Framework Search Paths**.
2. Add the frameworks under **Link Binary With Libraries**. `InspireFace.framework` contains a static archive, so select **Do Not Embed** for it.
3. Link the system dependencies for this build: Metal, CoreML, Foundation, CoreVideo and CoreMedia, plus the C++ runtime. The Apple extension also uses Accelerate.
4. Add the model pack to **Copy Bundle Resources** and use its filesystem path when launching the SDK.
5. Select a physical arm64 device and run initialization followed by one image before connecting the camera.

The [iOS integration guide](../using-with/ios.md) shows the Xcode settings, model loading and pixel-buffer conversion. Use an Objective-C++ `.mm` file when your bridge contains C++ code; Swift can call that bridge or the C API through a bridging header.

The accompanying MNN framework must match the iOS target and linkage of the package you use. Inspect it along with InspireFace before changing Xcode's embed settings.

## Inspect architecture and version {#inspect-architecture-and-version}

```bash
file build/inspireface-ios-1.2.4/InspireFace.framework/InspireFace
lipo -info build/inspireface-ios-1.2.4/InspireFace.framework/InspireFace
file build/inspireface-ios-1.2.4/MNN.framework/MNN
cat build/inspireface-ios-1.2.4/version.txt
```

The packaging script currently writes `1.0.0` into the framework's `Info.plist`. Use `version.txt` and the SDK version query to identify your actual build; setting `VERSION` only renames the output directory.

These scripts and their downloaded MNN framework target devices. A simulator build needs an iOS Simulator slice for InspireFace **and** its dependencies. An arm64 device slice cannot be used as an arm64 simulator slice. If you maintain both configurations, package their verified outputs into an XCFramework after building each target separately.

## Build issues {#build-issues}

| Symptom | Check |
| --- | --- |
| `iphoneos` SDK cannot be found | Selected Xcode installation, installed iOS SDK and `DEVELOPER_DIR`. |
| MNN download or unzip fails | Network access to the package URL in the script and the contents of `.macos_cache/`. |
| Framework header cannot be found | Framework Search Paths and the target's linked framework. |
| Undefined MNN or system symbols | Both framework dependencies and the required system frameworks are linked. |
| “Building for iOS Simulator” with an iOS object | The framework is a device build; select a physical device or supply simulator-built dependencies. |
| Model launch fails after the app builds | Resource-pack type, bundle target membership and the resolved filesystem path. |

For a new build, keep the source revision, Xcode version, dependency version and resource-pack name together. The [performance guide](../guides/benchmark-remark(updating).md) explains how to separate launch, warm-up and repeated frame processing when testing it.

Source: [standard iOS build](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_ios.sh), [Apple extension build](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_ios_coreml.sh).
