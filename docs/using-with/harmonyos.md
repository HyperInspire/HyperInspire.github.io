# HarmonyOS

The ArkTS API provides sessions, image streams, detection, landmarks, embeddings, pipeline analysis and FeatureHub through a HAR module. The build and examples below use InspireFace 1.2.4.

The [HarmonyOS build chapter](../build/harmonyos.md) covers toolchain setup, the native SDK, HAR staging and package checks.

## Build the module

Prepare the [InspireFace source dependencies](../build/source.md), install an OpenHarmony Native SDK, and run from the repository root:

```bash
OHOS_NATIVE_HOME=/path/to/native-sdk/native \
  ./command/build_harmonyos_napi.sh
```

The staged HAR project is written to:

```text
build/inspireface-harmonyos-napi-arm64-v8a/install/HarmonyOS/har
```

Import that directory as a module in DevEco Studio, or package it through your project's Hvigor workflow. The native library is staged at `src/main/libs/arm64-v8a/libinspireface_napi.so`. Its declarations are under `src/main/cpp/types/libinspireface_napi`.

The standard HAR build targets **arm64-v8a** and uses **MNN CPU inference** with raw-buffer image input. Build the module locally, then validate it on your target device before connecting the application workflow.

### Add the module to an application

1. Copy the staged `har` directory into your project as an `inspireface` module. Use the installed directory from the build, since it contains the compiled `.so` as well as the ArkTS sources.
2. Register the module in the app project and add a local dependency from the entry module. For the layout `project/entry` and `project/inspireface`, the entry module's `oh-package.json5` can include:

```json
{
  "dependencies": {
    "@hyperinspire/inspireface": "file:../inspireface"
  }
}
```

3. Sync dependencies in DevEco Studio. Package `Index.ets`, the native type declarations and `src/main/libs/arm64-v8a/libinspireface_napi.so` together.
4. Put the model in an app-readable file location. If bundled as a raw resource, copy it to the app's files directory first, then pass that filesystem path to `launch`.

::: tip Verify packaging before camera integration
Use a small, known RGBA frame for the first call. Confirm `width × height × 4` bytes, the model path and native-library packaging on an arm64 target, then connect the camera's actual format and stride handling.
:::

## Detect an RGBA frame

Copy the model pack into an application-accessible file and pass its path to `launch`. The example below receives tightly packed RGBA bytes from its caller:

```ts
import { DetectMode, Feature, ImageFormat, InspireFace, Rotation, Session }
  from '@hyperinspire/inspireface';

export function detectCount(resourcePath: string, rgba: Uint8Array,
                            width: number, height: number): number {
  InspireFace.launch(resourcePath);
  let session: Session | undefined = undefined;
  try {
    session = InspireFace.createSession({
      featureMask: Feature.NONE,
      detectMode: DetectMode.ALWAYS_DETECT,
      maxFaces: 5
    });
    const image = InspireFace.createImageStream(
      rgba, width, height, ImageFormat.RGBA, Rotation.DEGREE_0);
    try {
      const faces = session.track(image);
      try {
        return faces.detectedNum;
      } finally {
        session.releaseFaceResult(faces);
      }
    } finally {
      image.close();
    }
  } finally {
    if (session !== undefined) session.close();
    InspireFace.terminate();
  }
}
```

For video, move launch and session creation outside the frame loop. Use a tracking mode, feed one sequence per session and release each result after the matching pipeline or feature-extraction calls.

## Ownership and workers

| Object | Responsibility |
| --- | --- |
| `ImageStream` | Copies input bytes on creation. Close it after processing. |
| `ImageBitmap` | Owns bitmap storage. Call `close()` when finished. |
| Result from `Session.track()` | Owns a detection snapshot. Release with `session.releaseFaceResult(result)`. |
| `Session` | Holds inference and tracking state. Call `close()` after processing finishes. |

The methods are synchronous. Run processing on a worker and keep each session and its native handles on that worker. Retain the matching frame pixels alongside a detection snapshot if you need feature extraction or pipeline analysis later.

## Analysis and a gallery

Create the session with a feature mask, such as `Feature.QUALITY | Feature.LIVENESS`, then call `session.processPipeline(image, faces)` with the result from the matching frame. Check the face count before indexing output arrays.

FeatureHub uses `bigint` IDs for the native signed 64-bit range. Keep IDs as `bigint` throughout the application, for example `1001n`.

## Feature examples {#feature-examples}

Choose the **HarmonyOS** tab in these guides. The examples use the ArkTS objects exported by `@hyperinspire/inspireface`.

| Task | ArkTS entry points | Guide |
| --- | --- | --- |
| Tracking and session settings | `Session.track`, `configure`, `clearTracking` | [Tracking](../guides/tracking.md) |
| Dense and five-point landmarks | `getDenseLandmarks`, `getFiveKeyPoints` | [Landmarks](../guides/dense-landmark.md) |
| Quality, mask, attributes and expression | `Session.processPipeline`, `detectFaceQuality` | [Face analysis](../guides/optional-analysis.md) |
| RGB liveness and actions | `Session.processPipeline` | [Liveness](../guides/liveness-detection.md) |
| Embeddings and a gallery | `Session.extractFeature`, `compareFeatures`, `FeatureHub` | [Recognition](../guides/recognition.md) |
| Capture and detection snapshots | `FaceCaptureSession`, `Session.releaseFaceResult` | [Face capture](../guides/face-capture.md) |
| Aligned images, scores and diagnostics | `getFaceAlignmentImage`, `similarityToPercentage`, `getDiagnosticInformation` | [API recipes](../guides/api-recipes.md) |

See the [ArkTS declarations](https://github.com/HyperInspire/InspireFace/blob/master/harmony/inspireface/src/main/ets/InspireFace.ets) for all exported types. [Image inputs](../guides/image-inputs.md) covers formats and rotation; [session architecture](../guides/arch.md) explains runtime and worker lifetime.
