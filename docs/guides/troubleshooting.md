# Troubleshooting

Start from a local model file and one known image. Once that works, add optional analysis, tracking, a camera and hardware-specific preprocessing one step at a time. This keeps a loader error from becoming mixed up with an input-format problem.

## Identify the loaded SDK

The current PyPI package includes these diagnostics:

```python
import inspireface as isf

print("Python package:", isf.__version__)
print("Native SDK:", isf.version())
print("C API level:", isf.c_api_level())
print(isf.diagnostic_info())
```

Check both the Python package version and the native SDK version. If `INSPIREFACE_LIBRARY_PATH` is set, also record that path: it selects the native library in place of the one bundled with the wheel.

For the **1.2.4.post1** PyPI package, the native version is **1.2.4** and C API level is **2**. Upgrade an older installation with `python -m pip install --upgrade inspireface`. If an old library is still selected through `INSPIREFACE_LIBRARY_PATH`, remove that override to use the bundled CPU library, or update the custom library as well. Restart the Python process after either change.

## Library import or loading fails

| Symptom | Check |
| --- | --- |
| `wrong architecture`, invalid ELF or incompatible Mach-O | Match library architecture to the running process, including emulation or 32-bit Python. |
| A dependent `.so` or `.dylib` is missing | Inspect native dependencies and install the runtime required by that build. |
| A function is missing after upgrading Python files | Update the wrapper and native library together to matching builds. |
| Import works locally but fails on the device | Check libc compatibility, target ABI and packaged dependency paths. |

On Linux, `ldd /path/to/libInspireFace.so` shows dynamic dependencies. On macOS, use `otool -L /path/to/libInspireFace.dylib`.

Set `INSPIREFACE_LIBRARY_PATH` before the first import. After changing the path, restart the process to load the selected library.

## Java library or buffer errors {#java-integration-fails}

| Symptom | Check |
| --- | --- |
| `no InspireFaceJNI in java.library.path` | Set `-Djava.library.path` to the native directory at JVM startup, or set `-Dinspireface.native.path` to the absolute JNI library file. |
| A JNI method is missing or the ABI check fails | Use the JAR and native libraries from the same build, then restart the JVM. |
| The library exists but cannot load | Match its architecture to the running JVM and check its core-library dependencies. An arm64 operating system can run an x86_64 JVM. |
| `IllegalArgumentException` for a buffer | Use a writable direct `ByteBuffer`. Check `position`, `limit`, alignment and remaining bytes. `ByteBuffer.wrap(byte[])` is a heap buffer. |
| Results change after another call | Copy the required values while the result is valid, or retain an owned snapshot plus the matching pixels. Keeping a `ByteBuffer` reference alone does not retain native storage. |
| Native memory stays allocated after Java GC | Release sessions, streams, bitmaps, snapshots and capture handles explicitly. |

`Native` methods return the C status code; `InspireFaceException.check(status)` throws on failure and keeps the numeric code in `getCode()`. Log both the code and message. JNI argument validation can also throw `IllegalArgumentException` before a native call. See [Java integration](../using-with/java.md) and [Java packaging](../build/java.md).

## Android 1.2.4.post1 upgrade and packaging {#android-124-upgrade}

| Symptom | Check |
| --- | --- |
| Gradle cannot find the release | Use `com.github.HyperInspire:inspireface-android-sdk:v1.2.4.post1`, including the `v`, and add the JitPack repository. |
| Version query reports only `1.2.4` | This is the native version; the Android publication revision is `1.2.4.post1`. Log the dependency version, native version and C API level together. |
| Duplicate class / duplicate `.so` | Check old AARs, local JARs, copied Java classes and `jniLibs`. The complete AAR supplies these files; keep one matching SDK library per ABI. |
| Loading `InspireFaceJNI` fails | The current Android package loads `InspireFace`. Check for an older JAR or loader. Desktop JVMs still use a separate JNI library. |
| Debug works but a minified release fails | Keep the AAR's consumer rules. For a manually packaged JAR, configure the R8/ProGuard rules from [Android builds](../build/android.md). |
| Stream release leaves retained memory or a repeated release fails | Use `ImageStream.close()` / `InspireFace.ReleaseImageStream` for facade-created streams and `Native.HFReleaseImageStream` for Native-created streams. Do not mix them. |
| Old code reading `version.information` no longer compiles | Use `InspireFace.QueryInspireFaceDiagnosticInformation()` and read only the version fields declared on the version object. |

`Session`, `ImageStream`, `FaceCapture` and `FaceDetectionSnapshot` support explicit close. Stop workers, close capture and frame resources, then close the session. See [Android lifetimes](./arch.md#android-object-lifetimes) for copied facade results versus borrowed Native views.

## High CPU use between frames {#cpu-usage-between-frames}

First confirm that the application has stopped submitting frames and that camera workers or queues are not still looping. Current CPU inference defaults to `NORMAL`. If the app explicitly selected `HIGH`, switch to `NORMAL` before creating sessions, close old sessions and create new ones, then compare idle CPU, frame time and temperature.

`CPUEngine` does not reconfigure an initialized runtime or change model thread counts and precision. See [CPU policy](../using-with/arm.md#cpu-power-mode) for the Java, Android and C++ calls.

## Apple framework or camera integration fails {#apple-integration-fails}

| Symptom | Check |
| --- | --- |
| `No such module InspireFaceSwift` | Add both XCFrameworks from the same build to the Swift target. Check Framework Search Paths and that the package contains the target platform and architecture. |
| Linker reports iOS versus iOS Simulator | Select the simulator slice. An `arm64` device binary and an `arm64` simulator binary are different platform targets; use the XCFramework so Xcode selects the correct one. |
| Duplicate native symbols | Remove a second copy of the SDK or inference library. The new iOS `InspireFace.framework` already contains its static inference dependency. |
| macOS reports a missing framework at launch | Embed and sign both dynamic frameworks for a Swift app; check the app's Frameworks directory and runpath. For a command-line test, supply the framework directory through `-rpath`. |
| iOS framework embedding or signing fails | The new iOS frameworks are static: choose **Do Not Embed**. Keep the application target's signing configuration separate from the SDK build. |
| Pixel-buffer construction returns an error | Check the actual pixel format, bytes per row and plane layout. Repack padded BGRA rows or noncontiguous NV12 planes before using a borrowed raw stream. |
| Results change after the next frame | A borrowed pointer was retained beyond its valid scope. Copy scalar geometry for overlays; use a snapshot and retain the matching pixels for deferred processing. |
| A wrapper reports an invalid handle | Check whether it or its owner has already been closed. A strong reference to a closed wrapper does not reopen the native handle. |

Use the [iOS](../using-with/ios.md) and [macOS](../using-with/macos.md) guides for linkage settings. The [Apple API guide](../using-with/apple.md) includes complete `NSError` / Swift `throws` examples. Preserve the error domain, numeric code and message when logging a failure.

## Model launch fails

If the model download is a ZIP archive, extract it and pass the resource-pack file to the SDK. Check the file size and checksum against the download.

Then check the pack/backend pair: `Megatron_TRT` needs the TensorRT build; a `Gundam_*` pack needs the corresponding Rockchip target. On a current build, `validate_resource_pack(path)` can separate resource-format problems from later session initialization problems.

Load the model once at startup. If loading fails, record the error and correct the resource or environment before creating sessions.

## Detection returns no faces

“No face” is a successful processing result with an empty list or zero count. Check a clear upright face image first, then compare these settings:

- Pixel format: a BGR buffer labeled RGB can still look like a valid array but contain the wrong channel order.
- Rotation: avoid rotating the pixels and applying the same correction again in the SDK.
- Input storage: tightly packed rows, valid dimensions and a live buffer throughout processing.
- Face size: a distant face may need a higher supported detector level; minimum-face-size filtering can remove a detection.
- Mode: use `ALWAYS_DETECT` for unrelated still images and a tracking mode for an ordered video sequence.

Save the exact buffer submitted to the SDK as an image. Compare its colors and orientation with the camera preview, and check for padding between rows.

## Boxes or landmarks drift over the preview

Check the raw-frame to display transform. Preview center-cropping, scaling, rotation and front-camera mirroring all affect the overlay. Test a face at the center and near each edge. See [coordinates](./image-inputs.md#rotation-and-display-coordinates).

## Pipeline output is missing or unchanged

Enable the desired option at session creation and request it during pipeline processing. After the call succeeds, read the results for the enabled options.

Use tokens from the matching frame and keep the image available. In C, ordinary tracking results and some getter arrays are borrowed buffers; copy them before later calls overwrite them. [Ownership rules](./arch.md) and the [C guide](../using-with/c-cpp.md#image-buffers-and-ownership) describe each case.

## Recognition or search results look wrong

Require the intended face at enrollment, use compatible embeddings from the same model, and check `matched` before reading a search identity. An eager search can return the first qualifying match rather than the nearest one. Use exhaustive search when the nearest qualifying entry matters.

Use a cosine-similarity threshold for recognition. Detection confidence, liveness confidence and capture scores each have their own criteria. See [recognition and FeatureHub](./recognition.md) for threshold selection and model migration.

## Capture never becomes ready

Feed new frames with increasing IDs and millisecond timestamps. Inspect `reject_reasons` and `metrics.available_filters`. Check that the session can detect more than one face when the face-count filter matters, and that pose/quality filters have their required session options enabled.

If you pass snapshots, create one from each new frame so the tracker count advances with the video. Use the clip's timestamps when processing an offline video.

## Memory or latency grows over time

Reuse sessions, release streams and owned snapshots, and keep only the candidate images you need. Avoid unbounded frame queues and storing every embedding or preview bitmap by default. Stop submissions before releasing a worker's session.

When measuring memory, distinguish a stable allocator/runtime cache from a count of unreleased handles. The current Python API exposes `show_system_resource_statistics()` for the SDK's resource counters. Compare the counts after repeated create/use/release cycles.

## Where can I follow the latest SDK updates? {#follow-sdk-development}

If you need faster issue follow-up and SDK updates, follow the [develop repository](https://github.com/HyperInspire/InspireFace).

## Share a reproducible issue

Include the native version, wrapper version, model identity, platform/backend, exact error code and the smallest input or code sample that reproduces the problem. For a camera issue, include the submitted format, dimensions, strides and rotation, along with a shareable test image.

Report all issues in [InspireFace Issues](https://github.com/HyperInspire/InspireFace/issues).
