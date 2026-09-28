# Performance benchmarks {#measure-performance}

Find measurements for detection, tracking, feature extraction, comparison and gallery search, together with commands to run on your own device. For color conversion, resizing and CUDA preprocessing, see [InspireCV benchmarks](./image-processing-benchmarks.md).

| What to measure | Start here |
| --- | --- |
| Detection and recognition on different devices | [Historical hardware results](#historical-measurements) |
| Still-image detection median and p95 | [Complete Python timer](#time-a-still-image-call) |
| Feature extraction and vector comparison | [Separate stage timing](#measure-extraction-and-comparison) |
| Input cases, tracking modes and gallery sizes | [Native benchmarks](#run-native-benchmarks) |
| A saved Python performance report | [JSON report](#python-performance-report) |

## Historical measurements

These device results come from the project's [earlier benchmark record](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/doc/Benchmark-Remark%28Updating%29.md). Each value below is the recorded total divided by **1,000 calls**. The tables retain the device, model pack, backend and precision used in that record. The SDK revision, input dimensions, warm-up count and thread settings were not recorded; use the procedures below to measure your deployment.

### Detection by input size {#detection-by-input-size}

Values are **ms per call**. `@160`, `@320` and `@640` are detector input levels. Each row uses its listed model pack and backend.

| Device / pack | Backend / precision | @160 | @320 | @640 |
| --- | --- | ---: | ---: | ---: |
| MacBook Pro 16-inch 2019, Intel i7 2.6 GHz / Pikachu | CPU / FP32 | 4.171 | 8.493 | 25.808 |
| Mac mini 2023, M2 / Pikachu_Apple | CoreML / FP32 | 0.553 | 1.635 | 5.903 |
| Mac mini 2023, M2 / Megatron_Apple | CoreML / FP32 | 0.414 | 1.073 | 3.743 |
| iPhone 13, A15 / Megatron_Apple | CoreML / FP32 | 0.711 | 1.324 | 3.881 |
| RV1126 / Gundam_RV1109 | RKNPU / INT8 | 17.343 | 22.638 | 39.745 |
| RV1106 / Gundam_RV1106 | RKNPU2 / INT8 | 23.776 | 33.310 | 58.631 |
| RK3568 / Gundam_RK356X | RKNPU2 / INT8 | 16.946 | 25.108 | 68.778 |
| RTX 3060 12 GB / Megatron_TRT | TensorRT / FP16 | 0.911 | 2.374 | 8.685 |

The CoreML Megatron measurements also include two intermediate levels:

| Device / pack | @192 (ms) | @256 (ms) |
| --- | ---: | ---: |
| Mac mini M2 / Megatron_Apple | 0.574 | 0.769 |
| iPhone 13 A15 / Megatron_Apple | 0.832 | 0.931 |

A larger detector input can help with smaller faces and costs more per call. Compare levels with the same source image and minimum-face-size setting; see [session tuning](./tracking.md#tune-one-setting-at-a-time).

### Tracking, extraction and comparison {#tracking-extraction-and-comparison}

Light Track and alignment + extraction are in **ms per call**. Comparison uses two existing embeddings and is shown in **µs per pair**. For example, the RV1106 comparison total of 23 ms over 1,000 calls gives 23 µs per call.

| Device / pack | Light Track (ms) | Alignment + extraction (ms) | Comparison (µs) |
| --- | ---: | ---: | ---: |
| Intel i7 / Pikachu | 1.958 | 6.140 | 0.240 |
| RV1126 / Gundam_RV1109 | 8.858 | 42.352 | 1.308 |
| RV1106 / Gundam_RV1106 | 15.642 | 15.178 | 23.000 |
| RK3568 / Gundam_RK356X | 11.215 | 9.070 | 9.000 |
| RTX 3060 / Megatron_TRT | 0.621 | 1.009 | 1.000 |

The M2 `Pikachu_Apple` record also reports **1 µs per comparison**. For `Megatron_Apple`, the original record lists feature extraction separately by recognition model:

| Device / pack | MNet extraction (ms) | R50 extraction (ms) |
| --- | ---: | ---: |
| Mac mini M2 / Megatron_Apple | 0.573 | 3.527 |
| iPhone 13 A15 / Megatron_Apple | 0.853 | 3.856 |

Choose the recognition model using both your latency budget and matching results on representative images. Measure detection, extraction and comparison separately when profiling a complete recognition flow.

### FeatureHub search by gallery size {#featurehub-search-by-gallery-size}

Values are **ms per query**, averaged over 1,000 searches. Enrollment and query-feature extraction are separate steps. The earlier record specifies gallery size but omits search-mode and persistence settings.

| Device / pack | 1,000 entries | 5,000 entries | 10,000 entries |
| --- | ---: | ---: | ---: |
| Intel i7 / Pikachu | 0.072 | 0.364 | 1.193 |
| RV1126 / Gundam_RV1109 | 3.198 | 15.745 | 31.267 |

For a new run, record gallery size, embedding model, threshold, `EAGER` or `EXHAUSTIVE` mode, and persistence settings. Use [FeatureHub setup](./recognition.md#store-and-search-a-gallery) to prepare the gallery before timing queries.

## Define the workload

Record these details alongside a timing result:

| Item | Example or reason |
| --- | --- |
| SDK and model | Native version, source revision, pack name and checksum. |
| Device and build | CPU/GPU/SoC, operating system, backend, release build and thread settings. |
| Input | Image size, format, face count and approximate face size. |
| Session | Detection mode, detector level, maximum face count and enabled options. |
| Measurement | Warm-up count, timed iterations, included stages and timing method. |
| Result | Median and p95 latency, plus failures or dropped frames. |

Measure model loading and session creation separately from frame processing, and report them as startup costs.

## Time a still-image call

The script below loads an image once, prepares its stream, warms up the session and records synchronous detection calls. Save it as `benchmark.py`, then run:

<details>
<summary>benchmark.py — complete code</summary>

```python
"""Measure synchronous still-image detection latency (not camera FPS)."""
import argparse
import math
import statistics
import time

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("--model", required=True)
    parser.add_argument("--runs", type=int, default=100)
    parser.add_argument("--warmup", type=int, default=20)
    args = parser.parse_args()
    if args.runs < 1 or args.warmup < 0:
        parser.error("runs must be positive and warmup must be non-negative")
    image = cv2.imread(args.image)
    if image is None:
        parser.error("Cannot read the input image")
    isf.launch(resource_path=args.model)
    try:
        with isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320, auto_launch=False,
        ) as session:
            with isf.ImageStream.load_from_cv_image(image) as stream:
                for _ in range(args.warmup):
                    session.face_detection(stream)
                elapsed = []
                counts = set()
                for _ in range(args.runs):
                    start = time.perf_counter_ns()
                    faces = session.face_detection(stream)
                    elapsed.append((time.perf_counter_ns() - start) / 1_000_000)
                    counts.add(len(faces))
        ordered = sorted(elapsed)
        p95 = ordered[math.ceil(0.95 * len(ordered)) - 1]
        print(f"native={isf.version()}, image={image.shape}, face_counts={sorted(counts)}")
        print(f"ALWAYS_DETECT, level=320, max_faces=10, runs={args.runs}")
        print(f"median={statistics.median(elapsed):.3f} ms, p95={p95:.3f} ms")
    finally:
        isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python benchmark.py face.jpg --model /path/to/Pikachu --warmup 20 --runs 100
```

The timed region includes the native detection call and construction of Python face-result objects. It excludes file decoding, initial stream creation, optional pipeline analysis and drawing. It uses `ALWAYS_DETECT`, detector level 320 and no optional features.

The core timing loop is:

```python
elapsed_ms = []
for _ in range(runs):
    start = time.perf_counter_ns()
    faces = session.face_detection(stream)
    elapsed_ms.append((time.perf_counter_ns() - start) / 1_000_000)
```

Use the full script for setup, warm-up and cleanup. This loop measures repeated detection on a still image. To measure tracking, use the video procedure below.


## Measure extraction and comparison {#measure-extraction-and-comparison}

Use two images containing one face each and the Python API matching InspireFace **1.2.4**. The script detects both faces before timing, then measures extraction from the first image and comparison of two prepared embeddings. Save it as `feature_benchmark.py`:

<details>
<summary>feature_benchmark.py — complete code</summary>

```python
"""Measure aligned feature extraction and comparison with the Python API."""
import argparse
import math
import statistics
import time

import cv2
import inspireface as isf


def measure(operation, warmup, runs, label, unit):
    for _ in range(warmup):
        operation()
    samples = []
    for _ in range(runs):
        start = time.perf_counter_ns()
        result = operation()
        samples.append(time.perf_counter_ns() - start)
    samples.sort()
    scale = 1_000_000 if unit == "ms" else 1_000
    p95 = samples[math.ceil(0.95 * runs) - 1] / scale
    print(f"{label}: median={statistics.median(samples) / scale:.3f} {unit}, "
          f"p95={p95:.3f} {unit}")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image1")
    parser.add_argument("image2")
    parser.add_argument("--model", required=True)
    parser.add_argument("--runs", type=int, default=100)
    parser.add_argument("--warmup", type=int, default=20)
    args = parser.parse_args()
    if args.runs < 1 or args.warmup < 0:
        parser.error("runs must be positive and warmup must be non-negative")
    image1, image2 = cv2.imread(args.image1), cv2.imread(args.image2)
    if image1 is None or image2 is None:
        parser.error("Cannot read one or both input images")

    isf.launch(resource_path=args.model)
    try:
        with isf.InspireFaceSession(
            isf.HF_ENABLE_FACE_RECOGNITION, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320, auto_launch=False,
        ) as session:
            with isf.ImageStream.load_from_cv_image(image1) as stream1, \
                    isf.ImageStream.load_from_cv_image(image2) as stream2:
                faces1 = session.face_detection(stream1)
                faces2 = session.face_detection(stream2)
                if len(faces1) != 1 or len(faces2) != 1:
                    raise ValueError(f"Expected one face per image; got {len(faces1)} and {len(faces2)}")
                feature2 = session.face_feature_extract(stream2, faces2[0])
                print(f"native={isf.version()}, model={args.model}")
                print(f"image1={image1.shape}, image2={image2.shape}, "
                      f"warmup={args.warmup}, runs={args.runs}")
                feature1 = measure(
                    lambda: session.face_feature_extract(stream1, faces1[0]),
                    args.warmup, args.runs, "extract image1 (alignment included)", "ms",
                )
                score = measure(
                    lambda: isf.feature_comparison(feature1, feature2),
                    args.warmup, args.runs, "compare two prepared embeddings", "us",
                )
                print(f"feature_length={feature1.size}, cosine_similarity={score:.6f}")
    finally:
        isf.terminate()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        raise SystemExit(f"Benchmark failed: {error}") from error
```

</details>

```bash
python feature_benchmark.py face1.jpg face2.jpg \
  --model /path/to/Pikachu --warmup 20 --runs 100
```

| Measurement | Included in the timer | Unit |
| --- | --- | --- |
| Extraction | Alignment, feature extraction and the Python result array. | ms per face |
| Comparison | Python argument checks and native comparison of two prepared embeddings. | µs per pair |

Each stage reports its median and p95 after its own warm-up. Image decoding, stream creation and face detection happen outside both timers. Keep the model, images and API language the same when comparing runs; the Python times include wrapper overhead.

## Run the native benchmark suite {#run-native-benchmarks}

The source tree contains programs for fixed-image detection, tracking scenarios, landmark smoothing, feature comparison and gallery search. The following commands use **InspireFace 1.2.4**, a CPU Release build and `Pikachu`. Prepare the [source dependencies](./models-and-builds.md#build-a-cpu-sdk), the pack file and the images under `test_res/data`, then run from the InspireFace repository root.

<details>
<summary>Build the native benchmark targets</summary>

```bash
cmake -S . -B build-benchmark \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_SHARED_LIBS=OFF \
  -DISF_BUILD_WITH_SAMPLE=ON \
  -DISF_BUILD_WITH_TEST=ON \
  -DISF_ENABLE_BENCHMARK=ON \
  -DISF_NEVER_USE_OPENCV=ON
cmake --build build-benchmark --parallel 4 --target \
  Test TestCPP FaceDetectPostprocessBenchmarkSample \
  FaceTrackNmsBenchmarkSample FaceTrackCandidateBenchmarkSample \
  FaceLandmarkSmoothingBenchmarkSample
```

</details>

| Program | Workload | Timing output |
| --- | --- | --- |
| [Detection fixtures](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_detect_postprocess_benchmark.cpp) | Five inputs: no face, frontal, profile, raised head and multiple faces; levels 160/320/640. | Full `HFExecuteFaceTrack` call: mean, p50, p95, min and max in µs. |
| [Tracking scenarios](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_track_nms_benchmark.cpp) | Single-face, multi-face and no-face inputs with different detection intervals. | First call and steady-state calls in µs. |
| [Tracking modes](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_track_candidate_benchmark.cpp) | Always detect, Light Track and Track by Detection. | First call, mean, p50 and p95 in µs; result checks alongside timing. |
| [Landmark smoothing](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_landmark_smoothing_benchmark.cpp) | 106-point smoothing plus full tracking calls. | Smoothing in ns; full tracking in µs. |

<details>
<summary>Run detection, tracking and smoothing</summary>

```bash
./build-benchmark/sample/benchmark/FaceDetectPostprocessBenchmarkSample \
  test_res/pack/Pikachu test_res 100 5
./build-benchmark/sample/benchmark/FaceTrackNmsBenchmarkSample \
  test_res/pack/Pikachu test_res 100 5
./build-benchmark/sample/benchmark/FaceTrackCandidateBenchmarkSample \
  test_res/pack/Pikachu test_res 100 5
./build-benchmark/sample/benchmark/FaceLandmarkSmoothingBenchmarkSample \
  test_res/pack/Pikachu test_res 50 8 10000
```

</details>

The first three programs take `<pack_path> <test_res_root> <iterations> <warmup_iterations>`. Smoothing adds a final iteration count for its isolated point calculation. Detection fixtures check expected face counts for `Pikachu`; keep the fixture/model pair together. The tracking programs repeatedly submit fixed images, which makes them useful for comparing SDK changes on the same inputs. For moving subjects, use the [video procedure](#measure-video-separately).

The tests below cover two-embedding comparison, memory/persistent FeatureHub search at **1k, 5k and 10k entries**, and a C/C++ wrapper comparison:

```bash
./build-benchmark/test/Test --test_dir test_res \
  --pack_path test_res/pack/Pikachu \
  'test_BenchmarkFaceComparison,test_BenchmarkFaceHubSearchMemory,test_BenchmarkFaceHubSearchPersistence'
./build-benchmark/test/TestCPP --test_dir test_res \
  --pack_path test_res/pack/Pikachu '[performance][latency]'
```

FeatureHub tests use `EXHAUSTIVE` search with a 0.48 threshold. FeatureHub tests generate and enroll the vectors before timing. The comparison case extracts its two embeddings before timing. These cases run 1,000 iterations and print total/average **µs** to standard output, including the in-loop result assertions. The C/C++ test alternates nine timed calls per interface after two warm-ups and prints median µs. See the [C API benchmark cases](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/test/unit/api/test_benchmark.cpp) and [wrapper comparison](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/test/unit/cpp_api/test_performance_consistency.cpp).

## Python performance report {#python-performance-report}

The repository's Python runner writes a JSON report with SDK information, case outcomes and timing metrics. Use the matching 1.2.4 Python dependencies and a **shared native library**; on macOS replace the library filename with `libInspireFace.dylib`.

```bash
PYTHONPATH=python python -m sample_testcase.run \
  --test_dir test_res \
  --pack_path test_res/pack/Pikachu \
  --native-lib /path/to/libInspireFace.so \
  --benchmark --pattern test_performance \
  --report benchmark_logs/python-performance.json
```

| Metric | Input and configuration | Sampling |
| --- | --- | --- |
| `face_detection_320_p50/p95` | One face, level 320. | 3 warm-ups, 20 measured calls. |
| `image_stream_create_release_p50/p95` | Construct and release a stream from a NumPy image. | 1,000 measured pairs. |
| `face_detection_level_p50/p95` | Multiple faces, levels 192/320/640, maximum 25 faces. | 30 measured calls per level, including the first call. |

The report saves both measurements and test status. Exceeding a case's latency limits marks it as `failed`; the JSON is still written so you can inspect the measurements.

All three metric groups use **ms**. The [performance cases](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/python/sample_testcase/test_performance.py) pass NumPy arrays to detection, so their times include temporary stream handling and Python result conversion. The still-image script above reuses a prepared stream. Keep that input choice consistent when comparing runs.

## Inspect the SDK's tracking timer {#inspect-the-tracking-timer}

To inspect the native tracking call from an existing application, enable its cost counter after warming up the session. Enabling it resets the counters. Keep the session and stream from your processing loop alive:

::: tabs #api-language

@tab C API

```c
/* session and stream are valid; warm-up has finished. */
HResult status = HFSessionSetEnableTrackCostSpend(session, 1);
if (status == HSUCCEED) {
    HFMultipleFaceData faces = {0};
    for (int i = 0; i < 100; ++i) {
        status = HFExecuteFaceTrack(session, stream, &faces);
        if (status != HSUCCEED) break;
    }
    if (status == HSUCCEED) {
        status = HFSessionPrintTrackCostSpend(session);
    }
    HFSessionSetEnableTrackCostSpend(session, 0);
}
/* Handle status before continuing. */
```

@tab Python

```python
# session and stream are valid; warm-up has finished.
session.set_enable_track_cost_spend(True)
try:
    for _ in range(100):
        session.face_detection(stream)
    session.print_track_cost_spend()
finally:
    session.set_enable_track_cost_spend(False)
```

:::

The SDK log reports `Count`, `Total`, `Ave`, `Min` and `Max` in **µs** for the `FaceTrack` operation. This covers detection/tracking, result caching and token serialization inside the session. The external Python timer also includes wrapper processing. Record these as separate measurements. Use the [API recipes](./api-recipes.md#inspect-the-loaded-runtime-and-errors) to configure log output.

## Measure video separately

Use a representative clip containing motion, entries, exits and temporary occlusion. Preserve frame order and keep a tracking session alive. Measure detection/tracking, optional pipeline work, recognition and application overhead as separate stages, then measure the complete frame path.

Camera-to-screen latency includes time spent waiting in the frame queue. Record queue depth and dropped frames alongside processing time. On mobile devices, measure both startup and a sustained run after the device warms up.

For GPU/NPU comparisons, use the same image and task configuration and record which stages actually use the accelerator. Include transfers and format conversion in the application-level measurement.

## Interpret timing units

For `N` completed iterations:

```text
mean time per call = total timed duration / N
```

Keep units consistent: `23 ms / 1000 = 0.023 ms = 23 µs`. For batched or concurrent work, measure throughput directly by counting completions over a fixed interval.

`mean` is the arithmetic average, `p50` is the median, and `p95` helps you inspect slower calls. A 30 FPS frame budget is about **33.3 ms**; 60 FPS allows **16.7 ms**, including conversion, queueing and drawing. Compute end-to-end p95 from complete frame measurements, and retain each stage's p95 separately.

Record detection/tracking **per frame**, extraction **per face**, and search **per query**. Include the processed face count for multi-face workloads when estimating the cost of a complete frame.
