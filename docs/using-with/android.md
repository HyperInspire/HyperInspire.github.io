# Android

Use the Java wrapper for an Android application, or call the C API through your own JNI layer. Start with a bitmap to verify the SDK and model setup before adding a camera stream.

The [Android build chapter](../build/android.md) covers NDK configuration, individual ABIs, output paths and packaging Java/JNI libraries.

The [Android example project](https://github.com/HyperInspire/InspireFace/tree/master/android/InspireFaceExample) contains CameraX integration, image analysis and enrollment/search flows. You can also [install the demo app](../introduction.md#try-the-android-example-app) to see the interactions.

## Choose a package or source build

The Android example uses the `1.2.0` Java SDK dependency. When upgrading, update the Java classes, JNI implementation and native library together.

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
    implementation 'com.github.HyperInspire:inspireface-android-sdk:1.2.0'
}
```

The package provides `arm64-v8a` and `armeabi-v7a` native libraries. The example app uses compile SDK 35, minimum SDK 24 and Java 8 source compatibility.

### Run the example project

Open `android/InspireFaceExample` in Android Studio. The current project uses JDK 17 to run Gradle, Android SDK 35 and NDK `28.1.13356709` for its JNI compatibility bridge. Its Java source level is 8; that is separate from the JDK used by the build tools.

From the InspireFace repository root, with an ARM device connected and USB debugging enabled:

```bash
cd android/InspireFaceExample
./gradlew :app:assembleDebug
./gradlew :app:installDebug
```

Android Studio writes the SDK location to `local.properties`; command-line builds can use `ANDROID_HOME`. The debug APK is under `app/build/outputs/apk/debug/`. First open a photo feature to check model loading, then grant camera permission when entering a camera feature.

::: tip App integration
Use `FaceEngine` for SDK launch and session setup, and `UprightFaceCameraAnalyzer` for per-frame streams. Both are included in the example project.
:::

| File or directory | Purpose |
| --- | --- |
| `app/src/main/assets/inspireface/` | Model resources copied into app-private files for launch. |
| `app/src/main/cpp/` | The example's JNI compatibility bridge and NDK build files. |
| `cpp/inspireface/platform/jni/java/` | Additional Java wrappers included by the example's source set. |
| `app/src/main/AndroidManifest.xml` | Camera declaration; runtime permission is handled by the app. |

Use an ARM device with this AAR. For an x86 emulator or another architecture, build and package the native library and JNI layer for that target.

## Add the model and initialize

Place the `Pikachu` resource **file** in `app/src/main/assets/inspireface/Pikachu`. Obtain it from the [model pack instructions](../guides/models-and-builds.md). The context-based launcher copies the assets into the application's files area, so do the first launch on a worker thread.

```java
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.CustomParameter;
import com.insightface.sdk.inspireface.base.Session;

// context is an Android Context. Run once for the application's SDK lifetime.
boolean launched = Boolean.TRUE.equals(InspireFace.GlobalLaunch(
        context.getApplicationContext(), InspireFace.PIKACHU));
if (!launched) throw new IllegalStateException("Cannot load the model pack");

CustomParameter options = InspireFace.CreateCustomParameter();
Session session = InspireFace.CreateSession(
        options, InspireFace.DETECT_MODE_ALWAYS_DETECT, 10, 320, -1);
if (session == null || session.handle == 0L) {
    throw new IllegalStateException("Cannot create the face session");
}
```

When updating a bundled model, replace the copy in the application's files directory as well. If your application manages model files directly, pass their local path to `GlobalLaunch(String resourcePath)`.

## Detect a bitmap

This method accepts an already-created session. It releases the stream even if detection fails:

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
            // Read faces.rects[i] or run feature extraction with faces.tokens[i].
        }
        return faces.detectedNum;
    } finally {
        InspireFace.ReleaseImageStream(stream);
    }
}
```

A count of zero is a valid result. A null result indicates a processing failure and should be handled separately. Complete feature extraction and pipeline calls with the same image before releasing the stream or starting another tracking call on the session.

When the owning worker is finished, call `InspireFace.ReleaseSession(session)`. Call `InspireFace.GlobalTerminate()` only after all application sessions have been released. Kotlin can call the same Java API; use `try/finally` for the native handles as well.

## Process camera frames

Create a `DETECT_MODE_LIGHT_TRACK` session once for the camera sequence. Use a single analysis executor for that session and keep frames ordered. If processing is slower than capture, drop stale frames instead of building an unbounded queue.

`CreateImageStreamFromByteBuffer` accepts `byte[]` pixels, width, height, pixel format and rotation. Prepare the camera output in that format before creating the stream.

Convert CameraX `YUV_420_888` planes to packed NV21 using each plane's row and pixel strides. Keep the converted bytes available until processing finishes, then close the `ImageProxy` in a `finally` block.

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

## Optional analysis

Build a `CustomParameter` with the features you need, such as `.enableRecognition(true)`, `.enableFaceQuality(true)` or `.enableLiveness(true)`, and pass it to session creation. For pipeline outputs, call `MultipleFacePipelineProcess` with the requested parameters and check its boolean result before reading getters such as `GetFaceQualityConfidence`.

For dense landmarks with the 1.2.0 Java package, use the session setup in [FaceEngine](https://github.com/HyperInspire/InspireFace/blob/master/android/InspireFaceExample/app/src/main/java/com/example/inspireface_example/view/FaceEngine.java). It includes the JNI setup used by the example. The supported Java options are listed below.

| CustomParameter | Use it for |
| --- | --- |
| `enableRecognition(true)` | Embedding extraction and comparison. |
| `enableFaceQuality(true)` | Face quality; also used by the older Java demo's pose-dependent flows. |
| `enableLiveness(true)` | RGB anti-spoofing scores. |
| `enableInteractionLiveness(true)` | Eye state and temporal action signals. |
| `enableMaskDetect(true)` | Mask scores. |
| `enableFaceAttribute(true)` | Attribute category outputs. |

Start with only the options needed by the screen. Recognition consumes a selected face token directly; quality, liveness and the other pipeline outputs require a pipeline call after detection. The guides provide Android tabs for [recognition](../guides/recognition.md), [landmarks](../guides/dense-landmark.md) and [liveness](../guides/liveness-detection.md).

The [Optional analysis guide](../guides/optional-analysis.md) provides Java examples for configuring models and reading pipeline results.

## Build the native library

After [preparing the source and third-party dependencies](../build/source.md), run from the InspireFace repository root:

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
bash command/build_android.sh
```

The current script builds native API 21 libraries for `arm64-v8a`, `armeabi-v7a` and `x86_64`, with the static C++ runtime. It collects headers under `build/inspireface-android/include` and libraries under `build/inspireface-android/lib/<abi>`. An optional `VERSION` environment variable adds a suffix to the output directory.

To package these native libraries in an AAR or application, include the matching Java/JNI wrapper and one library per ABI. Remove duplicate library copies from other dependencies before packaging.

## Face capture {#capture-in-the-current-source}

`FaceCapture` and `FaceDetectionSnapshot` are available under `cpp/inspireface/platform/jni/java`. Use them with a native build that includes their capture and snapshot JNI methods.

`FaceCapture.create(session, FaceCapture.defaultConfig())` creates the policy. Feed frames with `update(stream, frameId, timestampMs)`, inspect `getResults()`, and close it before releasing its parent session. Both capture and snapshots implement `AutoCloseable`. See [face capture](../guides/face-capture.md) for candidate-image retention and timing rules.
