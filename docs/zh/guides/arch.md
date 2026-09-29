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

## Java 对象的生命周期 {#java-object-lifetimes}

JVM 接口使用 `long` 表示 Session、图像流、位图、快照和抓拍句柄。Java 引用或垃圾回收不会释放这些资源，应在 `finally` 中调用对应的 `HFRelease…` 函数。用 `HFCreateFaceFeature` 分配的特征支持通过 `HFFaceFeature.close()` 配合 try-with-resources 释放。

| Data | 生命周期与使用方式 |
| --- | --- |
| Java-owned direct image buffer | JNI 保留缓冲区引用，直到图像流释放或替换输入；处理完成前不要改写其中的字节。 |
| Bitmap pixel view | `ByteBuffer` 借用原生像素；图像流或其他操作仍使用该视图时，不能释放位图。 |
| Tracking / pipeline result | 部分元数据会复制到 Java 字段，token 字节和数值结果缓冲区仍可能借用 Session 内存；在后续调用覆盖前读完。 |
| Detection snapshot | 检测数据保留到 `HFReleaseFaceResultSnapshot`；对应帧的像素另行保存。 |
| Owned feature | 仅释放 `HFCreateFaceFeature` 创建的特征；不能把借用的提取结果或 FeatureHub 特征当成独立特征释放。 |

每个串行工作线程使用独立的 Session，运行时与 FeatureHub 的全局修改统一调度。其他线程需要使用结果时，在提交下一帧之前复制所需的数据。[Java 接入](../using-with/java.md)中有缓冲区规则与资源释放示例。

## Android 对象的生命周期 {#android-object-lifetimes}

Android 1.2.4.post1 提供两种调用方式。`InspireFace` 高层接口返回 Java 自有的人脸数组、token 与特征副本；`com.insightface.sdk.inspireface.jni.Native` 则保留 C API 的句柄与借用缓冲区规则。跨帧保留结果时，先确认使用的是哪一层。

| Object / view | 有效范围 |
| --- | --- |
| `Session` / `ImageStream` | 实现 `AutoCloseable`，可以用 try-with-resources，或在工作线程结束时调用 `close()`。 |
| `InspireFace.ExecuteFaceTrack` result | 数组、姿态与 token 已复制；后续跟踪不会覆盖这些 Java 值。提取特征仍需保留对应帧的像素。 |
| `FaceDetectionSnapshot.getFaces()` | 返回 Java 自有副本，可在 snapshot 关闭后读取；snapshot 自身仍需关闭。 |
| `FaceCapture.getResults()` | token 和元数据是副本，图像由应用按 frame ID 单独缓存。 |
| `Native.HFExecuteFaceTrack` result | `ByteBuffer` 可能借用 Session 存储；在覆盖或释放前使用，或者创建独立 snapshot。 |

用 `InspireFace.CreateImageStreamFromBitmap` / `CreateImageStreamFromByteBuffer` 创建的流，通过 `ImageStream.close()` 或 `InspireFace.ReleaseImageStream` 释放；用 `Native.HFCreateImageStream` 创建的流，通过 `Native.HFReleaseImageStream` 释放。两层对输入缓冲区的持有方式不同，不能交叉使用释放函数。

先停止输入并结束工作线程，再关闭抓拍、快照和输入流，最后关闭 Session 并终止运行时。同一 Session 的调用按顺序处理，FeatureHub 与全局模型状态也统一调度。完整写法见 [Android 接入](../using-with/android.md)。

## Apple 对象的生命周期 {#apple-object-lifetimes}

Objective-C 的 `IFSession` 和 Swift 的 `FaceSession` 持有原生 Session 句柄。封装对象销毁时，ARC 会触发资源释放；相机工作线程或单次任务结束后，也可以用 Swift 的 `close()` 或 Objective-C 的 `closeWithError:` 在确定的时机释放资源。对象关闭后，即使仍有其他强引用，原生数据也已失效。

| Object / view | 有效范围 |
| --- | --- |
| Raw-buffer image stream | 图像流借用像素，调用方需在处理期间保持内存有效且不被改写。 |
| `CVPixelBuffer` image stream | 封装保留并锁定缓冲区，直到图像流关闭或替换输入；支持的像素布局必须紧密排列。 |
| `withUnsafeFaces` / `withBorrowedFacesFromStream` | 在回调内读取结果并完成同帧分析；不保留其中的指针，也不在回调内发起下一次跟踪。 |
| `FaceSnapshot` / `IFFaceSnapshot` | 持有复制后的人脸检测数据，直到关闭；不保留原图像素。 |
| `FaceFeatureBuffer` / `IFFeatureBuffer` | 持有特征内存；`borrowedFeature` 指向该内存，关闭后失效。 |
| Capture and FeatureHub result views | 需要延后使用的值，应在后续操作覆盖底层存储前复制。 |

Swift 的作用域辅助方法返回 `UnsafeBufferPointer` 视图，不会自动分配数组。需要复制值时可以使用 `Array(view)`，但只复制 token 结构体不会复制 token 指向的字节。需要延后处理人脸时，保留 snapshot 和对应帧。位图的 `snapshotStream` 是另一种操作，会复制像素。

每个 Session 与相机队列放在同一个串行工作线程中使用。封装不会让共享的原生状态自动具备线程安全性，进程级运行时和 FeatureHub 的修改也应统一调度。退出时先结束工作线程，再关闭对象和运行时。直接通过暴露的句柄调用 C API，会绕过封装层的作用域访问检查。

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

当前源码构建默认启用 `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS=ON`，使用 Task 预处理；设为 `OFF` 可使用旧预处理路径。

## 计算后端 {#backends}

选择 MNN、TensorRT、CoreML 或 Rockchip RKNN 构建，并搭配对应的模型包和运行时依赖。图像预处理单独配置，例如 Rockchip RGA 用于支持的图像格式转换和几何变换。

实际配置见[模型与构建](./models-and-builds.md)、[图像输入](./image-inputs.md)和[识别与特征库](./recognition.md)。

<figure>
<a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/mem_model.drawio.png" target="_blank" rel="noopener"><img class="doc-diagram" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/mem_model.drawio.png" alt="InspireFace 架构图：Session、图像、App Context、FeatureHub 与底层引擎" width="692" height="552" loading="lazy" /></a>
<figcaption>模块关系总览。语言接口和硬件后端随版本与构建配置而定。</figcaption>
</figure>
