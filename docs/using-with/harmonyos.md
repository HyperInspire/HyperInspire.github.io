# HarmonyOS

The ArkTS API provides sessions, image streams, detection, landmarks, embeddings, pipeline analysis and FeatureHub through a HAR module. The **1.2.4 Release** includes a ready-to-import HAR project with its compiled native library, as well as a separate C/C++ SDK.

The [HarmonyOS build chapter](../build/harmonyos.md) covers toolchain setup, the native SDK, HAR staging and package checks.

## Get the module {#build-the-module}

Download and extract the [HarmonyOS 1.2.4 package](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-harmonyos-arm64-v8a-1.2.4.zip). The ArkTS module is under:

```text
inspireface-harmonyos-arm64-v8a-1.2.4/HarmonyOS/har
```

Import this directory as a module in DevEco Studio, or package it through your project's Hvigor workflow. It is a HAR project directory, not a finished `.har` archive. The compiled library is already at `src/main/libs/arm64-v8a/libinspireface_napi.so`; declarations are under `src/main/cpp/types/libinspireface_napi`.

The package targets **arm64-v8a**, runs CPU inference and accepts raw pixel buffers. Download a [model pack](../guides/models-and-builds.md) separately. Verify model loading and one frame on the target device before connecting the camera.

To rebuild the module, prepare the [InspireFace source dependencies](../build/source.md), install an OpenHarmony Native SDK, and run from the repository root:

```bash
OHOS_NATIVE_HOME=/path/to/native-sdk/native \
  ./command/build_harmonyos_napi.sh
```

The source build writes the same HAR project layout to:

```text
build/inspireface-harmonyos-napi-arm64-v8a/install/HarmonyOS/har
```

### Add the module to an application

1. Copy `HarmonyOS/har` from the Release package, or the installed `har` directory from a source build, into your project as an `inspireface` module. Both include the compiled `.so` and ArkTS sources.
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
