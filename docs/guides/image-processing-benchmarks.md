# Image and preprocessing benchmarks

InspireCV measures image operations and the conversion from camera pixels to model-input tensors. These timings cover the work before inference. For face detection, tracking and feature extraction, see [InspireFace performance](./benchmark-remark(updating).md).

The following tables cover CPU image processing, fused Task preprocessing and a sequence of operations kept in GPU memory. All times are in **microseconds (µs)**; 1,000 µs equals 1 ms.

## CPU image processing

This run used an **AMD Ryzen 5 5600**, Ubuntu 22.04 / Linux 6.8, GCC 11.4 and an InspireCV **1.0.1 Release build dated 2026-08-16**, with AVX2 enabled. The process was pinned to logical CPU 2. OpenCV **5.0.0** used one thread, with IPP, OpenCL and TBB disabled.

Inputs are deterministic synthetic pixels. `Image` timings include output allocation through the public API; `Task` reuses its pipeline and destination buffer. Each run includes 10 warm-ups and 101 timed samples, with the two libraries measured in alternating order. The table reports the median P50 across **seven runs**.

| Operation | Input → output | InspireCV P50 (µs) | OpenCV P50 (µs) |
| --- | --- | ---: | ---: |
| Image nearest resize, u8 C3 | 224×224 → 112×112 | 7.203 | 10.780 |
| Image rotate90, u8 C3 | 1920×1080 → 1080×1920 | 635.435 | 3,133.380 |
| Image horizontal flip, u8 C3 | 1920×1080 → 1920×1080 | 252.876 | 2,171.303 |
| Image SwapRB, u8 C3 | 1920×1080 → 1920×1080 | 142.828 | 172.565 |
| Image erode3, u8 C1 | 1920×1080 → 1920×1080 | 398.710 | 129.714 |
| Task BGR u8 → RGB f32 CHW | 224×224 → 224×224 | 77.375 | 94.978 |
| Task BGR u8 → RGB f32 HWC | 224×224 → 224×224 | 28.564 | 14.517 |

All rows shown here produced matching output bytes or float bit patterns. Task includes channel conversion and normalization. In this run, rotation and horizontal flip favor InspireCV; erode and HWC output favor OpenCV. Choose the operation and tensor layout your application actually uses when comparing timings.

The [full 91-case CSV](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cpu/ryzen5_5600_algorithm_matrix_summary.csv) also records P95, variation between runs and output accuracy. Linear interpolation, affine sampling and some filter settings use different calculation rules between the libraries; their rows carry `different_contract`. The [CPU benchmark notes](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cpu/README.md) include the full method, Apple M4 measurements and SSE4.1/AVX2 comparisons.

### Run the CPU comparison

Run these commands from an InspireCV checkout with OpenCV's `core` and `imgproc` development libraries installed. Set `OpenCV_DIR` to your installation. The AVX2 option below matches the Ryzen configuration and requires an AVX2-capable x86 CPU.

```bash
cmake -S . -B build-cpu-benchmark \
  -DCMAKE_BUILD_TYPE=Release \
  -DINSPIRECV_BUILD_CPU_BENCHMARKS=ON \
  -DINSPIRECV_ENABLE_AVX2=ON \
  -DOpenCV_DIR=/path/to/opencv/lib/cmake/opencv5
cmake --build build-cpu-benchmark --target inspirecv_cpu_benchmark --parallel 4

for run in 1 2 3 4 5 6 7; do
  taskset -c 2 ./build-cpu-benchmark/inspirecv_cpu_benchmark \
    --suite matrix --samples 101 --warmups 10 --opencv-threads 1 \
    --machine local_cpu --report "matrix_run${run}.csv"
done

python3 scripts/cpu_benchmark_opencv_summary.py \
  --reports matrix_run{1,2,3,4,5,6,7}.csv \
  --candidate-label inspirecv --output matrix_summary.csv
```

`taskset` is the Linux affinity command. On macOS, omit it; on ARM, also omit the AVX2 option. Apple's GCD scheduler manages OpenCV's thread count, so record the reported thread count alongside the requested one. The runner writes both to the CSV header. Use `--suite full` for the shorter comparison or `--suite u8c3` for the geometry and channel-swap sweep.

### Measure Image and Task on your CPU

The latest standalone InspireCV source includes `inspirecv_simd_coverage_benchmark`. It measures public `Image` and `Task` calls across pixel types, channel counts, image sizes and tensor layouts, including inputs with row padding. Use it to check the operations you use on your own machine. It measures InspireCV only; the CPU comparison above also measures OpenCV.

This runner was added to InspireCV on **2026-10-02**. InspireFace currently references an earlier InspireCV revision, so build the standalone repository for this example. The historical measurements on this page remain dated as shown; they do not measure the new CPU kernels.

<details>
<summary>Build and run Image and Task benchmarks</summary>

Install CMake, a C++14 compiler and OpenCV's `core` and `imgproc` development libraries. The CPU benchmark build option currently requires those OpenCV components, even when building only this runner. Set `OpenCV_DIR` to your installation, or omit it if CMake already finds OpenCV.

```bash
git clone --depth 1 https://github.com/tunmx/InspireCV.git
cd InspireCV

cmake -S . -B build-cpu-coverage \
  -DCMAKE_BUILD_TYPE=Release \
  -DINSPIRECV_BUILD_CPU_BENCHMARKS=ON \
  -DINSPIRECV_BACKEND_OPENCV=OFF \
  -DINSPIRECV_ENABLE_AVX2=OFF \
  -DOpenCV_DIR=/path/to/opencv/lib/cmake/opencv4
cmake --build build-cpu-coverage \
  --target inspirecv_simd_coverage_benchmark --parallel 4

./build-cpu-coverage/inspirecv_simd_coverage_benchmark \
  --suite all --samples 31 --min-ms 5 --max-width 640 \
  --report cpu-coverage.csv

./build-cpu-coverage/inspirecv_simd_coverage_benchmark \
  --suite image --operation swap_rb \
  --samples 31 --min-ms 5 --max-width 640 \
  --report swap-rb.csv
```

The first run covers both suites; the second selects channel swapping. `INSPIRECV_ENABLE_AVX2=OFF` avoids compiling the whole project for AVX2. On supported x86 CPUs, isolated AVX2 kernels can still be selected at runtime.

</details>

| Option | Use |
| --- | --- |
| `--suite all`, `image` or `task` | Choose both suites or one API family. |
| `--operation NAME` | Run one exact operation name from the CSV, such as `swap_rb`. |
| `--max-width 640` | Include test inputs up to this width; use `1920` for the full size range. |
| `--samples 31` / `--min-ms 5` | Collect 31 timed samples, calibrating repeated calls to target at least 5 ms per sample. |
| `--report cpu-coverage.csv` | Write results to a CSV file. |

`p50_us` is the median time per call; `p95_us` is the 95th percentile. Each sample averages repeated calls, so these describe variation between batches, rather than individual-frame tail latency. The CSV also records input/output dimensions, strides, layout and `timing_scope`:

- `Image`: `public_api_allocation` includes the output allocation performed by the public API.
- `Task`: `preallocated_end_to_end` measures `Pipeline::Run()` with a reused pipeline and output buffer.

Compare matching operations, shapes and timing scopes on the same machine. These are image-processing and preprocessing timings; they do not include model inference.

## CUDA Task preprocessing

The following **2026-08-16** measurements used an **RTX 3060 12 GiB** with a Ryzen 5 5600, CUDA **12.2**, NVIDIA driver **550.144.03**, Linux 6.8 and GCC 11.4 in Release mode. The saved CSV records the InspireCV build version as **1.0.0**.

Task converts packed **BGR uint8** input to normalized **RGB float32 CHW** output, using bilinear sampling. Each channel uses `(value - 127.5) / 128`. The CUDA column includes pageable host upload, preprocessing and host download. Input creation is outside the timed region. P50 and P95 come from **101 samples after 10 warm-ups**; CPU and CUDA outputs match bit-for-bit.

| Input → tensor | CPU P50 / P95 (µs) | CUDA round-trip P50 / P95 (µs) |
| --- | ---: | ---: |
| 112×112 → 112×112, identity | 19.407 / 19.477 | 51.649 / 53.472 |
| 640×480 → 112×112 | 172.469 / 175.796 | 132.793 / 133.625 |
| 1920×1080 → 224×224 | 686.318 / 690.076 | 509.962 / 515.122 |
| 2560×1440 → 224×224 | 686.118 / 689.213 | 807.780 / 812.408 |
| 3840×2160 → 640×640 | 5,718.820 / 5,806.687 | 2,244.447 / 2,387.390 |

For a fixed output size, increasing the input size increases upload cost. That is why the 2560×1440 → 224×224 row takes longer on CUDA than on CPU. Small identity conversions also spend more time on transfers and dispatch than they save in computation.

The [raw Task report](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/task_host_rtx3060_cuda12_2.csv) contains the complete input/output sweep. These measurements feed the default `Auto` selection rules: the measured CUDA P50 must improve by at least 15%, with P95 no slower than CPU. The [CUDA benchmark notes](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/README.md) describe the selected ranges and a separate verification run of `Auto` itself.

### Run the CUDA comparison

Build with CMake 3.18 or newer and the CUDA Toolkit. `86` targets the RTX 3060; set the architecture for your GPU.

```bash
cmake -S . -B build-cuda \
  -DCMAKE_BUILD_TYPE=Release \
  -DINSPIRECV_BUILD_TESTS=ON \
  -DINSPIRECV_ENABLE_CUDA=ON \
  -DINSPIRECV_CUDA_ARCHITECTURES=86
cmake --build build-cuda --target inspirecv_tests --parallel 4

INSPIRECV_CUDA_THRESHOLD_SAMPLES=101 \
INSPIRECV_CUDA_THRESHOLD_REPORT=task_host.csv \
  ./build-cuda/inspirecv_tests task_cuda_host_auto_threshold_benchmark

./build-cuda/inspirecv_tests task_cuda_auto_dispatch_performance
```

The first test command writes the CPU/CUDA measurements. The second measures whether `Auto` selects and executes the expected backend. Run the tests on a machine with a working NVIDIA driver and CUDA device.

## Keep an Image chain in GPU memory

A sequence of image operations can share device buffers. This benchmark runs **bilinear resize to ¾ width and height → general affine transform at the resized dimensions → rotate90**, starting from a three-channel `uint8` image.

The archived results use the same RTX 3060 / Ryzen 5 5600 machine and CUDA 12.2 configuration as above. Each value is the median of **three run medians**, with **51 samples after five warm-ups** per run. The report is archived with the [InspireCV 1.0.2 release](https://github.com/tunmx/InspireCV/blob/8a80dcb/benchmarks/cuda/README.md).

| Source | CPU chain (µs) | CUDA transfer per operation (µs) | Upload/download once (µs) | Device only (µs) |
| --- | ---: | ---: | ---: | ---: |
| 640×480 | 5,452.580 | 444.813 | 194.594 | 47.459 |
| 1280×720 | 15,809.800 | 3,167.980 | 497.021 | 123.131 |
| 1920×1080 | 37,121.200 | 6,979.820 | 1,035.810 | 262.962 |

The per-operation path uploads and downloads for each of the three operations. The resident round-trip uploads once, keeps intermediate images on the GPU and downloads the final image. Device-only timing starts with the image on the GPU and includes synchronization after all three operations. Downloaded results match the CPU chain byte-for-byte.

For a GPU inference pipeline, keep the processed image and tensor in device memory through the next stage. If the application needs a CPU image for display or another consumer, include the final download when measuring that path. The [three-run CSV](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/device_image_chain_rtx3060_cuda12_2.csv) contains all measurements behind this table.

Run the chain benchmark with the same CUDA build:

```bash
for run in 1 2 3; do
  INSPIRECV_DEVICE_IMAGE_BENCHMARK_SAMPLES=51 \
  INSPIRECV_DEVICE_IMAGE_BENCHMARK_REPORT="device_chain_run${run}.csv" \
    ./build-cuda/inspirecv_tests cuda_device_image_chain_benchmark
done
```

## More recorded workloads

The repository also contains these reports. Use them when your input format or execution pattern matches the workload.

| Report | Workload |
| --- | --- |
| [CUDA Image geometry](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/image_host_rtx3060_cuda12_2.csv) | 143 operation/type/resolution combinations, including resize, affine and rotation; host transfers included. |
| [CUDA YUV preprocessing](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/task_yuv_rtx3060_cuda12_2.csv) | NV12 to RGB float32 CHW with nearest sampling; CPU, host round-trip and device timings. |
| [CUDA Task batching](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/task_batch_rtx3060_cuda12_2.csv) | 320×240 BGR device input to 112×112 CHW tensors; batches of 1, 4, 8 and 16. |

To compare two InspireCV revisions, the [revision benchmark tools](https://github.com/tunmx/InspireCV/blob/main/scripts/benchmark/README.md) provide paired runs, saved raw results and an A/A control using the same binary on both sides. Record the revision, build options and machine with new measurements so the next run has a clear baseline.
