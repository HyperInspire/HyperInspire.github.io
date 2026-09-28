# 性能测试 {#measure-performance}

这里汇总检测、跟踪、特征提取、比对和特征库检索的测试结果，并提供在自己设备上运行的方法。图像转换、缩放和 CUDA 预处理的独立测试见 [InspireCV 性能测试](./image-processing-benchmarks.md)。

| 想了解什么 | 入口 |
| --- | --- |
| 各设备上的检测与识别耗时 | [历史设备数据](#historical-measurements) |
| 单张图片检测的中位数和 p95 | [Python 完整计时脚本](#time-a-still-image-call) |
| 特征提取与向量比对 | [分开计时](#measure-extraction-and-comparison) |
| 多种输入、跟踪模式和库容量 | [原生 benchmark](#run-native-benchmarks) |
| 自动保存 Python 测试报告 | [JSON 报告](#python-performance-report) |

## 历史测量记录 {#historical-measurements}

下面整理了项目[此前记录的设备测试结果](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/doc/Benchmark-Remark%28Updating%29.md)，均按**总耗时 ÷ 1,000 次调用**计算平均值，并保留对应的设备、模型包、后端和精度。原记录未注明 SDK 提交版本、输入图像尺寸、预热次数和线程设置；当前部署可按下文的方法复测。

### 不同输入档位的检测耗时 {#detection-by-input-size}

单位为 **ms/次**。`@160`、`@320`、`@640` 表示检测输入档位，每行使用表中对应的模型包与后端。

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

CoreML Megatron 的记录还包含两个中间档位：

| Device / pack | @192 (ms) | @256 (ms) |
| --- | ---: | ---: |
| Mac mini M2 / Megatron_Apple | 0.574 | 0.769 |
| iPhone 13 A15 / Megatron_Apple | 0.832 | 0.931 |

更大的检测输入有助于检出小脸，每次调用的计算量也会增加。比较档位时，保持原图和最小人脸尺寸设置一致，参数说明见[检测配置](./tracking.md#tune-one-setting-at-a-time)。

### 跟踪、特征提取与比对 {#tracking-extraction-and-comparison}

Light Track 和对齐加提取使用 **ms/次**。比对使用两个已经提取好的特征向量，单位为 **µs/对**。例如，RV1106 比对 1,000 次的总耗时为 23 ms，平均每次就是 23 µs。

| Device / pack | Light Track (ms) | Alignment + extraction (ms) | Comparison (µs) |
| --- | ---: | ---: | ---: |
| Intel i7 / Pikachu | 1.958 | 6.140 | 0.240 |
| RV1126 / Gundam_RV1109 | 8.858 | 42.352 | 1.308 |
| RV1106 / Gundam_RV1106 | 15.642 | 15.178 | 23.000 |
| RK3568 / Gundam_RK356X | 11.215 | 9.070 | 9.000 |
| RTX 3060 / Megatron_TRT | 0.621 | 1.009 | 1.000 |

M2 搭配 `Pikachu_Apple` 的记录中，特征比对为 **1 µs/次**。`Megatron_Apple` 则按识别模型分别记录了特征提取耗时：

| Device / pack | MNet extraction (ms) | R50 extraction (ms) |
| --- | ---: | ---: |
| Mac mini M2 / Megatron_Apple | 0.573 | 3.527 |
| iPhone 13 A15 / Megatron_Apple | 0.853 | 3.856 |

选择识别模型时，同时考虑耗时预算和实际图像上的匹配效果。分析完整识别流程时，分别测量检测、提取和比对。

### 不同库容量的 FeatureHub 检索 {#featurehub-search-by-gallery-size}

单位为 **ms/次查询**，每组取 1,000 次搜索的平均值。录入和查询特征提取单独处理。早期记录注明了库容量，未注明搜索模式和持久化设置。

| Device / pack | 1,000 entries | 5,000 entries | 10,000 entries |
| --- | ---: | ---: | ---: |
| Intel i7 / Pikachu | 0.072 | 0.364 | 1.193 |
| RV1126 / Gundam_RV1109 | 3.198 | 15.745 | 31.267 |

重新测量时，记录库容量、特征模型、阈值、`EAGER` 或 `EXHAUSTIVE` 模式，以及持久化设置。先按[特征库指南](./recognition.md#store-and-search-a-gallery)准备好库，再对查询计时。

## 明确测量任务 {#define-the-workload}

记录耗时时，同时保留以下信息：

| Item | 需要记录的内容 |
| --- | --- |
| SDK and model | 记录原生版本、源码提交、模型包名称及校验值。 |
| Device and build | 记录 CPU/GPU/SoC、操作系统、后端、是否使用 Release 构建及线程设置。 |
| Input | 记录图像尺寸、格式、人脸数和大致人脸大小。 |
| Session | 记录检测模式、检测级别、最大人脸数和已启用选项。 |
| Measurement | 说明预热次数、计时次数、包含的阶段和计时方式。 |
| Result | 报告延迟中位数和 p95，以及失败或丢帧情况。 |

模型加载与会话创建单独测量，记录为启动开销；逐帧处理另行计时。

## 测量静态图片调用 {#time-a-still-image-call}

下面的脚本只读取一次图像，准备图像流并预热会话，然后记录同步检测调用的耗时。保存为 `benchmark.py` 后运行：

<details>
<summary>benchmark.py — 完整代码</summary>

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

计时区域包括原生检测调用和 Python 人脸结果对象的创建，不包括文件解码、首次创建图像流、可选分析和绘制。脚本使用 `ALWAYS_DETECT`、检测级别 320，不启用附加功能。

核心计时循环如下：

```python
elapsed_ms = []
for _ in range(runs):
    start = time.perf_counter_ns()
    faces = session.face_detection(stream)
    elapsed_ms.append((time.perf_counter_ns() - start) / 1_000_000)
```

完整脚本还包含初始化、预热和清理。这个循环测量同一张静态图片的重复检测耗时；跟踪性能按下方的视频流程测量。


## 分别测量特征提取与比对 {#measure-extraction-and-comparison}

准备两张各含一张人脸的图片，使用与 InspireFace **1.2.4** 匹配的 Python API。脚本先完成两张图片的检测，再分别测量第一张图的特征提取，以及两个已有特征的比对。将下面代码保存为 `feature_benchmark.py`：

<details>
<summary>feature_benchmark.py — 完整代码</summary>

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

| Measurement | 计时包含的操作 | Unit |
| --- | --- | --- |
| Extraction | 人脸对齐、特征提取和 Python 结果数组的创建。 | ms per face |
| Comparison | Python 参数检查和原生接口对两个已有特征的比对。 | µs per pair |

两个阶段分别预热，再输出中位数和 p95。图像解码、图像流创建和人脸检测都在计时前完成。比较不同运行结果时，保持模型、图片和 API 语言一致；这里的 Python 耗时包含封装层开销。

## 运行原生 benchmark {#run-native-benchmarks}

仓库提供固定图像检测、跟踪场景、关键点平滑、特征比对和特征库检索等测试程序。下面使用 **InspireFace 1.2.4**、CPU Release 构建和 `Pikachu`。先准备[源码依赖](./models-and-builds.md#build-a-cpu-sdk)、模型包文件及 `test_res/data` 下的测试图像，然后在 InspireFace 仓库根目录运行。

<details>
<summary>构建原生 benchmark 程序</summary>

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

| Program | 测试内容 | 计时输出 |
| --- | --- | --- |
| [Detection fixtures](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_detect_postprocess_benchmark.cpp) | 无人脸、正脸、侧脸、抬头和多人五种输入；检测档位为 160/320/640。 | 完整 `HFExecuteFaceTrack` 调用的 mean、p50、p95、min 和 max，单位 µs。 |
| [Tracking scenarios](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_track_nms_benchmark.cpp) | 单人、多人、无人脸输入，搭配不同检测间隔。 | 首次调用和稳定阶段的耗时，单位 µs。 |
| [Tracking modes](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_track_candidate_benchmark.cpp) | Always detect、Light Track 和 Track by Detection。 | 首次调用、mean、p50、p95，单位 µs；同时检查结果。 |
| [Landmark smoothing](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/sample/benchmark/face_landmark_smoothing_benchmark.cpp) | 106 点平滑计算，以及完整跟踪调用。 | 平滑使用 ns，完整跟踪使用 µs。 |

<details>
<summary>运行检测、跟踪和关键点平滑测试</summary>

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

前三个程序的参数依次为 `<pack_path> <test_res_root> <iterations> <warmup_iterations>`。平滑测试最后多一个参数，用于指定独立关键点计算的次数。检测测试按 `Pikachu` 检查预期人脸数，运行时保持测试图与模型配套。跟踪程序反复提交固定图像，适合用同一组输入比较 SDK 改动前后的耗时；移动人脸按下方[视频流程](#measure-video-separately)测量。

以下测试覆盖两个特征向量的比对、**1k、5k、10k 条记录**的内存与持久化 FeatureHub 检索，以及 C/C++ 封装对照：

```bash
./build-benchmark/test/Test --test_dir test_res \
  --pack_path test_res/pack/Pikachu \
  'test_BenchmarkFaceComparison,test_BenchmarkFaceHubSearchMemory,test_BenchmarkFaceHubSearchPersistence'
./build-benchmark/test/TestCPP --test_dir test_res \
  --pack_path test_res/pack/Pikachu '[performance][latency]'
```

FeatureHub 测试使用 `EXHAUSTIVE` 搜索和 0.48 阈值，先生成并入库测试向量，再计时查询。比对测试先从两张图像提取特征，再计时比对。这些用例运行 1,000 次，在标准输出中打印总耗时和平均耗时，单位 **µs**，计时中包含循环内的结果断言。C/C++ 对照则在两次预热后，为每个接口交替测量九次，并打印中位数，单位同样为 µs。实现见 [C API benchmark](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/test/unit/api/test_benchmark.cpp) 和[封装对照测试](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/test/unit/cpp_api/test_performance_consistency.cpp)。

## Python 性能报告 {#python-performance-report}

仓库的 Python runner 可以将 SDK 信息、用例结果和计时指标写入 JSON。使用配套的 1.2.4 Python 依赖与**动态库**；macOS 将库文件名换成 `libInspireFace.dylib`。

```bash
PYTHONPATH=python python -m sample_testcase.run \
  --test_dir test_res \
  --pack_path test_res/pack/Pikachu \
  --native-lib /path/to/libInspireFace.so \
  --benchmark --pattern test_performance \
  --report benchmark_logs/python-performance.json
```

| Metric | 输入与配置 | 采样方式 |
| --- | --- | --- |
| `face_detection_320_p50/p95` | 单张人脸，检测档位 320。 | 预热 3 次，计时 20 次。 |
| `image_stream_create_release_p50/p95` | 从 NumPy 图像创建并释放 stream。 | 计时 1,000 组创建与释放。 |
| `face_detection_level_p50/p95` | 多人图像，检测档位 192/320/640，最多 25 张脸。 | 每档计时 30 次，包含首次调用。 |

报告同时保存测量值和测试状态。超过用例设定的耗时门限时，用例会标为 `failed`，JSON 仍会写出，可继续查看各项数据。

以上指标的单位均为 **ms**。[性能用例](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/python/sample_testcase/test_performance.py)将 NumPy 数组传给检测接口，因此也包含临时 stream 处理和 Python 结果转换的时间。上面的静态图片脚本则复用预先创建的 stream。比较多次测试时，保持输入方式一致。

## 查看 SDK 内部跟踪耗时 {#inspect-the-tracking-timer}

在已有应用中，可以于会话预热后启用内部计时。每次启用都会重置计数器。下面沿用处理循环中有效的 session 和 stream：

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

SDK 日志按 `FaceTrack` 操作输出 `Count`、`Total`、`Ave`、`Min` 和 `Max`，单位为 **µs**。其中包含会话内部的检测与跟踪、结果缓存和 token 序列化。外侧 Python 计时还包含封装处理，记录时分别保存这两组数据。日志设置见[接口示例](./api-recipes.md#inspect-the-loaded-runtime-and-errors)。

## 单独测量视频 {#measure-video-separately}

使用包含运动、进入、离开和短暂遮挡的代表性视频。保留帧顺序，持续复用跟踪会话。分别测量检测与跟踪、可选分析、识别和应用开销，再测量完整的单帧路径。

摄像头到屏幕的延迟也包含帧在队列中的等待时间。测量处理耗时的同时，记录队列深度和丢帧数。移动设备分别记录刚启动时，以及设备升温后持续运行的表现。

比较 GPU/NPU 时，保持输入图像和任务配置一致，记录哪些阶段实际使用了加速器。应用级测量应包含数据传输和格式转换。

## 理解计时单位 {#interpret-timing-units}

对于完成的 `N` 次迭代：

```text
mean time per call = total timed duration / N
```

保持单位一致：`23 ms / 1000 = 0.023 ms = 23 µs`。批处理或并发场景下，在固定时间内统计完成数量，直接计算吞吐量。

`mean` 是平均耗时，`p50` 表示中位数，`p95` 用于观察较慢的调用。30 FPS 的单帧预算约为 **33.3 ms**，60 FPS 约为 **16.7 ms**，其中还要容纳图像转换、排队和绘制。逐帧记录完整耗时，再计算整体 p95；分段统计时，各阶段的 p95 分别保留。

检测和跟踪按**每帧**记录，特征提取按**每张脸**记录，检索按**每次查询**记录。多人场景同时记录处理的人脸数，方便估算一次完整处理的开销。
