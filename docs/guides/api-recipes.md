# API recipes

These examples cover aligned face images, similarity display, runtime diagnostics and resource cleanup. Initialize a session and prepare an input image using the [language guides](../using-with/c-cpp.md) first. Native, Python and [HarmonyOS](../using-with/harmonyos.md) examples use 1.2.4; Android examples use Java SDK 1.2.0.

## Get an aligned face image

An alignment crop uses detected landmarks to place the eyes and other reference points in the recognition model's expected layout. Save it to inspect the recognition input, or pass it to a step that accepts an aligned face.

For ordinary recognition, call `face_feature_extract` / `FaceFeatureExtract` directly; it includes alignment.

::: tabs #api-language

@tab C API

Allocate `output` with `HFCreateFaceFeature` before calling this helper, and release it with `HFReleaseFaceFeature` afterwards. Keep the original stream and token valid during the call.

```c
#include <inspireface.h>
#include <stddef.h>

// session has recognition enabled; token belongs to source.
// output was allocated by HFCreateFaceFeature and remains caller-owned.
HResult extract_aligned(HFSession session, HFImageStream source,
                        HFFaceBasicToken token, HFFaceFeature output) {
    HFImageBitmap crop = NULL;
    HFImageStream aligned = NULL;
    HResult status = HFFaceGetFaceAlignmentImage(session, source, token, &crop);
    if (status != HSUCCEED) return status;
    status = HFCreateImageStreamFromImageBitmap(crop, HF_CAMERA_ROTATION_0, &aligned);
    if (status == HSUCCEED) {
        status = HFFaceFeatureExtractWithAlignmentImage(session, aligned, output);
    }
    if (aligned != NULL) HFReleaseImageStream(aligned);
    HFReleaseImageBitmap(crop);
    return status;
}
```

To save only the crop, call `HFFaceGetFaceAlignmentImage`, then `HFImageBitmapWriteToFile`, and release the bitmap. Check both return codes.

@tab C++

```cpp
#include <inspireface/inspireface.hpp>

int32_t extract_aligned(inspire::Session& session,
                        inspirecv::FrameProcess& frame,
                        inspire::FaceTrackWrap& face,
                        inspire::FaceEmbedding& embedding) {
    inspirecv::Image aligned;
    session.GetFaceAlignmentImage(frame, face, aligned);
    if (aligned.Empty()) return HERR_SESS_REC_EXTRACT_FAILURE;
    // aligned can also be inspected or saved with aligned.Write(...).
    return session.FaceFeatureExtractWithAlignmentImage(aligned, embedding);
}
```

The image and embedding own their storage. `GetFaceAlignmentImage` returns `void`, so check the output image before passing it to extraction.

@tab Android

```java
// session, stream and faces come from the same detection call.
static android.graphics.Bitmap alignedFace(
        com.insightface.sdk.inspireface.base.Session session,
        com.insightface.sdk.inspireface.base.ImageStream stream,
        com.insightface.sdk.inspireface.base.MultipleFaceData faces) {
    if (faces == null || faces.detectedNum != 1) {
        throw new IllegalArgumentException("Expected exactly one face");
    }
    android.graphics.Bitmap aligned = InspireFace.GetFaceAlignmentImage(
            session, stream, faces.tokens[0]);
    if (aligned == null) throw new IllegalStateException("Alignment failed");
    return aligned;
}
```

Import `com.insightface.sdk.inspireface.InspireFace`. Display or save the returned bitmap, and release the original `ImageStream` after processing. For recognition, call `ExtractFaceFeature(session, stream, token)`, which handles alignment and extraction together.

@tab HarmonyOS

The caller keeps a recognition-enabled `Session`, the original `ImageStream` and its detection result alive. Pass one of that result's `faces` to this helper; it closes only the crop and stream it creates.

```ts
import { ImageStream, Session, TrackedFace } from '@hyperinspire/inspireface';

function extractAligned(session: Session, image: ImageStream,
                        face: TrackedFace): Float32Array {
  const crop = session.getFaceAlignmentImage(image, face);
  try {
    const aligned = ImageStream.fromBitmap(crop);
    try {
      return session.extractFeatureFromAlignmentImage(aligned);
    } finally {
      aligned.close();
    }
  } finally {
    crop.close();
  }
}
```

Use `crop.getData()` before closing the bitmap to read its pixels, dimensions and channel count. The crop uses BGR pixels; convert them to the format expected by the application's image display or encoder. The standard HAR build uses memory-based image operations. For ordinary recognition, `session.extractFeature(image, face)` performs alignment and extraction in one call.

@tab Python

Use `session.face_feature_extract(image, face)` for recognition; it handles alignment and extraction together. For a diagnostic overlay, obtain five-point landmarks with `get_face_five_key_points`. To save the aligned image itself, use the C, C++ or Android examples above.

:::

When separating alignment from extraction, pass the SDK-generated crop to the already-aligned extractor. Keep its alignment, dimensions and pixel format unchanged.

## Convert a similarity score for display

Recognition and gallery thresholds use raw cosine similarity. The similarity converter maps this score through a configurable curve for display. Use the original cosine score for matching decisions and logging.

`outputMin` and `outputMax` set the converter's output range, which defaults to approximately 0.01–1.0. Read these settings before scaling the value for display.

::: tabs #api-language

@tab C API

```c
#include <inspireface.h>
#include <stdio.h>

HResult print_display_score(float cosine) {
    HFloat display = 0.0f;
    HFSimilarityConverterConfig config = {0};
    HResult status = HFGetCosineSimilarityConverter(&config);
    if (status != HSUCCEED) return status;
    status = HFCosineSimilarityConvertToPercentage(cosine, &display);
    if (status == HSUCCEED) {
        printf("cosine=%.4f display=%.4f range=[%.2f, %.2f]\n",
               cosine, display, config.outputMin, config.outputMax);
    }
    return status;
}
```

@tab C++

```cpp
#include <inspireface/inspireface.hpp>
#include <iostream>

void print_display_score(float cosine) {
    auto& converter = inspire::SimilarityConverter::getInstance();
    auto config = converter.getConfig();
    std::cout << "cosine=" << cosine
              << " display=" << converter.convert(cosine)
              << " range=[" << config.outputMin << ", " << config.outputMax << "]\n";
}
```

@tab Android

```java
static void printDisplayScore(float cosine) {
    com.insightface.sdk.inspireface.base.SimilarityConverterConfig config =
            InspireFace.GetCosineSimilarityConverter();
    if (config == null) throw new IllegalStateException("Converter unavailable");
    float display = InspireFace.CosineSimilarityConvertToPercentage(cosine);
    android.util.Log.i("FaceScore", "cosine=" + cosine + " display=" + display
            + " range=[" + config.outputMin + ", " + config.outputMax + "]");
}
```

@tab HarmonyOS

```ts
import { InspireFace } from '@hyperinspire/inspireface';

// cosine is the raw result of InspireFace.compareFeatures(first, second).
function printDisplayScore(cosine: number): void {
  const config = InspireFace.getSimilarityConverter();
  const display = InspireFace.similarityToPercentage(cosine);
  console.info(`cosine=${cosine} display=${display} ` +
    `range=[${config.outputMin}, ${config.outputMax}]`);
}
```

To adjust the curve during application setup, pass a `SimilarityConverterConfig` to `InspireFace.updateSimilarityConverter(config)`.

@tab Python

```python
import inspireface as isf

# cosine is the raw result of isf.feature_comparison(feature_a, feature_b).
def print_display_score(cosine):
    config = isf.get_similarity_converter_config()
    display = isf.cosine_similarity_convert_to_percentage(cosine)
    print("cosine", cosine, "display", display,
          "range", (config["outputMin"], config["outputMax"]))
```

:::

The curve can be configured through `HFUpdateCosineSimilarityConverter`, C++ `SimilarityConverter::updateConfig`, Java `UpdateCosineSimilarityConverter`, ArkTS `InspireFace.updateSimilarityConverter` or Python `set_similarity_converter_config`. The fields are `threshold`, `middleScore`, `steepness`, `outputMin` and `outputMax`. Configure it once during application setup. Choose the recognition threshold separately using representative matching and non-matching image pairs.

## Inspect the loaded runtime and errors

When diagnosing a deployment problem, record the loaded library version, model pack and enabled backend. Native and Python diagnostic queries work before model launch. Component states are `known` (version available), `unknown` (version unavailable) and `disabled` (backend disabled).

::: tabs #api-language

@tab C API

```c
#include <inspireface.h>
#include <stdio.h>
#include <stdlib.h>

int print_diagnostics(void) {
    HInt32 required = 0;
    HResult status = HFQueryInspireFaceDiagnosticInformation(NULL, 0, &required);
    if (status != HSUCCEED || required <= 0) return 1;
    char *text = (char *)malloc((size_t)required);
    if (text == NULL) return 1;
    status = HFQueryInspireFaceDiagnosticInformation(text, required, &required);
    if (status == HSUCCEED) puts(text);
    free(text);
    return status == HSUCCEED ? 0 : 1;
}

void print_sdk_error(HResult failure) {
    char message[256];
    HInt32 required = 0;
    HResult status = HFGetErrorMessage(failure, message, sizeof(message), &required);
    if (status == HSUCCEED) {
        fprintf(stderr, "InspireFace %ld: %s\n", (long)failure, message);
    } else {
        fprintf(stderr, "InspireFace %ld (message needs %d bytes)\n",
                (long)failure, required);
    }
}
```

The first query returns the required capacity, including the null terminator. The second query receives that capacity. `HFGetErrorMessage` also reports the required size; the helper still logs the numeric error if its local message buffer is too small.

@tab C++

```cpp
#include <inspireface/component_version.h>
#include <iostream>

void print_diagnostics() {
    std::cout << inspire::GetDiagnosticInfo() << '\n';
    auto cv = inspire::GetComponentVersion(inspire::ComponentType::INSPIRECV);
    if (cv.IsVersionKnown()) {
        std::cout << "InspireCV " << cv.GetVersionString() << '\n';
    }
}
```

For a numeric status from a C++ operation, the C `HFGetErrorMessage` helper is also available to C++ callers by including `<inspireface.h>`.

@tab Android

```java
static void printDiagnostics() {
    com.insightface.sdk.inspireface.base.InspireFaceVersion version =
            InspireFace.QueryInspireFaceVersion();
    if (version == null) throw new IllegalStateException("Version query failed");
    android.util.Log.i("FaceSDK", version.major + "." + version.minor + "."
            + version.patch + " " + version.information);
    InspireFace.SetLogLevel(InspireFace.LOG_INFO);
}
```

Java SDK 1.2.0 provides version information and log settings. Check `null` and boolean results at each call site, and include the operation and input format in the application's log.

@tab HarmonyOS

```ts
import { FaceTrackResult, ImageStream, InspireFace, LogLevel, Session }
  from '@hyperinspire/inspireface';

function printDiagnostics(): void {
  const version = InspireFace.getVersion();
  console.info(`${version.major}.${version.minor}.${version.patch} ` +
    `C API level=${InspireFace.getCapiLevel()}`);
  console.info(InspireFace.getDiagnosticInformation());
  console.info(InspireFace.getComponentVersions());
  InspireFace.setLogLevel(LogLevel.INFO);
}

// The caller owns session/image and releases the returned face result.
function detectWithContext(session: Session, image: ImageStream): FaceTrackResult {
  try {
    return session.track(image);
  } catch (error) {
    const failure = error as Error;
    console.error(`track failed: ${failure.message}`);
    throw error;
  }
}
```

The ArkTS bridge throws errors for failed operations. Keep the error message, which includes the operation and SDK error text. When working with a numeric SDK status, `InspireFace.getErrorMessage(code)` returns its description. A successful result with `detectedNum === 0` simply contains no faces.

@tab Python

```python
import inspireface as isf

print(isf.version(), "C API level", isf.c_api_level())
print(isf.diagnostic_info())
for name, component in isf.component_versions().items():
    print(name, component["state"], component["version"])

# At the application boundary, preserve the original exception.
def detect_with_context(session, image):
    try:
        return session.face_detection(image)
    except isf.InspireFaceError as error:
        print(error.error_code, error.error_name, str(error))
        raise
```

Use a matching 1.2.4 wrapper and native library for these diagnostics. Log and handle processing exceptions separately from detection results. An empty result means the call succeeded with no accepted faces.

:::

## Check resource lifetime

During development, compare resource counts before and after repeatedly opening and closing a small workload. Run the comparison with other workers paused so their live sessions do not obscure the result.

::: tabs #api-language

@tab C API

```c
#include <inspireface.h>
#include <stdio.h>

HResult print_open_handles(void) {
    HInt32 sessions = 0, streams = 0;
    HResult status = HFDeBugGetUnreleasedSessionsCount(&sessions);
    if (status != HSUCCEED) return status;
    status = HFDeBugGetUnreleasedStreamsCount(&streams);
    if (status != HSUCCEED) return status;
    printf("open sessions=%d streams=%d\n", sessions, streams);
    return HFDeBugShowResourceStatistics();
}
```

@tab C++

C++ `Session`, `Image` and the capture selector release their owned state when their scope ends. In an application that also uses the C API, the diagnostics above count active C session and stream handles. Use a memory profiler to inspect native C++ objects and GPU allocations.

@tab Android

Pair every `CreateSession` with `ReleaseSession` and every stream creation with `ReleaseImageStream`, usually in `finally`. The newer `FaceCapture` and `FaceDetectionSnapshot` classes support try-with-resources when used with their matching JNI library.

@tab HarmonyOS

Launch the model once before calling this helper. The frame is a tightly packed RGBA buffer; each call creates and closes one session, image stream and detection result.

```ts
import { DetectMode, ImageFormat, InspireFace } from '@hyperinspire/inspireface';

function checkResourceLifetime(rgba: Uint8Array, width: number, height: number): void {
  const before = InspireFace.getDebugResourceCounts();
  const session = InspireFace.createSession({ detectMode: DetectMode.ALWAYS_DETECT });
  try {
    const image = InspireFace.createImageStream(rgba, width, height, ImageFormat.RGBA);
    try {
      const faces = session.track(image);
      try {
        console.info(`faces=${faces.detectedNum}`);
      } finally {
        session.releaseFaceResult(faces);
      }
    } finally {
      image.close();
    }
  } finally {
    session.close();
    const after = InspireFace.getDebugResourceCounts();
    console.info(`sessions=${before.sessions}->${after.sessions} ` +
      `streams=${before.streams}->${after.streams}`);
    InspireFace.showDebugResourceStatistics();
  }
}
```

The counters cover sessions and streams. Also call `ImageBitmap.close()` and `FaceCaptureSession.close()` for objects you create, and release every result returned by `session.track()`. Keep a capture session inside its parent session's lifetime.

@tab Python

```python
import inspireface as isf

# Call before and after a bounded workload during development.
isf.show_system_resource_statistics()
```

Prefer context managers for sessions, streams, snapshots and capture. For longer-lived application objects, call `close()` or `release()` when the owner shuts down.

:::

The counters report active SDK handles. Measure process memory separately, including allocator caches and model memory retained by running workers. For frame-loop performance, see [benchmarking](./benchmark-remark(updating).md).
