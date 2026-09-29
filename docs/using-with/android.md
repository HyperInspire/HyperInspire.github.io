# Android {#android}

Use the Android Java API for bitmap and camera input. The **1.2.4.post1** package includes native InspireFace **1.2.4**, the complete portable Java API, face capture and detection snapshots. Kotlin can call the same interfaces.

Start with a bitmap to verify model loading, then connect the camera. The [Android build chapter](../build/android.md) covers source builds and packaging. For desktop applications and services on a regular JVM, use the [Java guide](./java.md).

## Choose a package or source build {#choose-a-package-or-source-build}

Add JitPack to your dependency repositories in `settings.gradle`:

```groovy
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}
```

In the application module:

```groovy
dependencies {
    implementation 'com.github.HyperInspire:inspireface-android-sdk:v1.2.4.post1'
}
```

The leading `v` is part of the [JitPack version](https://jitpack.io/#HyperInspire/inspireface-android-sdk/v1.2.4.post1).

| Item | Included in the AAR |
| --- | --- |
| Android | API 24 or newer |
| ABI | `arm64-v8a`, `armeabi-v7a`, `x86_64` |
| Native library | One `libInspireFace.so` per ABI, including both Java API layers |
| Java | Android helpers and `com.insightface.sdk.inspireface.jni.*`; Java 8 compatible |
| Models | `Pikachu` and `Megatron` under `assets/inspireface/` |
| Shrinking | Consumer R8/ProGuard rules for JNI classes, fields and constructors |

The AAR is sufficient for an Android application; no NDK build or separate JNI adapter is needed. If upgrading an app that previously added its own SDK bridge or copied classes, remove those duplicates when switching to this package. Use the [source build](../build/android.md) when you need to modify the native SDK.

### Run the example project {#run-the-example-project}

The [Android example](https://github.com/tunmx/InspireFace-Example-Android) uses CameraX and covers photo analysis, tracking, enrollment and search. Open it in Android Studio with JDK 17 and Android SDK 35. Its Java source level is 8; the build tools use JDK 17.

With an Android device connected and USB debugging enabled, or an emulator using one of the supported ABIs:

```bash
git clone https://github.com/tunmx/InspireFace-Example-Android.git
cd InspireFace-Example-Android
./gradlew :app:assembleDebug
./gradlew :app:installDebug
```

Android Studio writes the SDK location to `local.properties`; command-line builds can use `ANDROID_HOME`. The debug APK is under `app/build/outputs/apk/debug/`. Open a photo feature first, then grant camera permission when entering a camera feature. You can also [install the demo app](../introduction.md#try-the-android-example-app) directly.

::: tip App integration
The example's `FaceEngine` manages launch, model switching and sessions. `UprightFaceCameraAnalyzer` prepares camera frames and runs analysis on a worker. Model switching waits for active sessions to close.
:::

| File or directory | Purpose |
| --- | --- |
| `app/src/main/java/.../view/FaceEngine.java` | SDK launch, session configuration and release. |
| `app/src/main/java/.../view/` | Camera analyzers and individual feature screens. |
| `gradle/libs.versions.toml` | SDK and Android library dependency versions. |
| `app/src/main/AndroidManifest.xml` | Camera declaration; the app also handles runtime permission. |

## Add the model and initialize {#add-the-model-and-initialize}

The AAR already contains `Pikachu` and `Megatron`. `GlobalLaunch(context, modelName)` copies these assets into the application's external files directory and opens the selected pack. Run launch once on the SDK worker, outside the UI thread, and keep sessions alive for the work they own.

```java
import android.content.Context;
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.CustomParameter;
import com.insightface.sdk.inspireface.base.Session;
import com.insightface.sdk.inspireface.jni.CPUEngine;

// Call on the SDK worker. Keep the returned session for subsequent frames.
public static Session openSession(Context context) {
    CPUEngine.setGlobalPowerMode(CPUEngine.PowerMode.NORMAL);
    boolean launched = Boolean.TRUE.equals(InspireFace.GlobalLaunch(
            context.getApplicationContext(), InspireFace.PIKACHU));
    if (!launched) throw new IllegalStateException("Cannot load the model pack");

    CustomParameter options = InspireFace.CreateCustomParameter();
    Session session = InspireFace.CreateSession(
            options, InspireFace.DETECT_MODE_ALWAYS_DETECT, 10, 320, -1);
    if (session == null || session.handle == 0L) {
        throw new IllegalStateException("Cannot create the face session");
    }
    return session;
}
```

To supply your own pack, place the resource **file** at `app/src/main/assets/inspireface/Pikachu`, or manage a local file and pass its path to `GlobalLaunch(String resourcePath)`. `InspireFace.ValidateResourcePack(path)` can validate an external pack before launch. See [model packs](../guides/models-and-builds.md) for downloads and compatibility.

## CPU power mode {#cpu-power-mode}

`NORMAL` is the default CPU power policy. `HIGH` and `LOW` are also available through `CPUEngine.PowerMode`; measure latency and power on the target device before changing the policy. Set it before creating sessions. It affects subsequently initialized CPU runtimes and does not change existing sessions, model thread counts or precision. Launch, reload and terminate preserve the setting; do not change it concurrently with model or session initialization.

## Detect a bitmap {#detect-a-bitmap}

This method accepts an already-created session and releases the stream even if detection fails:

```java
import android.graphics.Bitmap;
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.ImageStream;
import com.insightface.sdk.inspireface.base.MultipleFaceData;
import com.insightface.sdk.inspireface.base.Session;

public static int detectCount(Session session, Bitmap bitmap) {
    ImageStream stream = InspireFace.CreateImageStreamFromBitmap(
            bitmap, InspireFace.CAMERA_ROTATION_0);
    if (stream == null || stream.handle == 0L) {
        throw new IllegalStateException("Cannot create the image stream");
    }
    try {
        MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
        if (faces == null) throw new IllegalStateException("Face detection failed");
        for (int i = 0; i < faces.detectedNum; i++) {
            // Read faces.rects[i], faces.trackIds[i] and faces.trackCounts[i].
            // Extract features with this stream and faces.tokens[i] before releasing it.
        }
        return faces.detectedNum;
    } finally {
        InspireFace.ReleaseImageStream(stream);
    }
}
```

A count of zero is a valid result; a null result indicates a processing failure. In 1.2.4.post1, `ExecuteFaceTrack` returns independent Java arrays, including copied tokens and `trackCounts`. Feature extraction and pipeline analysis still need the matching image stream and should finish before the next frame on the same session.

When the owning worker is finished, call `InspireFace.ReleaseSession(session)`. Release all application sessions before `InspireFace.GlobalTerminate()`. Use `try/finally` for streams and sessions in Kotlin as well.

## Process camera frames {#process-camera-frames}

Create a `DETECT_MODE_LIGHT_TRACK` session once for the camera sequence. Use a single analysis executor for that session and keep frames ordered. If processing is slower than capture, drop stale frames instead of building an unbounded queue.

`CreateImageStreamFromByteBuffer` accepts `byte[]` pixels, width, height, pixel format and rotation. Convert CameraX `YUV_420_888` planes to packed NV21 using each plane's row and pixel strides. Keep the converted bytes available until processing finishes, then close the `ImageProxy` in a `finally` block.

Handle preview mirroring separately from inference orientation. [Image inputs and coordinates](../guides/image-inputs.md) describes the raw-frame and display transforms; the example's `UprightFaceCameraAnalyzer` and frame helpers show its camera-specific choices.

::: warning Finish the frame before reusing its buffer
Keep `track → pipeline / feature extraction → release stream` on the same worker. Post copied boxes and scores to the UI thread. On camera shutdown, stop incoming frames and drain the worker before releasing the session.
:::

<div class="doc-flow" aria-label="Android frame processing flow">
  <div><strong>1 · CameraX</strong><span>Acquire an ImageProxy and read plane strides.</span></div>
  <div><strong>2 · Prepare bytes</strong><span>Pack the chosen format and apply the orientation policy.</span></div>
  <div><strong>3 · Analyze</strong><span>Track, then extract features or run the pipeline on this frame.</span></div>
  <div><strong>4 · Release</strong><span>Release the stream, close ImageProxy, and publish copied results.</span></div>
</div>

The example rotates NV21 into an upright frame and creates the stream with `CAMERA_ROTATION_0`. To use SDK rotation, submit the original frame with the corresponding rotation flag and apply the matching transform to the preview.

## Optional analysis {#optional-analysis}

Build a `CustomParameter` with the features you need and pass it to session creation. For pipeline outputs, call `MultipleFacePipelineProcess` with the requested parameters and check its boolean result before reading getters such as `GetFaceQualityConfidence`.

| CustomParameter | Use it for |
| --- | --- |
| `enableRecognition(true)` | Embedding extraction and comparison. |
| `enableFaceQuality(true)` | Face quality scores. |
| `enableFacePose(true)` | Head pose in `MultipleFaceData.angles`; enable it for yaw/pitch/roll checks. |
| `enableLiveness(true)` | RGB anti-spoofing scores. |
| `enableInteractionLiveness(true)` | Eye state and temporal action signals. |
| `enableMaskDetect(true)` | Mask scores. |
| `enableFaceAttribute(true)` | Attribute category outputs. |
| `enableFaceEmotion(true)` | Emotion categories when the loaded pack provides that model. |

Dense landmarks are available from detection tokens in all three detection modes. `GetFaceDenseLandmarkFromFaceToken` decodes them; `GetFaceFiveKeyPointsFromFaceToken` provides the five alignment points. No extra JNI bridge or `enableDetectModeLandmark` flag is required for these outputs.

Only enable the options needed by the screen, and check the selected pack's model capabilities. The guides provide Android tabs for [recognition](../guides/recognition.md), [landmarks](../guides/dense-landmark.md), [liveness](../guides/liveness-detection.md) and [optional analysis](../guides/optional-analysis.md).

## Face capture {#capture-in-the-current-source}

The AAR includes `FaceCapture` and `FaceDetectionSnapshot`; both implement `AutoCloseable`. Create the capture policy once with `FaceCapture.create(session, FaceCapture.defaultConfig())`, then pass increasing frame IDs and timestamps to `update(stream, frameId, timestampMs)`. The default track-count filter needs a tracking session.

If the same detection is needed for display and capture, create a `FaceDetectionSnapshot` and pass it to `capture.update(stream, snapshot, frameId, timestampMs)`. That snapshot creation already runs tracking; avoid tracking the same frame again. `snapshot.getFaces()` returns copied Java results, including tokens and track counts.

::: warning Snapshot copies have a cost
Snapshots simplify result ownership but add copying and latency. For a single ordered camera stream, direct handle results through `Native` avoid the snapshot copy; finish consuming them before the next operation on the owner. Copied results are easier to reuse across processing steps. The Android convenience API itself also copies results into Java arrays.
:::

Capture results contain tokens and metadata, not image pixels. Retain the corresponding frame if you need a crop or a recognition feature. Close capture and snapshots before their source session. See [face capture](../guides/face-capture.md) for complete code, filters and frame retention.

## Full Java API and diagnostics {#full-java-api-and-diagnostics}

Use the Android helpers for `Bitmap`, `byte[]`, ordinary sessions and copied results. For functions closer to the C API, the same AAR provides `jni.Native`, descriptors in `jni.NativeTypes`, and constants in `jni.NativeConstants`. The [Java guide](./java.md) and the Java tabs in each feature guide use these portable bindings; they are also available on Android.

Both API layers load the same `libInspireFace.so`. Release a stream through the layer that created it: `InspireFace.ReleaseImageStream` for Android bitmap/byte-array helpers, `Native.HFReleaseImageStream` for portable streams. These layers retain input buffers differently, so do not swap their release calls.

`Native` preserves C status codes; use `InspireFaceException.check(status)` to turn a failure into an exception. Existing Android methods generally retain boolean/null failure results. New query and control helpers throw `InspireFaceException`; `CreateSessionV2`, five-point decoding and ID enumeration return null on failure.

<details>
<summary>Log the native version and diagnostics</summary>

```java
import android.util.Log;
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.InspireFaceVersion;

public static void logSdkVersion() {
    InspireFaceVersion version = InspireFace.QueryInspireFaceVersion();
    Log.i("InspireFace", "Native " + version.major + "."
            + version.minor + "." + version.patch);
    Log.i("InspireFace", "C API " + InspireFace.QueryCAPILevel());
    Log.i("InspireFace", InspireFace.QueryInspireFaceDiagnosticInformation());
}
```

</details>

The Android dependency is **1.2.4.post1**, while the native version reports **1.2.4** and the C API level is **2**. Include these values when reporting an integration problem.

## Build the native library {#build-the-native-library}

After [preparing the source and third-party dependencies](../build/source.md#develop-source), install a JDK, Python 3 and the Android NDK, then run from the SDK directory:

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
bash command/build_android.sh
```

The script builds native API 21 libraries for `arm64-v8a`, `armeabi-v7a` and `x86_64`, with the static C++ runtime. The Android AAR's minimum SDK remains 24. Headers are under `build/inspireface-android/include`, one combined library per ABI is under `lib/<abi>`, and `java/` contains the portable `inspireface.jar`, sources, manifest and consumer rules. The [Android build guide](../build/android.md) explains the output and application packaging.
