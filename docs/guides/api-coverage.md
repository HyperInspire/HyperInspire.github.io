# API coverage

Find examples by feature and API. Start with the platform guide to install and initialize the SDK, then choose your API in each feature guide's code tabs.

The examples use **InspireFace 1.2.4**, **InspireCV 1.0.2**, **Android Java SDK 1.2.4.post1**, and **HarmonyOS ArkTS SDK 1.2.4**. [Python](../using-with/python.md) uses the **1.2.4.post1 PyPI package**, including the 1.2.4 native SDK. Objective-C and Swift use the Apple frameworks built from the [1.2.4 source revision](../build/source.md). [Java (JVM)](../using-with/java.md) uses the portable JNI build from the 1.2.4 source and is listed separately from Android. The table lists the operations available through each interface.

## Feature examples by API

“Example” links to a guide with code for that API. The Android 1.2.4.post1 AAR includes both the `InspireFace` facade and the complete `jni.Native` API. Its column covers both, with each example identifying the layer it uses. A dash means the named interface does not directly expose that operation.

<div class="sdk-table api-coverage-table" role="region" aria-label="Feature examples by API" tabindex="0">

| Feature | C API | C++ | Java | Android | Python | HarmonyOS (ArkTS) | Objective-C | Swift |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Launch / Session / release | [Example](../using-with/c-cpp.md) | [Example](../using-with/cpp.md) | [Example](../using-with/java.md) | [Example](../using-with/android.md) | [Example](../using-with/python.md) | [Example](../using-with/harmonyos.md) | [Example](../using-with/apple.md) | [Example](../using-with/apple.md) |
| Detection / tracking | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) |
| Dense landmarks | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) |
| Five-point landmarks | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) |
| Quality / mask / attributes | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) |
| Pose | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) |
| Expression | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) |
| RGB liveness / actions | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) |
| Embedding / comparison | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) |
| FeatureHub | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) |
| Alignment crop | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | — | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) |
| Aligned-image extraction | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | — | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) |
| Similarity display conversion | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) |
| Detection snapshots | [Example](./face-capture.md) | [Value copy](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) |
| Face capture | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) |

| CPU power mode | — | [Example](../using-with/cpp.md#cpu-power-mode) | [Example](../using-with/java.md#cpu-power-mode) | [Example](../using-with/android.md#cpu-power-mode) | — | — | — | — |

</div>

The [Plus passive and flash demos](./liveness-detection.md#optional-plus-demos) combine mobile capture with service-side verification. Their guide covers Android capture, progress feedback and result handling.

The code tabs share the same API selector, so choosing Python, Java, Android, HarmonyOS (ArkTS), Objective-C or Swift also selects it in other groups that contain the same option. The [complete examples](./examples.md) include full programs to copy from the page; snippets in feature guides state which session, image or model setup they expect.

## Inputs, settings and deployment

| Area | Entry points | Guide |
| --- | --- | --- |
| SDK downloads and builds | Prebuilt packages, platform builds and Python native-library replacement | [Get and build the SDK](../build/README.md), [Python packaging](../build/python.md) |
| Model loading and inspection | Launch, reload, resource-pack validation and metadata | [Models and builds](./models-and-builds.md) |
| Images and buffers | File/bitmap input, raw RGB/BGR/YUV, stream updates, strides and rotation | [Image inputs](./image-inputs.md) |
| Session tuning | Detector level, minimum face size, confidence, preview size, intervals and smoothing | [Tracking](./tracking.md) |
| Memory and threads | Borrowed buffers, owned results, session reuse and worker teardown | [Architecture](./arch.md) |
| C ABI | Handles, status codes and `HFSessionConfigV2` | [C API](../using-with/c-cpp.md) |
| Java deployment | Java 8 JAR, JNI paths, process architecture, direct buffers and explicit release | [Java](../using-with/java.md), [Java packaging](../build/java.md) |
| Android deployment | 1.2.4.post1 AAR, single native library per ABI, R8, CameraX and both Java API layers | [Android](../using-with/android.md) |
| Apple APIs | Objective-C errors, Swift types, scoped views and complete detection examples | [Objective-C and Swift](../using-with/apple.md) |
| iOS deployment | Device / simulator XCFrameworks, Xcode linkage, camera buffers and CoreML | [iOS](../using-with/ios.md) |
| macOS deployment | Intel / Apple Silicon frameworks, embedding, signing and native libraries | [macOS](../using-with/macos.md) |
| HarmonyOS | HAR, ArkTS, Node-API and worker ownership | [HarmonyOS](../using-with/harmonyos.md) |
| ARM CPU | Image preprocessing, memory reuse and camera latency | [ARM deployment](../using-with/arm.md) |
| NVIDIA | TensorRT SDK, CUDA runtime and device selection | [TensorRT](../using-with/cuda.md) |
| Rockchip | SoC model packs, toolchains, RK runtime and RGA | [Rockchip](../using-with/rknpu.md), [Python on Rockchip](./python-rockchip-device.md) |
| Diagnostics | Version, error text, runtime diagnostics and resource counters | [API recipes](./api-recipes.md), [Troubleshooting](./troubleshooting.md) |
| Performance | Warm-up, timing boundaries, median/p95 and queue delay | [Performance](./benchmark-remark(updating).md) |

For parameter types, overloads and additional settings, refer to the headers and wrapper shipped with your SDK version. A Java installation includes `Native.java`, `NativeTypes.java` and `NativeConstants.java` under `sources/`, plus `api-manifest.json` listing generated functions. Every C API has a Java mapping; hardware-specific calls still depend on the native build options and runtime.

## Image processing with InspireCV {#inspirecv-scope}

InspireCV is a standalone C++ library. Its [guide](./inspirecv.md) covers Image I/O and operations, float images, Task transforms and tensors, error handling, repeated-frame memory reuse and optional CUDA processing. Its `PixelFormat`, rotation and pipeline types are separate from InspireFace's C API and `FrameProcess`.

For the full public interface, see [InspireFace C declarations](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/c_api/inspireface.h), [native C++ headers](https://github.com/HyperInspire/InspireFace/tree/master/cpp/inspireface/include/inspireface), [Objective-C header](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/cpp/inspireface/platform/apple/include/IFInspireFace.h), [Swift overlay](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/cpp/inspireface/platform/apple/swift/InspireFace.swift), [Python wrapper](https://github.com/HyperInspire/InspireFace/tree/master/python/inspireface), [HarmonyOS ArkTS exports](https://github.com/HyperInspire/InspireFace/blob/master/harmony/inspireface/src/main/ets/InspireFace.ets) and [InspireCV headers](https://github.com/tunmx/InspireCV/tree/main/include/inspirecv). Use the headers bundled with a release as the reference for its binary.

## Integration notes {#known-boundaries}

- Java `long` handles require explicit release. A result’s `ByteBuffer` can borrow native storage, so retaining the Java object does not keep that storage valid. See [Java lifetimes](./arch.md#java-object-lifetimes).
- Android 1.2.4.post1 includes capture and snapshots. Facade results own copied Java arrays and tokens; `Native` buffers retain C lifetime rules. Release streams through the API layer that created them. See [Android lifetimes](./arch.md#android-object-lifetimes).
- Copying a C++ face-result vector retains its geometry and tokens. Keep the corresponding frame pixels as well if you will extract features later.
- In ArkTS, release tracking snapshots with `session.releaseFaceResult()` and call `close()` on streams, bitmaps, capture sessions and sessions when finished. Keep each wrapper object on the worker that created it.
- The standard HarmonyOS HAR runs MNN on CPU and accepts raw image buffers. Use HarmonyOS APIs to decode files and display images.
- Objective-C and Swift wrap the native handles. ARC owns the wrapper object; borrowed face, feature and pixel pointers still have the [native lifetime limits](./arch.md#apple-object-lifetimes).
- CoreML, TensorRT, RKNN, RGA and CUDA preprocessing require their matching SDK build and runtime. Follow the target platform's deployment guide.
