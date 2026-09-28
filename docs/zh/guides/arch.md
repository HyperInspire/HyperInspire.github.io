# 架构与生命周期 {#architecture-and-lifetime}

应用主要使用四类对象：已加载的资源包、Session、图像流和每次调用的结果。资源包由进程共享，各工作线程管理自己的 Session、输入帧和结果。

<div class="doc-flow" aria-label="处理流程">
  <div><strong>资源包</strong><span>每个进程加载一次</span></div>
  <div><strong>会话</strong><span>模型与跟踪状态</span></div>
  <div><strong>图像流</strong><span>当前帧的像素和格式</span></div>
  <div><strong>人脸结果</strong><span>几何信息、分析结果和特征</span></div>
</div>

## 进程级状态 {#process-wide-state}

`HFLaunchInspireFace` 加载资源包，供后续创建的会话使用；Python 中对应 `launch`。关键点引擎和图像处理后端等设置应在创建会话前完成。

FeatureHub 提供进程级的特征存储和检索，有独立的启用和关闭流程。特征由 Session 提取；应用需要管理特征库时，再启用 FeatureHub。

在应用启动时加载资源，工作线程停止后再释放。更换模型包时，创建新的 Session，并为特征库准备与新识别模型兼容的特征。

## 会话状态 {#session-state}

会话持有创建时选定的推理模块、工作缓冲区和跟踪历史。处理静态图片的工作线程可以在 always-detect 模式下复用一个会话；视频工作线程应使用跟踪会话处理一段有序序列。

每个工作线程或相机序列使用独立的 Session，分别保留该路输入的跟踪历史和工作缓冲区。

## 帧与结果 {#frames-and-results}

C API 的原始缓冲区图像流借用应用持有的内存。所有消费者完成处理后，再把缓冲区归还相机。如果要把任务送入队列，需保留缓冲区，或提前复制像素。

<figure>
<a href="/images/sdk-result-lifetime.svg" target="_blank" rel="noopener"><img class="doc-diagram" src="/images/sdk-result-lifetime.svg" alt="像素、C 检测视图与 owned snapshot 的生命周期" loading="lazy" /></a>
<figcaption>异步提取特征时，同时保留检测结果和对应帧的像素。</figcaption>
</figure>

| Data | 生命周期与使用方式 |
| --- | --- |
| Camera bytes | 保留相机缓冲区，直到所有使用该帧的操作结束。 |
| C detection view | 结果由会话管理，需在下一次跟踪前读取或复制，也可以创建独立的检测快照。 |
| Owned detection snapshot | 快照保存检测数据，使用后显式释放；原始像素由应用另行保留。 |
| Borrowed feature cache | 特征缓存可能被下一次提取覆盖；需要保留时先复制，或直接提取到独立缓冲区。 |
| Python face/feature objects | 封装会复制 token 和特征数组；原图另行保留。 |
| Capture candidate | 根据候选结果的帧 ID，查找应用保存的原始图像。 |

::: warning 如何保留检测结果
快照会复制检测结果，生命周期更清晰，保留结果或延后处理时更好用，也能减少生命周期处理出错的风险，但会增加复制开销和延时。对应帧的像素仍需单独保留。

直接使用 C API 时，单路视频按顺序跟踪可以读取 `HFExecuteFaceTrack` 返回的借用结果，省去这次复制。需在下一次跟踪前读完；后续调用可能覆盖这些结果，不适合跨帧保留或交叉复用。
:::

## 工作线程的组织方式 {#a-useful-worker-layout}

```text
application startup
  load resource pack
  enable gallery if needed
  create one session per worker

camera worker
  receive frame
  create/update stream
  detect or track
  run analysis / extract features for that frame
  copy results needed by another worker
  release stream / return camera buffer

application shutdown
  stop incoming frames and join workers
  release capture objects and sessions
  disable gallery
  terminate SDK
```

相机采集和队列调度由应用负责。为队列设置长度上限；交互式预览可以丢弃尚未处理的旧帧，及时跟上实时画面。

## InspireCV 的作用 {#where-inspirecv-fits}

InspireCV 提供图像存储、几何计算、绘制和预处理。它的 `task::Pipeline` 可以将相机输入写入图像或张量缓冲区。InspireFace 还在 `inspirecv` 命名空间下提供自己的 `FrameProcess` 封装。

在 InspireFace 内部使用 Task 预处理时，构建 SDK 时设置 `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS=ON`。

## 计算后端 {#backends}

选择 MNN、TensorRT、CoreML 或 Rockchip RKNN 构建，并搭配对应的模型包和运行时依赖。图像预处理单独配置，例如 Rockchip RGA 用于支持的图像格式转换和几何变换。

实际配置见[模型与构建](./models-and-builds.md)、[图像输入](./image-inputs.md)和[识别与特征库](./recognition.md)。

<figure>
<a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/mem_model.drawio.png" target="_blank" rel="noopener"><img class="doc-diagram" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/mem_model.drawio.png" alt="InspireFace 架构图：Session、图像、App Context、FeatureHub 与底层引擎" width="692" height="552" loading="lazy" /></a>
<figcaption>模块关系总览。语言接口和硬件后端随版本与构建配置而定。</figcaption>
</figure>
