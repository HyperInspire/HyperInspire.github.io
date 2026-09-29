# macOS {#macos}

Use Objective-C or Swift for an AppKit / SwiftUI application, or retain the C/C++ interface in an existing native program. The Apple SDK ships the same wrapper API as iOS and can package Apple Silicon and Intel in one macOS framework slice.

JVM applications use the JAR and matching `.dylib` libraries; see [Java integration](./java.md).

See [Build for macOS](../build/macos.md) for architecture selection, CPU / CoreML builds and command-line checks. The [Objective-C and Swift guide](./apple.md) contains the complete file-detection example and shared ownership rules.

## Select the package {#select-the-package}

| App | Frameworks |
| --- | --- |
| Objective-C / Objective-C++ | `InspireFace.framework` or `InspireFace.xcframework`. |
| Swift | Both `InspireFace` and `InspireFaceSwift` from the same build. |
| Existing C/C++ consumer | Keep the raw headers and library route, or use the core framework's C header. |

Use the current source build for the new interfaces if the [published download](../build/README.md) predates them. Choose the CPU package or the CoreML package as a unit: the two variants use the same module names and cannot be linked together.

A combined package can contain both `arm64` and `x86_64`; an architecture-specific build contains only the requested one. Confirm the architectures and minimum system version in `sdk-manifest.json` or the individual `sdk-info.json`. The macOS deployment target is configurable and is not fixed by the wrapper API.

## Link and embed in Xcode {#link-and-embed-in-xcode}

The macOS `InspireFace.framework` and `InspireFaceSwift.framework` are **dynamic**. Add the required XCFrameworks or macOS frameworks to the app target and select **Embed & Sign**. Preserve their `Versions/` layout when copying them manually. The CPU inference dependency is already linked into the core framework.

| Setting | Configuration |
| --- | --- |
| Framework Search Paths | Directory containing the macOS frameworks when using them directly. |
| Runpath Search Paths | Include `@executable_path/../Frameworks` for a standard macOS app bundle. |
| Other Linker Flags | Retain `$(inherited)`; `-ObjC` also works with the Apple framework integration. |
| App architecture | Match the installed framework; include both slices for a universal application. |
| Deployment target | At least the minimum recorded for every selected slice. |

Do not add a raw `libInspireFace` alongside the framework in the same executable. For a command-line tool, place the frameworks in its deployed layout and set a matching `@rpath`; a path into the SDK build cache is not a distributable runtime dependency.

## Model files and the sandbox {#model-files-and-the-sandbox}

For a bundled model, add `Pikachu` to Copy Bundle Resources and use `Bundle.main.path(forResource:ofType:)` or `NSBundle` to get its path. For an updateable model, copy or download it into the application's Application Support directory before launch. A command-line tool can accept an absolute model path as an argument.

If a sandboxed app opens a user-selected image, obtain access through the app's document or file-selection flow, and keep any security-scoped access active until the SDK has finished reading the file. Run model loading and detection on a worker queue; publish copied geometry to the main queue for drawing.

<div class="doc-flow" aria-label="macOS image processing flow">
  <div><strong>1 · Resolve files</strong><span>Locate the model and obtain access to the image.</span></div>
  <div><strong>2 · Initialize</strong><span>Launch the runtime and reuse a face session.</span></div>
  <div><strong>3 · Process</strong><span>Track, then read features or pipeline results.</span></div>
  <div><strong>4 · Present</strong><span>Copy values for the UI and release frame resources.</span></div>
</div>

The [complete detection function](./apple.md#a-complete-detection-example) runs unchanged on macOS. It uses Foundation and the SDK modules, so it does not require UIKit or a custom Swift bridge.

## Camera and pixel input {#camera-and-pixel-input}

An AVFoundation video-data callback supplies a `CMSampleBuffer`; obtain its image with `CMSampleBufferGetImageBuffer`. The [pixel-buffer example](./apple.md#pixel-buffers-and-borrowed-bytes) accepts tightly packed BGRA, RGBA, gray and contiguous NV12 buffers. If the camera adds row padding, use the [complete BGRA row-copy helper](./ios.md#camera-input-and-row-stride).

Add `NSCameraUsageDescription` to the app's Info settings. For an app with App Sandbox enabled, enable the Camera capability as well. Request user authorization before opening the capture device.

Use one serial analysis queue and one tracking session per stream. Limit queued frames, and avoid passing borrowed face pointers to another task or queue. AppKit's display coordinates, including a view's flipped state, need their own transform from the image coordinates.

## CoreML and runtime diagnostics {#coreml-and-runtime-diagnostics}

Use the CoreML build with a matching Apple model pack when evaluating Apple acceleration. Intel and Apple Silicon provide different hardware; selecting the Neural Engine mode does not imply that an Intel Mac has one. See [CoreML runtime modes](./apple.md#coreml-runtime-modes) for mode selection.

Record the SDK version, architecture, model pack and backend with a performance result. `IFDiagnostics` / `InspireFaceDiagnostics` provides version and component information; [diagnostic recipes](../guides/api-recipes.md) show how to query it. Test the final signed application on each supported architecture, in addition to compiling the framework.
