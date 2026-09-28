# ARM {#arm}

InspireFace 可以在移动设备、嵌入式 Linux 和 Apple Silicon 等 ARM CPU 平台上运行。ARM 优化覆盖图像预处理、模型推理和特征比对，并通过复用会话减少连续帧中的重复工作。

SDK 使用 InspireCV 完成缩放、通道转换等图像操作，并在支持的格式上使用 ARM NEON 路径。CPU 推理后端也针对 ARM 指令集和计算内核做了适配，用于加速模型执行。SDK 在模型输入准备和特征比对上进一步减少逐帧开销。

<div class="doc-flow">
<div><strong>1 · 图像输入</strong><span>像素格式、行步长和方向</span></div>
<div><strong>2 · 预处理</strong><span>缩放、对齐与模型输入准备</span></div>
<div><strong>3 · CPU 推理</strong><span>使用 ARM 适配的计算路径</span></div>
<div><strong>4 · 结果处理</strong><span>跟踪、特征与相似度计算</span></div>
</div>

## ARM 图像与特征计算优化 {#image-and-feature-operations-on-arm}

InspireCV 默认的 Image 后端针对支持的数据类型和通道数提供向量化处理路径。NEON 可以在一条指令中处理多个数据；算子还会减少重复的坐标计算，并针对常见变换组织像素读写。

| Operation | 实现方式 | 使用场景 |
| --- | --- | --- |
| Resize | 预计算并复用横向采样位置和插值权重，在支持的算子中使用 NEON。 | 检测预览图、固定尺寸的模型输入。 |
| WarpAffine | 分别处理恒等、缩放 / 平移和通用仿射变换，对支持的采样操作进行向量化。 | 人脸对齐、变换后的局部图像。 |
| Rotate / flip | 对支持的格式使用分块转置、向量读写。 | 摄像头方向调整、预览准备。 |
| Color conversion | 对 RGB / BGR 通道交换和灰度转换进行向量化。 | 将图像通道顺序匹配到后续处理。 |
| Feature comparison | SDK 的 ARM NEON 点积一次处理 4 个浮点分量。 | 人脸特征之间的相似度计算。 |

其他组合使用通用 CPU 实现，向量块未覆盖的尾部数据也有标量处理。实际使用哪条路径，取决于操作、像素类型、通道数和编译目标。[InspireCV 使用指南](../guides/inspirecv.md)提供图像 API 与坐标变换示例。

## 减少连续帧中的重复工作 {#reuse-work-across-frames}

SDK 还通过以下方式减少连续帧处理的开销，这些优化同样适用于其他 CPU 平台：

- **跳过不必要的缩放。** 输入已经符合模型所需尺寸时，适配层直接使用像素视图，省去再次缩放。
- **复用转换器和张量对象。** 推理适配层缓存输入 / 输出的 CPU 张量与图像转换器，在相关形状或配置变化时重建。
- **通过视图读取检测输出。** 检测后处理直接读取推理结果，减少复制到中间向量的开销。
- **持续复用跟踪会话。** `LIGHT_TRACK` 利用前帧信息，按需运行检测。单帧开销与发现新脸速度的取舍见[跟踪模式与延时](../guides/tracking.md#pick-a-mode-for-the-input)。

处理一段视频时，持续保留模型和会话。借用的像素与结果视图需要在使用期间保持有效；哪些数据需要保留或复制，见[架构与生命周期](../guides/arch.md)。

## 可选的 Task 预处理 {#optional-task-preprocessing}

InspireCV Task 将几何采样、颜色转换、归一化和张量布局写入组织到同一条预处理流程中。通用执行路径按小块处理并复用临时缓冲，减少每个阶段都生成一张完整中间图的开销。

| Stage | 处理内容 |
| --- | --- |
| Camera formats | 采样 NV12、NV21、I420，并转换为 RGB 系列输出格式。 |
| Tensor values | 将字节转换为浮点值，按通道执行 `(value - mean) × scale`。 |
| Tensor layout | 按 HWC 或 CHW 布局直接写入调用方的张量缓冲。 |
| Repeated execution | 复用 Pipeline 配置，通过 `RunInto` 或 `TensorBuffer` 使用已有输出存储。 |

以上是应用可以直接使用的 Task 能力。InspireFace 设置 `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS=ON` 后，也会使用 Task 处理相机图像流；这个 SDK 选项**默认关闭**。该开关选择图像流预处理后端，模型专用的归一化与张量准备仍由对应适配层处理。直接调用 Task 的方法见[预处理示例](../guides/inspirecv.md#task-preprocessing)。

### 在 ARM64 Linux 上构建 Task 路径 {#build-the-task-path-on-arm64-linux}

完成[源码准备](../build/source.md)后，在配有本机编译器的 ARM64 Linux 设备上运行以下命令，生成启用 Task 的 CPU 动态库：

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

SDK 安装到 `build/arm-cpu-task/install/InspireFace`。交叉编译或移动平台使用对应的[平台构建方法](../build/README.md#choose-a-build-guide)，在其工具链配置中加入这些选项。

`INSPIRECV_TASK_ENABLE_ARM_NEON` 默认是 `ON`，控制 Task 中显式的 NEON 路径，并不控制全部 Image 算子或编译器自动向量化。NEON 支持在编译时确定；启用 NEON 的 ARMv7 产物需要在支持这些指令的处理器上运行。选择 Task 或默认预处理路径时，在目标设备上用相同输入格式与变换参数进行对比。

## 选择设备对应的 SDK {#choose-the-sdk-for-the-device}

CPU SDK 使用 `Pikachu`、`Megatron` 等 CPU 模型包，下载入口见[概述与下载](../build/README.md)。选择库时，同时匹配操作系统、进程架构和 C 运行库：

| Target | Architecture / ABI | 构建与接入 |
| --- | --- | --- |
| Linux | ARM64 `aarch64`；ARMv7 hard-float | [构建](../build/linux.md#cross-compile-for-arm) · [C API](./c-cpp.md) · [Python 打包](../build/python.md) |
| Android | `arm64-v8a`；`armeabi-v7a` | [构建](../build/android.md) · [摄像头接入](./android.md#process-camera-frames) |
| iOS | 真机 `arm64` | [构建](../build/ios.md) · [C/C++ 接入](./ios.md) |
| HarmonyOS | `arm64-v8a` | [构建](../build/harmonyos.md) · [ArkTS 接入](./harmonyos.md) |
| macOS Apple Silicon | 原生 `arm64` 进程 | [构建](../build/macos.md) · [C++](./cpp.md) · [Python](./python.md) |

Linux 上还需要让 glibc / uClibc 和编译器运行库与板端系统匹配。Apple Silicon 上通过 Rosetta 运行的 x86_64 进程，需要使用 x86_64 SDK。使用 Rockchip NPU 时，按[对应部署章节](./rknpu.md)准备 SDK、模型与驱动。

## 让相机处理保持低延时 {#keep-the-camera-loop-efficient}

1. **按真实图像布局接入。** 使用相机输出且 SDK 支持的像素格式，减少 YUV、RGB、BGR 之间的来回转换。原始 C 图像流要求行数据紧密排列；有 padding 或独立平面的输入按[图像输入说明](../guides/image-inputs.md)整理。
2. **按业务需要控制计算量。** 选择模型支持的检测尺寸，按需调整预览尺寸，设置实际需要的人脸数量，只启用用得到的分析项。缩小尺寸时，同时检查小脸的检出情况。
3. **一路序列持续使用一个会话。** 按顺序送入帧并复用会话，保留较短的输入队列，避免旧帧积压带来显示延迟。
4. **持续运行后再比较。** 预热后分别记录预处理、跟踪、可选分析和整帧耗时，比较中位数与 p95，也观察设备升温后的表现。

NEON 的收益与具体算子、编译器和 CPU 有关。更换预处理路径时，同时比较输出结果和耗时。[性能测量](../guides/benchmark-remark(updating).md)提供完整计时示例，[图像处理性能](../guides/image-processing-benchmarks.md)说明了如何区分图像操作与完整 SDK 调用的耗时。
