# API coverage

Find examples by feature and API. Start with the platform guide to install and initialize the SDK, then choose your API in each feature guide's code tabs.

The examples use **InspireFace 1.2.4**, **InspireCV 1.0.2**, **Android Java SDK 1.2.0**, and **HarmonyOS ArkTS SDK 1.2.4**. The table lists the operations available through each interface.

## Feature examples by API

“Example” links to a guide with code for that API. “Source API” needs the newer Java source classes and a matching JNI build. A dash means that the named high-level wrapper does not expose that operation in the version above.

<div class="sdk-table api-coverage-table" role="region" aria-label="Feature examples by API" tabindex="0">

| Feature | C API | C++ | Android | Python | HarmonyOS (ArkTS) |
| --- | --- | --- | --- | --- | --- |
| Launch / Session / release | [Example](../using-with/c-cpp.md) | [Example](../using-with/cpp.md) | [Example](../using-with/android.md) | [Example](../using-with/python.md) | [Example](../using-with/harmonyos.md) |
| Detection / tracking | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) | [Example](./tracking.md) |
| Dense landmarks | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) |
| Five-point landmarks | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) | — | [Example](./dense-landmark.md) | [Example](./dense-landmark.md) |
| Quality / mask / attributes | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) |
| Pose | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | [Quality path](./optional-analysis.md) | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) |
| Expression | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) | — | [Example](./optional-analysis.md) | [Example](./optional-analysis.md) |
| RGB liveness / actions | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) | [Example](./liveness-detection.md) |
| Embedding / comparison | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) |
| FeatureHub | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) | [Example](./recognition.md) |
| Alignment crop | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | — | [Example](./api-recipes.md) |
| Aligned-image extraction | [Example](./api-recipes.md) | [Example](./api-recipes.md) | — | — | [Example](./api-recipes.md) |
| Similarity display conversion | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) | [Example](./api-recipes.md) |
| Detection snapshots | [Example](./face-capture.md) | [Value copy](./face-capture.md) | [Source API](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) |
| Face capture | [Example](./face-capture.md) | [Example](./face-capture.md) | [Source API](./face-capture.md) | [Example](./face-capture.md) | [Example](./face-capture.md) |

</div>

The [Plus passive and flash demos](./liveness-detection.md#optional-plus-demos) combine mobile capture with service-side verification. Their guide covers Android capture, progress feedback and result handling.

The code tabs share the same API selector, so choosing Python, Android or HarmonyOS (ArkTS) also selects it in other groups that contain the same option. The [complete examples](./examples.md) include full programs to copy from the page; snippets in feature guides state which session, image or model setup they expect.

## Inputs, settings and deployment

| Area | Entry points | Guide |
| --- | --- | --- |
| SDK downloads and builds | Prebuilt packages, platform builds and Python native-library replacement | [Get and build the SDK](../build/README.md), [Python packaging](../build/python.md) |
| Model loading and inspection | Launch, reload, resource-pack validation and metadata | [Models and builds](./models-and-builds.md) |
| Images and buffers | File/bitmap input, raw RGB/BGR/YUV, stream updates, strides and rotation | [Image inputs](./image-inputs.md) |
| Session tuning | Detector level, minimum face size, confidence, preview size, intervals and smoothing | [Tracking](./tracking.md) |
| Memory and threads | Borrowed buffers, owned results, session reuse and worker teardown | [Architecture](./arch.md) |
| C ABI | Handles, status codes and `HFSessionConfigV2` | [C API](../using-with/c-cpp.md) |
| Android deployment | AAR, assets, Gradle/ABI, CameraX and JNI pairing | [Android](../using-with/android.md) |
| iOS deployment | Device frameworks, Xcode linkage, pixel buffers and CoreML | [iOS](../using-with/ios.md) |
| HarmonyOS | HAR, ArkTS, Node-API and worker ownership | [HarmonyOS](../using-with/harmonyos.md) |
| ARM CPU | Image preprocessing, memory reuse and camera latency | [ARM deployment](../using-with/arm.md) |
| NVIDIA | TensorRT SDK, CUDA runtime and device selection | [TensorRT](../using-with/cuda.md) |
| Rockchip | SoC model packs, toolchains, RK runtime and RGA | [Rockchip](../using-with/rknpu.md), [Python on Rockchip](./python-rockchip-device.md) |
| Diagnostics | Version, error text, runtime diagnostics and resource counters | [API recipes](./api-recipes.md), [Troubleshooting](./troubleshooting.md) |
| Performance | Warm-up, timing boundaries, median/p95 and queue delay | [Performance](./benchmark-remark(updating).md) |

For parameter types, overloads and additional settings, refer to the headers and wrapper shipped with your SDK version.

## Image processing with InspireCV {#inspirecv-scope}

InspireCV is a standalone C++ library. Its [guide](./inspirecv.md) covers Image I/O and operations, float images, Task transforms and tensors, error handling, repeated-frame memory reuse and optional CUDA processing. Its `PixelFormat`, rotation and pipeline types are separate from InspireFace's C API and `FrameProcess`.

For the full public interface, see [InspireFace C declarations](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/c_api/inspireface.h), [native C++ headers](https://github.com/HyperInspire/InspireFace/tree/master/cpp/inspireface/include/inspireface), [Python wrapper](https://github.com/HyperInspire/InspireFace/tree/master/python/inspireface), [HarmonyOS ArkTS exports](https://github.com/HyperInspire/InspireFace/blob/master/harmony/inspireface/src/main/ets/InspireFace.ets) and [InspireCV headers](https://github.com/tunmx/InspireCV/tree/main/include/inspirecv). These links track the source branch; a release's bundled headers remain the reference for its binary.

## Integration notes {#known-boundaries}

- For Android capture and snapshots, update the Java classes and JNI library together to the version used in the guide.
- Copying a C++ face-result vector retains its geometry and tokens. Keep the corresponding frame pixels as well if you will extract features later.
- In ArkTS, release tracking snapshots with `session.releaseFaceResult()` and call `close()` on streams, bitmaps, capture sessions and sessions when finished. Keep each wrapper object on the worker that created it.
- The standard HarmonyOS HAR runs MNN on CPU and accepts raw image buffers. Use HarmonyOS APIs to decode files and display images.
- CoreML, TensorRT, RKNN, RGA and CUDA preprocessing require their matching SDK build and runtime. Follow the target platform's deployment guide.
