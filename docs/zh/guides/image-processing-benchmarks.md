# 图像处理与预处理性能 {#image-and-preprocessing-benchmarks}

InspireCV 的性能测试覆盖图像操作，以及从相机像素到模型输入张量的转换。这里统计的是推理前的处理耗时。人脸检测、跟踪和特征提取的测试见 [InspireFace 性能测试](./benchmark-remark(updating).md)。

本页选取三组数据：CPU 图像处理、Task 融合预处理，以及中间结果保留在显存中的连续图像操作。所有耗时单位均为 **微秒（µs）**，1,000 µs 等于 1 ms。

## CPU 图像处理 {#cpu-image-processing}

测试使用 **AMD Ryzen 5 5600**、Ubuntu 22.04 / Linux 6.8、GCC 11.4，以及构建日期为 **2026-08-16 的 InspireCV 1.0.1 Release 版本**，启用 AVX2。进程绑定到逻辑 CPU 2。OpenCV **5.0.0** 使用单线程，关闭 IPP、OpenCL 和 TBB。

输入为固定规则生成的像素。`Image` 统计公开接口调用中的输出内存分配；`Task` 复用 Pipeline 和输出缓冲区。每轮预热 10 次、计时 101 次，两套库交替执行。表中数值取 **7 轮 P50 的中位数**。

| Operation | Input → output | InspireCV P50 (µs) | OpenCV P50 (µs) |
| --- | --- | ---: | ---: |
| Image nearest resize, u8 C3 | 224×224 → 112×112 | 7.203 | 10.780 |
| Image rotate90, u8 C3 | 1920×1080 → 1080×1920 | 635.435 | 3,133.380 |
| Image horizontal flip, u8 C3 | 1920×1080 → 1920×1080 | 252.876 | 2,171.303 |
| Image SwapRB, u8 C3 | 1920×1080 → 1920×1080 | 142.828 | 172.565 |
| Image erode3, u8 C1 | 1920×1080 → 1920×1080 | 398.710 | 129.714 |
| Task BGR u8 → RGB f32 CHW | 224×224 → 224×224 | 77.375 | 94.978 |
| Task BGR u8 → RGB f32 HWC | 224×224 → 224×224 | 28.564 | 14.517 |

表中各项输出的字节或浮点位模式均一致。Task 包含通道转换和归一化。这组数据中，旋转、水平翻转在 InspireCV 上更快；腐蚀和 HWC 输出在 OpenCV 上更快。比较时选择应用实际使用的操作和张量布局。

[完整的 91 项 CSV](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cpu/ryzen5_5600_algorithm_matrix_summary.csv) 还记录了 P95、多轮波动和输出精度。两套库在线性插值、仿射采样和部分滤波配置上采用不同计算规则，相应数据标为 `different_contract`。[CPU 测试说明](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cpu/README.md) 中还有完整方法、Apple M4 数据和 SSE4.1 / AVX2 对比。

### 运行 CPU 对比 {#run-the-cpu-comparison}

在 InspireCV 项目目录中执行以下命令，先安装 OpenCV 的 `core`、`imgproc` 开发库，并将 `OpenCV_DIR` 改为实际安装位置。下面的 AVX2 选项与 Ryzen 测试配置一致，要求 x86 CPU 支持 AVX2。

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

`taskset` 用于 Linux 的 CPU 绑定，macOS 上去掉这部分即可；ARM 平台还需去掉 AVX2 选项。Apple 的 GCD 负责管理 OpenCV 线程数，因此应同时记录请求值和实际线程数，测试程序会把两者写入 CSV 表头。使用 `--suite full` 运行较短的一组测试，或使用 `--suite u8c3` 测试几何变换和通道交换。

### 在自己的 CPU 上测试 Image 和 Task {#measure-image-and-task-on-your-cpu}

最新版独立 InspireCV 源码提供了 `inspirecv_simd_coverage_benchmark`，通过公开的 `Image` 和 `Task` 接口测试不同像素类型、通道数、图像尺寸和张量布局，也包含行尾有填充的输入。可以用它检查应用中的常用操作在本机上的耗时。这个工具只测 InspireCV；上面的 CPU 对比工具会同时测量 OpenCV。

该工具于 **2026-10-02** 加入 InspireCV。InspireFace 当前引用的 InspireCV 版本较早，运行下面的示例需要单独构建 InspireCV 仓库。本页已有的性能数据仍对应各表注明的测试日期，没有包含这次新增 CPU 内核的实测结果。

<details>
<summary>构建并运行 Image 和 Task 性能测试</summary>

先安装 CMake、支持 C++14 的编译器，以及 OpenCV 的 `core`、`imgproc` 开发库。目前开启 CPU benchmark 构建选项时，即使只构建这个工具，也需要这两个 OpenCV 组件。将 `OpenCV_DIR` 改成实际安装位置；如果 CMake 已经能找到 OpenCV，可以去掉该选项。

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

第一组运行 Image 和 Task 两类测试，第二组只测通道交换。`INSPIRECV_ENABLE_AVX2=OFF` 表示不对整个项目启用 AVX2 编译；在支持的 x86 CPU 上，独立的 AVX2 内核仍可由运行时自动选择。

</details>

| Option | 用法 |
| --- | --- |
| `--suite all`、`image` 或 `task` | 选择全部测试，或只测一类接口。 |
| `--operation NAME` | 按 CSV 中的完整操作名筛选，例如 `swap_rb`。 |
| `--max-width 640` | 只测输入宽度不超过此值的用例；设为 `1920` 可覆盖全部尺寸。 |
| `--samples 31` / `--min-ms 5` | 采样 31 次，通过调整重复调用次数，让每次采样的目标耗时至少为 5 ms。 |
| `--report cpu-coverage.csv` | 将结果保存到 CSV 文件。 |

`p50_us` 是单次调用耗时的中位数，`p95_us` 是第 95 百分位。每次采样都会对一批重复调用取平均，因此它们反映的是批次间的波动，不是逐帧耗时的长尾。CSV 还记录输入、输出尺寸、stride、layout 和 `timing_scope`：

- `Image`：`public_api_allocation` 包含公开接口内部的输出内存分配。
- `Task`：`preallocated_end_to_end` 测量复用 Pipeline 和输出缓冲区时的 `Pipeline::Run()` 耗时。

比较时使用同一台机器，并对应相同的操作、尺寸和计时范围。这里测的是图像处理和预处理，不包含模型推理。

## CUDA Task 预处理 {#cuda-task-preprocessing}

以下数据测于 **2026-08-16**，使用 **RTX 3060 12 GiB**、Ryzen 5 5600、CUDA **12.2**、NVIDIA 驱动 **550.144.03**、Linux 6.8 和 GCC 11.4，采用 Release 构建。保存的 CSV 中，InspireCV 构建版本记为 **1.0.0**。

Task 将紧密排列的 **BGR uint8** 输入转换为归一化后的 **RGB float32 CHW** 张量，采用双线性采样，每个通道按 `(value - 127.5) / 128` 归一化。CUDA 耗时包含普通主机内存的上传、预处理和结果下载；输入创建不计时。P50、P95 来自 **预热 10 次后的 101 次采样**，CPU 与 CUDA 输出逐位一致。

| Input → tensor | CPU P50 / P95 (µs) | CUDA round-trip P50 / P95 (µs) |
| --- | ---: | ---: |
| 112×112 → 112×112, identity | 19.407 / 19.477 | 51.649 / 53.472 |
| 640×480 → 112×112 | 172.469 / 175.796 | 132.793 / 133.625 |
| 1920×1080 → 224×224 | 686.318 / 690.076 | 509.962 / 515.122 |
| 2560×1440 → 224×224 | 686.118 / 689.213 | 807.780 / 812.408 |
| 3840×2160 → 640×640 | 5,718.820 / 5,806.687 | 2,244.447 / 2,387.390 |

输出尺寸固定时，输入越大，上传开销越高。因此 2560×1440 → 224×224 这一项的 CUDA 总耗时超过了 CPU。小尺寸的 identity 转换也会出现类似情况：上传、下载和调度开销超过了计算部分节省的时间。

[Task 原始报告](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/task_host_rtx3060_cuda12_2.csv) 包含完整的输入、输出尺寸组合。这组测试用于制定默认 `Auto` 选择规则：测得的 CUDA P50 至少快 15%，同时 P95 不高于 CPU。[CUDA 测试说明](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/README.md) 列出了选择范围，以及另外一轮针对 `Auto` 本身的验证数据。

### 运行 CUDA 对比 {#run-the-cuda-comparison}

构建需要 CMake 3.18 或更新版本及 CUDA Toolkit。`86` 对应 RTX 3060，其他 GPU 请设置相应架构。

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

第一条测试命令保存 CPU / CUDA 测量结果；第二条检查 `Auto` 是否选择并执行预期后端。运行测试的机器需要可用的 NVIDIA 驱动和 CUDA 设备。

## 在显存中连续处理图像 {#keep-an-image-chain-in-gpu-memory}

多个图像操作可以共享显存中的中间结果。这组测试从三通道 `uint8` 图像开始，依次执行 **双线性缩放至原宽高的 ¾ → 在缩放后尺寸上做一般仿射变换 → rotate90**。

存档数据采用前述 RTX 3060 / Ryzen 5 5600 机器和 CUDA 12.2 配置。每轮预热 **5 次**、采样 **51 次**，表中数值取 **3 轮中位数的中位数**。报告收录于 [InspireCV 1.0.2 发布记录](https://github.com/tunmx/InspireCV/blob/8a80dcb/benchmarks/cuda/README.md)。

| Source | CPU chain (µs) | CUDA 每步传输 (µs) | 仅上传/下载一次 (µs) | Device only (µs) |
| --- | ---: | ---: | ---: | ---: |
| 640×480 | 5,452.580 | 444.813 | 194.594 | 47.459 |
| 1280×720 | 15,809.800 | 3,167.980 | 497.021 | 123.131 |
| 1920×1080 | 37,121.200 | 6,979.820 | 1,035.810 | 262.962 |

“每步传输”会为三个操作分别上传、下载；“仅上传/下载一次”把中间图像留在 GPU，只上传输入并下载最终结果。Device only 从已有显存图像开始计时，包含三个操作完成后的同步。下载结果与 CPU 处理链逐字节一致。

如果后面接 GPU 推理，可以继续把处理后的图像和张量保留在显存中。应用需要 CPU 图像用于显示或其他处理时，将最终下载计入对应流程的耗时。[三轮原始 CSV](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/device_image_chain_rtx3060_cuda12_2.csv) 保存了表中使用的全部数据。

使用同一份 CUDA 构建运行链式处理测试：

```bash
for run in 1 2 3; do
  INSPIRECV_DEVICE_IMAGE_BENCHMARK_SAMPLES=51 \
  INSPIRECV_DEVICE_IMAGE_BENCHMARK_REPORT="device_chain_run${run}.csv" \
    ./build-cuda/inspirecv_tests cuda_device_image_chain_benchmark
done
```

## 其他测试记录 {#more-recorded-workloads}

仓库中还有以下报告，可以按应用的输入格式和执行方式选择查看。

| Report | 测试内容 |
| --- | --- |
| [CUDA Image geometry](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/image_host_rtx3060_cuda12_2.csv) | 143 组操作、类型和尺寸组合，覆盖缩放、仿射和旋转，包含主机内存传输。 |
| [CUDA YUV preprocessing](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/task_yuv_rtx3060_cuda12_2.csv) | NV12 转 RGB float32 CHW，采用最近邻采样，分别记录 CPU、主机往返和纯设备耗时。 |
| [CUDA Task batching](https://github.com/tunmx/InspireCV/blob/main/benchmarks/cuda/task_batch_rtx3060_cuda12_2.csv) | 320×240 BGR 显存输入转 112×112 CHW 张量，batch size 为 1、4、8、16。 |

比较两个 InspireCV 版本时，可使用[版本对比工具](https://github.com/tunmx/InspireCV/blob/main/scripts/benchmark/README.md)。工具会成对执行两份程序、保存原始结果，并支持用同一程序做 A/A 对照。新结果中记录代码版本、构建选项和测试机器，方便下一轮复测。
