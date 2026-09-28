# ARM {#arm}

InspireFace runs on ARM CPUs in mobile devices, embedded Linux systems and Apple Silicon computers. ARM optimization covers image preparation, model inference and feature comparison, while session reuse keeps repeated work out of the frame loop.

The SDK uses InspireCV for image operations such as resizing and channel conversion, with ARM NEON paths for supported formats. The CPU inference backend is also adapted to ARM instructions and compute kernels to accelerate model execution. The SDK reduces additional work in input preparation and feature comparison.

<div class="doc-flow">
<div><strong>1 · Camera input</strong><span>Pixel format, stride and orientation</span></div>
<div><strong>2 · Preprocessing</strong><span>Resize, align and prepare model inputs</span></div>
<div><strong>3 · CPU inference</strong><span>ARM-adapted model execution</span></div>
<div><strong>4 · Results</strong><span>Tracking, features and similarity</span></div>
</div>

## Image and feature operations on ARM {#image-and-feature-operations-on-arm}

The default InspireCV Image backend provides vectorized paths for supported data types and channel counts. NEON processes several values per instruction; the kernels also reduce repeated coordinate calculations and organize pixel reads and writes for common transforms.

| Operation | Implementation | Where it is useful |
| --- | --- | --- |
| Resize | Reuse precomputed horizontal sample indices and interpolation weights; use NEON in supported kernels. | Detection previews and fixed-size model inputs. |
| WarpAffine | Separate identity, scale/translation and general affine paths; vectorize supported sampling operations. | Face alignment and transformed image regions. |
| Rotate / flip | Use block transposes and vector loads/stores for supported formats. | Camera orientation and preview preparation. |
| Color conversion | Vectorized RGB/BGR exchange and grayscale conversion. | Matching the channel order needed by the next stage. |
| Feature comparison | The SDK's ARM NEON dot product processes four float components at a time. | Similarity between face embeddings. |

The image operators retain general CPU implementations for other combinations and scalar handling for the remainder of a vector block. The selected path depends on the operation, pixel type, channels and build target. The [InspireCV guide](../guides/inspirecv.md) shows the image APIs and their coordinate rules.

## Reuse work across frames {#reuse-work-across-frames}

Several SDK optimizations help ARM deployments as well as other CPU platforms:

- **Skip unnecessary resizing.** When an input already matches the model's required dimensions, the adapter uses a pixel view and skips the resize step.
- **Reuse conversion and tensor objects.** The inference adapter caches input/output host tensors and image converters, rebuilding them when the relevant shape or configuration changes.
- **Read detection outputs through views.** Detection postprocessing reads the inference output directly through borrowed views, avoiding an extra copy into intermediate vectors.
- **Keep a tracking session alive.** `LIGHT_TRACK` reuses previous-frame information and runs detection when needed. See [tracking modes and latency](../guides/tracking.md#pick-a-mode-for-the-input) for the tradeoff between frame cost and discovering new faces.

Keep the session and model alive across a video sequence. Borrowed pixels and result views still need valid storage until their consumers finish; [ownership and lifetime](../guides/arch.md) explains when to retain or copy them.

## Optional Task preprocessing {#optional-task-preprocessing}

InspireCV Task brings geometric sampling, color conversion, normalization and tensor layout into one preprocessing flow. Its general execution path works in small tiles with reusable temporary buffers, reducing the need to create a full intermediate image for every stage.

| Stage | Available work |
| --- | --- |
| Camera formats | NV12, NV21 and I420 sampling and conversion to RGB-family outputs. |
| Tensor values | Convert bytes to float and apply per-channel `(value - mean) × scale`. |
| Tensor layout | Write HWC or CHW output directly into the caller's tensor buffer. |
| Repeated execution | Reuse pipeline configuration and existing output storage with `RunInto` or `TensorBuffer`. |

These are Task capabilities for application preprocessing. InspireFace can also use Task for its camera-stream preprocessing when built with `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS=ON`; that SDK option is **off by default**. The switch selects the stream preprocessing backend. Model-specific normalization and tensor preparation still follow the model adapter. See [Task examples](../guides/inspirecv.md#task-preprocessing) to use the API directly.

### Build the Task path on ARM64 Linux {#build-the-task-path-on-arm64-linux}

After [preparing the source](../build/source.md), run this on an ARM64 Linux device with a native compiler. It builds a shared CPU SDK:

```bash
cmake -S . -B build/arm-cpu-task \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_ENABLE_INSPIRECV_TASK_PREPROCESS=ON \
  -DINSPIRECV_TASK_ENABLE_ARM_NEON=ON
cmake --build build/arm-cpu-task --parallel 4
cmake --install build/arm-cpu-task
```

The SDK is installed at `build/arm-cpu-task/install/InspireFace`. For cross-compilation or mobile targets, use the corresponding [platform build guide](../build/README.md#choose-a-build-guide) and apply these options to that toolchain configuration.

`INSPIRECV_TASK_ENABLE_ARM_NEON` defaults to `ON` and controls the explicit Task NEON paths. It does not control all Image operators or compiler auto-vectorization. NEON support is selected at build time; ARMv7 binaries compiled with NEON require a processor that supports those instructions. Compare the Task and default preprocessing paths using the same input formats and transformations on your device.

## Choose the SDK for the device {#choose-the-sdk-for-the-device}

Use a CPU resource pack such as `Pikachu` or `Megatron` with the CPU SDK. Download links are collected in [SDK overview and downloads](../build/README.md). Select the OS, process architecture and C runtime together:

| Target | Architecture / ABI | Build and integration |
| --- | --- | --- |
| Linux | ARM64 `aarch64`; ARMv7 hard-float | [Build](../build/linux.md#cross-compile-for-arm) · [C API](./c-cpp.md) · [Python packaging](../build/python.md) |
| Android | `arm64-v8a`; `armeabi-v7a` | [Build](../build/android.md) · [Camera integration](./android.md#process-camera-frames) |
| iOS | Device `arm64` | [Build](../build/ios.md) · [C/C++ integration](./ios.md) |
| HarmonyOS | `arm64-v8a` | [Build](../build/harmonyos.md) · [ArkTS integration](./harmonyos.md) |
| macOS Apple Silicon | Native `arm64` process | [Build](../build/macos.md) · [C++](./cpp.md) · [Python](./python.md) |

For Linux, match glibc/uClibc and the compiler runtime to the device image. On Apple Silicon, an x86_64 process running through Rosetta needs an x86_64 SDK. Rockchip NPU deployment has its own [SDK, model and driver requirements](./rknpu.md).

## Keep the camera loop efficient {#keep-the-camera-loop-efficient}

1. **Match the actual input layout.** Pass the camera's supported pixel format instead of repeatedly converting between YUV, RGB and BGR. The raw C stream requires tightly packed rows; repack padded or plane-based input as described in [image inputs](../guides/image-inputs.md).
2. **Limit the work to the application.** Choose a supported detector size, adjust the preview size, set a realistic face limit, and enable only the analysis outputs you use. Check small-face recall when reducing dimensions.
3. **Preserve one sequence per session.** Reuse the session and keep frames in order. A short queue prevents old camera frames from adding display latency.
4. **Measure a sustained run.** Record preprocessing, tracking, optional analysis and total frame time after warm-up. Compare median and p95, then check performance after the device has warmed up thermally.

NEON speedups depend on the operation, compiler and CPU. Compare both output correctness and timing when changing preprocessing paths. The [performance guide](../guides/benchmark-remark(updating).md) provides complete timing examples; the [image-processing benchmarks](../guides/image-processing-benchmarks.md) explain how to separate image operations from complete SDK calls.
