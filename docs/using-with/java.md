# Java {#java}

Use InspireFace from a desktop or server JVM with `inspireface.jar` and the native libraries for that machine. The JAR targets Java 8 and exposes the C API through JNI; you do not need Android classes or your own JNI implementation. The same `com.insightface.sdk.inspireface.jni` API is included in Android 1.2.4.post1; follow the [Android guide](./android.md) for its AAR or single-library packaging.

## Add the SDK {#add-the-sdk}

Build the package with the [Java build guide](../build/java.md), then locate `build/java-sdk/install/Java`. Add `inspireface.jar` to the application's classpath and keep the matching native libraries together. Model packs are separate; choose one from [Models and builds](../guides/models-and-builds.md#pick-a-resource-pack).

A macOS arm64 package has this layout:

```text
Java/
  inspireface.jar
  native/macos-arm64/
    libInspireFaceJNI.dylib
    libInspireFace.dylib
  sources/
  api-manifest.json
  examples/DetectFaces.java
```

The JAR is shared across targets. The native directory must match the **running JVM's** OS and architecture. An x86_64 JVM under Rosetta needs x86_64 libraries, even on an Apple Silicon Mac. Keep the JAR, JNI adapter and core SDK from the same build.

| Target | Native directory | JNI library | Core shared library |
| --- | --- | --- | --- |
| macOS arm64 | `native/macos-arm64` | `libInspireFaceJNI.dylib` | `libInspireFace.dylib` |
| macOS x86_64 | `native/macos-x86_64` | `libInspireFaceJNI.dylib` | `libInspireFace.dylib` |
| Linux x86_64 | `native/linux-x86_64` | `libInspireFaceJNI.so` | `libInspireFace.so` |
| Linux arm64 | `native/linux-arm64` | `libInspireFaceJNI.so` | `libInspireFace.so` |
| Windows x86_64 (custom JNI build) | `native/windows-x86_64` | `InspireFaceJNI.dll` | `libInspireFace.dll` |

These are the loader names and package paths for matching native builds. [Java packaging](../build/java.md) covers Linux and macOS. A build with a static core may contain only the shared JNI adapter.

::: warning Windows packages
The [Windows CPU SDK](./windows.md) and Windows PyPI wheel provide the native C/C++ library and Python binding, respectively. Neither includes `InspireFaceJNI.dll`. Using this Java API on Windows requires building and validating that JNI adapter separately; adding the core DLL to `java.library.path` is not enough. See [Java build scope](../build/java.md#platforms-and-backends).
:::

For a Gradle project, copy the JAR to `libs/` and add this dependency in `build.gradle`:

```groovy
dependencies {
    implementation files("libs/inspireface.jar")
}
```

Native libraries remain external files. Set the loader path on the JVM process that runs the application, including a service or application server's JVM.

## Run the first image {#run-the-first-image}

Save the complete program below as `examples/DetectFaces.java` in the Java SDK directory. From that directory, compile and run it on macOS arm64:

```bash
javac -cp inspireface.jar examples/DetectFaces.java
java -Djava.library.path=native/macos-arm64 -cp inspireface.jar:examples \
  DetectFaces /absolute/path/to/Pikachu /absolute/path/to/face.jpg
```

On Linux, replace `native/macos-arm64` with the matching `native/linux-*` directory. The classpath separator stays `:`. On Windows, use `;` and put the native directory on `PATH` as well so Windows can find dependent DLLs. If you have built a matching Windows JNI package:

```powershell
$nativeDir = (Resolve-Path native/windows-x86_64).Path
$env:PATH = "$nativeDir;$env:PATH"
javac -cp inspireface.jar examples/DetectFaces.java
java "-Djava.library.path=native/windows-x86_64" -cp "inspireface.jar;examples" DetectFaces C:\models\Pikachu C:\images\face.jpg
```

The program loads the image through the SDK, so it does not need OpenCV. It prints `Detected 0 face(s)` when processing succeeds without finding a face.

<details>
<summary>java/DetectFaces.java — Complete code</summary>

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

/**
 * Non-Android JVM example. Run from the installed Java SDK directory:
 * javac -cp inspireface.jar examples/DetectFaces.java
 * java -Djava.library.path=native/macos-arm64 -cp inspireface.jar:examples DetectFaces /path/Pikachu /path/face.jpg
 * Select the native directory matching the JVM OS/architecture; Windows uses ; in the classpath.
 */
public final class DetectFaces {
    public static void main(String[] args) {
        if (args.length != 2) throw new IllegalArgumentException("Usage: DetectFaces MODEL_FILE IMAGE_FILE");
        check(HFLaunchInspireFace(args[0]));
        long[] session = new long[1], bitmap = new long[1], stream = new long[1];
        try {
            check(HFCreateInspireFaceSessionOptional(HF_ENABLE_NONE, HF_DETECT_MODE_ALWAYS_DETECT, 10, -1, -1, session));
            check(HFCreateImageBitmapFromFilePath(args[1], 3, bitmap));
            HFImageBitmapData pixels = new HFImageBitmapData();
            check(HFImageBitmapGetData(bitmap[0], pixels));
            HFImageData input = new HFImageData();
            input.data = pixels.data; input.width = pixels.width; input.height = pixels.height;
            input.format = HF_STREAM_BGR; input.rotation = HF_CAMERA_ROTATION_0;
            check(HFCreateImageStream(input, stream)); // Borrows pixels; keep bitmap alive.
            HFMultipleFaceData faces = new HFMultipleFaceData();
            check(HFExecuteFaceTrack(session[0], stream[0], faces));
            System.out.println("Detected " + faces.detectedNum + " face(s)");
            for (HFaceRect rect : faces.rects) {
                System.out.printf("x=%d y=%d width=%d height=%d%n", rect.x, rect.y, rect.width, rect.height);
            }
        } finally {
            if (stream[0] != 0) HFReleaseImageStream(stream[0]);
            if (bitmap[0] != 0) HFReleaseImageBitmap(bitmap[0]);
            if (session[0] != 0) HFReleaseInspireFaceSession(session[0]);
            HFTerminateInspireFace();
        }
    }
}
```

</details>

`HFLaunchInspireFace` takes the path to the model file, not its containing directory. File decoding with three channels produces BGR pixels. The program keeps the bitmap alive while the stream borrows its pixels, then releases the stream before the bitmap.

For a camera or a batch of files, launch once and keep a session alive across frames. Complete each frame's tracking and analysis before processing the next frame on that session.

### Select a native library explicitly {#select-a-native-library-explicitly}

`java.library.path` names a directory. Alternatively, `inspireface.native.path` accepts the **absolute path to the JNI library file**:

```bash
java -Dinspireface.native.path=/absolute/path/to/libInspireFaceJNI.so \
  -cp inspireface.jar:examples DetectFaces /absolute/path/to/Pikachu /absolute/path/to/face.jpg
```

Use the `.dylib` or `.dll` filename on other systems. This property selects `InspireFaceJNI`, not the core `InspireFace` library. Dependent libraries must still be loadable. Set the property before the first SDK call and restart the JVM when replacing a library. At initialization, the binding checks that the JAR and JNI library have matching API layouts.

## API names and output parameters {#api-names-and-output-parameters}

The binding keeps the C function names. Use these imports in the examples throughout the feature guides:

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;
```

| C API concept | Java representation |
| --- | --- |
| Functions | Static methods in `Native` |
| Structs | Nested classes in `NativeTypes` |
| Options, enums and error constants | `NativeConstants` |
| Resource handle | `long`; a creation call writes it into `long[1]` |
| Scalar output | `int[1]`, `long[1]` or `float[1]`, according to the method signature |
| Native pixel, token or numeric buffer | Direct `ByteBuffer` |
| `HResult` / `HFStatus` | `long` / `int`; `HSUCCEED` means success |

Allocate output arrays before calling the function, then read element zero after success. Creating a Java descriptor such as `new HFMultipleFaceData()` does not allocate a native session or snapshot. Unsigned native values use the same bits in Java's signed `int` or `long`.

For a versioned session configuration, `HFSessionConfigV2` initializes `structSize` and `structVersion` for the loaded library. Set the desired options and leave reserved fields at their defaults:

```java
HFSessionConfigV2 config = new HFSessionConfigV2();
config.featureMask = HF_ENABLE_FACE_RECOGNITION | HF_ENABLE_QUALITY;
config.detectMode = HF_DETECT_MODE_ALWAYS_DETECT;
config.maxDetectFaceNum = 10;
config.detectPixelLevel = -1;
config.trackByDetectModeFPS = -1;
long[] session = new long[1];
check(HFCreateInspireFaceSessionV2(config, session));
try {
    // Track images and extract features with session[0].
} finally {
    HFReleaseInspireFaceSession(session[0]);
}
```

Use `HF_ENABLE_NONE` for detection and tracking alone. Add optional flags only for features available in your model pack. `-1` selects the pack's default detector level. See [Session and tracking](../guides/tracking.md) for mode and latency choices.

## CPU power mode {#cpu-power-mode}

The current SDK defaults to `NORMAL` for CPU inference. `CPUEngine` configures the process-wide policy for Java on the JVM and Android. Call it once during application startup, before creating sessions:

```java
import com.insightface.sdk.inspireface.jni.CPUEngine;

// Run during startup, before creating sessions.
CPUEngine.setGlobalPowerMode(CPUEngine.PowerMode.NORMAL);
CPUEngine.PowerMode selected = CPUEngine.getGlobalPowerMode();
System.out.println("CPU policy: " + selected);
```

Available values are `NORMAL`, `HIGH` and `LOW`. Subsequently initialized CPU runtimes read this setting; existing runtimes, model thread counts and precision stay unchanged. Launch, reload and terminate preserve the policy. Serialize changes with session/model initialization. Compare latency, idle CPU use and temperature before choosing another mode; see [CPU policy](./arm.md#cpu-power-mode).

## Direct image buffers {#direct-image-buffers}

Use a writable direct `ByteBuffer` with enough remaining bytes. JNI honors `position()` and `limit()`; it does not rewind your input. Use native byte order when storing or reading multi-byte values such as floats. Heap buffers, read-only buffers, undersized buffers and misaligned typed slices are rejected.

This helper accepts tightly packed BGR bytes and a session that has already been created:

<details>
<summary>Process a BGR byte array</summary>

```java
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

// Add this method to a class with the SDK imports shown above.
static void detectBgr(long session, byte[] bgr, int width, int height) {
    if (width <= 0 || height <= 0) {
        throw new IllegalArgumentException("Image dimensions must be positive");
    }
    int bytes = Math.multiplyExact(Math.multiplyExact(width, height), 3);
    if (bgr.length != bytes) {
        throw new IllegalArgumentException("Expected tightly packed BGR pixels");
    }
    ByteBuffer pixels = ByteBuffer.allocateDirect(bytes).order(ByteOrder.nativeOrder());
    pixels.put(bgr);
    pixels.flip();
    HFImageData input = new HFImageData();
    input.data = pixels;
    input.width = width;
    input.height = height;
    input.format = HF_STREAM_BGR;
    input.rotation = HF_CAMERA_ROTATION_0;
    long[] stream = new long[1];
    check(HFCreateImageStream(input, stream));
    try {
        HFMultipleFaceData faces = new HFMultipleFaceData();
        check(HFExecuteFaceTrack(session, stream[0], faces));
        for (int i = 0; i < faces.detectedNum; i++) {
            HFaceRect rect = faces.rects[i];
            float confidence = faces.detConfidence.getFloat(i * Float.BYTES);
            System.out.printf("face %d: x=%d y=%d confidence=%.3f%n",
                              i, rect.x, rect.y, confidence);
        }
    } finally {
        HFReleaseImageStream(stream[0]);
    }
}
```

</details>

The helper copies the Java byte array into direct storage. If your image producer already writes a compatible direct buffer, pass that buffer directly. For a repeated stream, reuse its handle with `HFImageStreamSetBuffer`; finish processing before replacing or writing the next frame's storage. Input formats, rotation and row packing are covered in [Image inputs](../guides/image-inputs.md).

The JNI adapter retains a strong reference to a Java input buffer until the stream is released or its buffer is successfully replaced. That reference does not keep an independently allocated native bitmap alive: if `input.data` came from `HFImageBitmapGetData`, keep the bitmap handle open too.

## Results and resource lifetimes {#results-and-resource-lifetimes}

Java garbage collection does not release SDK handles. Use `try/finally` and release every successfully created resource once. Keep each session on one serial worker, including tracking, feature extraction, analysis and release. Serialize process-wide runtime and FeatureHub changes too.

| Resource or result | Lifetime |
| --- | --- |
| Stream created with borrowed pixels | Release the stream before freeing or reusing its pixel owner. |
| Current face tokens and result buffers | Consume before the session next tracks, resets or closes. |
| Feature returned by `HFFaceFeatureExtract` | Borrowed from the session; consume before the next extraction or session close. |
| Pipeline result buffers | Consume before the corresponding cache is updated or the session closes. |
| Snapshot results | Keep the snapshot open until all its borrowed views are no longer needed. |
| FeatureHub result buffers | Copy needed values before another operation replaces the result or the hub is disabled. |

Rectangle objects and copied scalar fields are Java values. A descriptor's `ByteBuffer` fields can still point to native memory, including token bytes, confidences and embeddings. Retaining the Java descriptor or duplicating a buffer does not extend that native memory's lifetime. Copy values into application-owned storage when passing results to another worker.

::: warning Snapshot cost
Snapshots make results easier to keep across frames, but copying adds latency. For ordered processing of one stream, consume the session's borrowed results before the next frame. Use a snapshot when results need to outlive that processing window, and release it with `HFReleaseFaceResultSnapshot`.
:::

`HFFaceFeature` implements `AutoCloseable` only for storage created by `HFCreateFaceFeature`. For a recognition-enabled session and a current face, use owned feature storage like this:

```java
HFFaceFeature feature = new HFFaceFeature();
check(HFCreateFaceFeature(feature));
try (HFFaceFeature ownedFeature = feature) {
    check(HFFaceFeatureExtractTo(session, stream, faces.tokens[0], ownedFeature));
    float firstValue = ownedFeature.data.getFloat(0);
    System.out.println(firstValue);
}
```

Here `session` and `stream` are handles, and `faces.detectedNum` must be greater than zero. Do not call `close()` or `HFReleaseFaceFeature` on a borrowed feature returned by `HFFaceFeatureExtract` or FeatureHub. Other handles have explicit release functions; they are not `AutoCloseable` objects.

Release capture sessions before their parent session, then release streams, bitmaps and sessions before terminating the runtime. Avoid throwing from each cleanup call in a single `finally` block: one failed release should not prevent the remaining cleanup or hide the original processing error. Handle cleanup failures according to the application's logging policy.

## Errors and diagnostics {#errors-and-diagnostics}

Native methods preserve SDK status codes. Check each status directly, or call `InspireFaceException.check(status)` to throw an exception containing the SDK code and message:

```java
import com.insightface.sdk.inspireface.jni.InspireFaceException;

try {
    check(HFLaunchInspireFace(modelPath));
} catch (InspireFaceException error) {
    System.err.println("SDK status=" + error.getCode() + ": " + error.getMessage());
    throw error;
}
```

Argument checks in JNI can also throw `IllegalArgumentException`, independently of status checking. Library loading and a JAR/JNI API mismatch produce `UnsatisfiedLinkError`.

| Symptom | Check |
| --- | --- |
| `no InspireFaceJNI in java.library.path` | The directory passed to `-Djava.library.path` and its library filename. |
| Dependent library cannot be loaded | Keep the matching core library beside JNI and install backend runtime dependencies. |
| Wrong architecture / incompatible binary | The JVM architecture, native architecture and minimum OS version. |
| Java/JNI ABI mismatch | Replace the JAR and native libraries together, then restart the JVM. |
| Expected writable direct `ByteBuffer` | Direct allocation, writable state, remaining bytes and alignment. |
| Stale or invalid results after another frame | Result ownership and release order; do not reuse borrowed views across updates. |

## Continue with a feature {#continue-with-a-feature}

Choose the **Java** tab in the guides for [tracking](../guides/tracking.md), [recognition and FeatureHub](../guides/recognition.md), [landmarks](../guides/dense-landmark.md), [liveness](../guides/liveness-detection.md), [optional analysis](../guides/optional-analysis.md), [capture](../guides/face-capture.md) and [API recipes](../guides/api-recipes.md). The [API coverage index](../guides/api-coverage.md) maps these features to their entry points.
