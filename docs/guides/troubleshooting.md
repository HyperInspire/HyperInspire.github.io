# Troubleshooting

Start from a local model file and one known image. Once that works, add optional analysis, tracking, a camera and hardware-specific preprocessing one step at a time. This keeps a loader error from becoming mixed up with an input-format problem.

## Identify the loaded SDK

With the current 1.2.4 Python wrapper and matching native library:

```python
import inspireface as isf

print("Python package:", isf.__version__)
print("Native SDK:", isf.version())
print("C API level:", isf.c_api_level())
print(isf.diagnostic_info())
```

Check both the Python package version and the native SDK version. If `INSPIREFACE_LIBRARY_PATH` is set, also record that path: it selects the native library in place of the one bundled with the wheel.

The diagnostic calls above use SDK 1.2.4. For an earlier SDK, record `isf.version()` and the loaded library path.

## Library import or loading fails

| Symptom | Check |
| --- | --- |
| `wrong architecture`, invalid ELF or incompatible Mach-O | Match library architecture to the running process, including emulation or 32-bit Python. |
| A dependent `.so` or `.dylib` is missing | Inspect native dependencies and install the runtime required by that build. |
| A function is missing after upgrading Python files | Update the wrapper and native library together to matching builds. |
| Import works locally but fails on the device | Check libc compatibility, target ABI and packaged dependency paths. |

On Linux, `ldd /path/to/libInspireFace.so` shows dynamic dependencies. On macOS, use `otool -L /path/to/libInspireFace.dylib`.

Set `INSPIREFACE_LIBRARY_PATH` before the first import. After changing the path, restart the process to load the selected library.

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
