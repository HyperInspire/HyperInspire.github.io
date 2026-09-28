# Objective-C and Swift {#objective-c-and-swift}

Use the same Apple API on iOS and macOS. Objective-C classes own the native handles; the Swift overlay adds `throws`, feature options and scoped access to borrowed results. C structs remain available when you need to work directly with buffers.

Start with the platform setup for [iOS](./ios.md) or [macOS](./macos.md). These interfaces belong to the current development SDK; an older prebuilt package may contain only the C/C++ library. See [Get and build the SDK](../build/README.md) for available downloads and source builds.

## Modules and types {#modules-and-types}

| Language | Import | Libraries |
| --- | --- | --- |
| Objective-C / Objective-C++ | `#import <InspireFace/InspireFaceApple.h>` | `InspireFace` |
| Swift | `import InspireFaceSwift` | `InspireFace` and `InspireFaceSwift` |
| C / C++ | `#include <InspireFace/inspireface.h>` | `InspireFace` |

The framework includes a Clang module and the Swift overlay includes module interfaces. An application using these modules does not need a custom bridging header. Enable ARC for Objective-C code. Use `.mm` only when the same file also contains C++.

| Objective-C | Swift | Responsibility |
| --- | --- | --- |
| `IFRuntime` | `InspireFaceRuntime` | Load the model pack and configure the process runtime. |
| `IFSession` | `FaceSession` | Detection, tracking, feature extraction and optional analysis. |
| `IFImageStream` | `ImageStream` | Describe image input; borrow pixels or retain a compatible pixel buffer. |
| `IFImageBitmap` | `ImageBitmap` | Own pixels, load files, draw and save images. |
| `IFFaceSnapshot` | `FaceSnapshot` | Own a copy of a frame's detection results. |
| `IFFeatureBuffer` | `FaceFeatureBuffer` | Own an embedding buffer and compare features. |
| `IFFeatureHub` | `FeatureHub` | Manage the process-level face database. |
| `IFCaptureSession` | `FaceCaptureSession` | Select capture candidates over a sequence. |
| `IFFaceToken` | `FaceTokenUtilities` | Copy tokens and read landmarks. |
| `IFDiagnostics` | `InspireFaceDiagnostics` | Version information, error messages and resource diagnostics. |

## Detect an image file {#a-complete-detection-example}

The following complete function launches the runtime, detects faces in a file and releases its resources on success or failure. Pass filesystem paths to a model resource file such as `Pikachu` and a JPEG or PNG image. A successful result of zero means no face was found.

This is a standalone first-run check. In an application, keep the runtime and session alive across frames; move launch and session creation into the owning worker's setup, and close them during teardown.

<details>
<summary>Complete file detection example</summary>

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL DetectFile(NSString *modelPath, NSString *imagePath,
                HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    if (![IFRuntime launchAtPath:modelPath error:error]) return NO;
    IFSession *session = nil;
    IFImageBitmap *bitmap = nil;
    IFImageStream *stream = nil;
    BOOL success = NO;
    do {
        session = [[IFSession alloc] initWithOptions:0
                                               mode:HF_DETECT_MODE_ALWAYS_DETECT
                                       maximumFaces:10
                                         pixelLevel:320
                                    framesPerSecond:-1
                                              error:error];
        if (!session) break;
        bitmap = [[IFImageBitmap alloc] initWithContentsOfFile:imagePath
                                                     channels:3 error:error];
        if (!bitmap) break;
        HFImageBitmapData pixels = {0};
        if (![bitmap getBorrowedData:&pixels error:error]) break;
        HFImageData input = {pixels.data, pixels.width, pixels.height,
                             HF_STREAM_BGR, HF_CAMERA_ROTATION_0};
        stream = [[IFImageStream alloc] initWithBorrowedData:input error:error];
        if (!stream) break;
        HFMultipleFaceData faces = {0};
        if (![session trackStream:stream borrowedResult:&faces error:error]) break;
        for (HInt32 i = 0; i < faces.detectedNum; ++i) {
            HFaceRect rect = faces.rects[i];
            NSLog(@"face %d: x=%d y=%d width=%d height=%d", i,
                  rect.x, rect.y, rect.width, rect.height);
        }
        *faceCount = faces.detectedNum;
        success = YES;
    } while (NO);
    [stream closeWithError:NULL];
    [bitmap closeWithError:NULL];
    [session closeWithError:NULL];
    [IFRuntime terminateWithError:NULL];
    return success;
}
```

@tab Swift

```swift
import Foundation
import InspireFaceSwift

func detectFile(modelPath: String, imagePath: String) throws -> Int {
    try InspireFaceRuntime.launch(path: modelPath)
    defer { try? InspireFaceRuntime.terminate() }
    let session = try FaceSession(configuration: SessionConfiguration(
        detectionMode: .alwaysDetect, maximumFaces: 10, pixelLevel: 320))
    defer { try? session.close() }
    let bitmap = try ImageBitmap(contentsOfFile: imagePath, channels: 3)
    defer { try? bitmap.close() }
    return try bitmap.withUnsafeMutablePixels { bytes, pixels in
        try ImageStream.withBorrowedBytes(
            bytes, width: pixels.width, height: pixels.height, format: .bgr
        ) { stream in
            try session.withUnsafeFaces(in: stream) { faces in
                for (index, rect) in faces.rectangles.enumerated() {
                    print("face \(index): x=\(rect.x) y=\(rect.y) " +
                          "width=\(rect.width) height=\(rect.height)")
                }
                return faces.count
            }
        }
    }
}
```

:::

</details>

The file decoder produces BGR pixels with `channels: 3`. This example borrows the bitmap's storage and consumes all face results before another tracking call. It avoids creating a second pixel copy just to construct the stream.

## Model paths and errors {#model-paths-and-errors}

Bundle the model as a resource file and resolve its real path. If it is downloaded, finish the write before launch and keep it in app-owned storage. The model file is separate from the frameworks; adding the libraries does not install a model.

Objective-C methods return `NO` or `nil` on failure and optionally populate an `NSError`. Swift imports these failures as `throws`. SDK errors use `IFErrorDomain`, with the native `HResult` in `NSError.code`. Check the return value; an old error variable is not a substitute for checking whether the current call succeeded.

::: tabs #api-language

@tab Objective-C

```objectivec
NSError *error = nil;
HInt32 count = 0;
if (!DetectFile(modelPath, imagePath, &count, &error)) {
    NSLog(@"%@ (%ld): %@", error.domain, (long)error.code, error.localizedDescription);
} else {
    NSLog(@"Detected %d faces", count);
}
```

@tab Swift

```swift
do {
    let count = try detectFile(modelPath: modelPath, imagePath: imagePath)
    print("Detected \(count) faces")
} catch {
    let failure = error as NSError
    print("\(failure.domain) (\(failure.code)): \(failure.localizedDescription)")
}
```

:::

## Pixel buffers and borrowed bytes {#pixel-buffers-and-borrowed-bytes}

The `CVPixelBuffer` initializer retains and locks the buffer until the stream closes or its storage is replaced. It does not copy pixels or remove row padding.

| Pixel format | Direct input requirement |
| --- | --- |
| BGRA / RGBA | One plane, exactly `width × 4` bytes per row. |
| 8-bit gray | One plane, exactly `width` bytes per row. |
| NV12, full or video range | Even dimensions; Y and UV rows each use `width` bytes; UV starts immediately after `width × height` Y bytes. |

Padded rows, separated NV12 planes and unsupported formats return `HERR_INVALID_IMAGE_STREAM_PARAM`. The [iOS camera example](./ios.md#camera-input-and-row-stride) includes an explicit row copy for padded BGRA. The same helper works with macOS pixel buffers.

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL CountPixelBuffer(IFSession *session, CVPixelBufferRef pixelBuffer,
                      HFRotation rotation, HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    IFImageStream *stream = [[IFImageStream alloc] initWithPixelBuffer:pixelBuffer
                                                               rotation:rotation
                                                                  error:error];
    if (!stream) return NO;
    HFMultipleFaceData faces = {0};
    BOOL success = [session trackStream:stream borrowedResult:&faces error:error];
    if (success) *faceCount = faces.detectedNum;
    [stream closeWithError:NULL];
    return success;
}
```

@tab Swift

```swift
import CoreVideo
import InspireFaceSwift

func countPixelBuffer(session: FaceSession, pixelBuffer: CVPixelBuffer,
                      rotation: ImageRotation) throws -> Int {
    let stream = try ImageStream(pixelBuffer: pixelBuffer, rotation: rotation)
    defer { try? stream.close() }
    return try session.withUnsafeFaces(in: stream) { faces in
        faces.count
    }
}
```

:::

`initWithBorrowedData:` / `ImageStream(borrowing:)` keeps a pointer, not its allocation owner. Retain the original storage until the stream closes, and do not mutate it during processing. Swift's `ImageStream.withBorrowedBytes` closes the stream before leaving its closure; keep tracking and downstream work inside that closure.

## Result ownership and cleanup {#result-ownership-and-cleanup}

| Result or resource | Validity |
| --- | --- |
| Borrowed faces and tokens | Until the session next tracks, resets or closes. |
| Borrowed embedding | Until the next feature extraction or session close. |
| Pipeline result pointers | Until the corresponding result cache is updated or the session closes. |
| Snapshot data | Until that snapshot closes; it is independent of subsequent session tracking. |
| `nativeHandle` | Borrowed from the wrapper. Never release it separately through the C API. |

::: warning Snapshot cost
A snapshot is easier to keep safely across frames, but copying its results adds latency. For ordered processing of a single camera stream, consume the session's borrowed results before the next frame. Use a snapshot when results need to outlive that processing window.
:::

ARC releases owned native resources when their wrappers deallocate. Call `close` explicitly when timing matters, such as releasing a camera buffer. A second `close` reports an invalid-handle error; it is not an idempotent operation. Close capture objects before their parent session, and close all sessions before terminating the process runtime.

## Queues and frame order {#queues-and-frame-order}

All SDK calls are synchronous. Use one serial worker per session, including tracking, pipeline processing and feature extraction. A Swift unsafe-access closure limits the intended lifetime of a view; it does not make a session safe for concurrent calls. Direct C calls through `nativeHandle` can invalidate borrowed pointers too.

For camera input, complete `track → pipeline / extraction → copy UI values → close stream` before starting the next frame. Send only owned values, such as copied rectangles and scores, to the main queue. Serialize changes to the global runtime and FeatureHub; do not reload models while other workers are processing.

## CoreML runtime modes {#coreml-runtime-modes}

Use the CoreML build and an Apple model pack, then select a mode before creating sessions. The setting does not enable CoreML in a CPU-only build or convert its models.

| Objective-C / C mode | Swift | CoreML compute units |
| --- | --- | --- |
| `HF_APPLE_COREML_INFERENCE_MODE_CPU` | `.cpu` | CPU only. |
| `HF_APPLE_COREML_INFERENCE_MODE_GPU` | `.gpu` | CPU and GPU. |
| `HF_APPLE_COREML_INFERENCE_MODE_ANE` | `.neuralEngine` | All available units: CoreML may select Neural Engine, GPU or CPU. |

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL ConfigureCoreML(NSError **error) {
    return [IFRuntime setCoreMLInferenceMode:HF_APPLE_COREML_INFERENCE_MODE_ANE
                                      error:error];
}
```

@tab Swift

```swift
import InspireFaceSwift

func configureCoreML() throws {
    try InspireFaceRuntime.setCoreMLInferenceMode(.neuralEngine)
}
```

:::

The `.neuralEngine` name does not force every operation onto that hardware. Availability and model support affect CoreML's choice. Initialize the mode on the same worker as the runtime setup; recreate sessions when changing a configuration that affects their models. See the [iOS](../build/ios.md#build-with-the-apple-extension) and [macOS](../build/macos.md#pick-a-script) build chapters for the corresponding packages.

## Continue with a feature {#continue-with-a-feature}

The feature guides provide Objective-C and Swift tabs for [tracking](../guides/tracking.md), [recognition](../guides/recognition.md), [landmarks](../guides/dense-landmark.md), [liveness](../guides/liveness-detection.md), [optional analysis](../guides/optional-analysis.md), [FeatureHub](../guides/recognition.md#store-and-search-a-gallery) and [capture](../guides/face-capture.md). Keep the same stream and current face token through all operations for a frame.
