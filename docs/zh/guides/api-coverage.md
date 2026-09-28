# API 功能索引 {#api-coverage}

按功能和 API 查找示例。先通过平台指南完成安装和初始化，再在功能指南的代码 tab 中选择使用的 API。

示例使用 **InspireFace 1.2.4**、**InspireCV 1.0.2**、**Android Java SDK 1.2.0** 和 **HarmonyOS ArkTS SDK 1.2.4**。下表列出各接口支持的操作。

## 各 API 的功能示例 {#feature-examples-by-api}

“示例”链接指向包含对应 API 代码的指南。“源码接口”需要较新的 Java 源文件和匹配的 JNI 构建。“—”表示上述版本的高层封装没有暴露该操作。

<div class="sdk-table api-coverage-table" role="region" aria-label="各 API 的功能示例" tabindex="0">

| Feature | C API | C++ | Android | Python | HarmonyOS (ArkTS) |
| --- | --- | --- | --- | --- | --- |
| Launch / Session / release | [示例](../using-with/c-cpp.md) | [示例](../using-with/cpp.md) | [示例](../using-with/android.md) | [示例](../using-with/python.md) | [示例](../using-with/harmonyos.md) |
| Detection / tracking | [示例](./tracking.md) | [示例](./tracking.md) | [示例](./tracking.md) | [示例](./tracking.md) | [示例](./tracking.md) |
| Dense landmarks | [示例](./dense-landmark.md) | [示例](./dense-landmark.md) | [示例](./dense-landmark.md) | [示例](./dense-landmark.md) | [示例](./dense-landmark.md) |
| Five-point landmarks | [示例](./dense-landmark.md) | [示例](./dense-landmark.md) | — | [示例](./dense-landmark.md) | [示例](./dense-landmark.md) |
| Quality / mask / attributes | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) |
| Pose | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) | [Quality 兼容路径](./optional-analysis.md) | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) |
| Expression | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) | — | [示例](./optional-analysis.md) | [示例](./optional-analysis.md) |
| RGB liveness / actions | [示例](./liveness-detection.md) | [示例](./liveness-detection.md) | [示例](./liveness-detection.md) | [示例](./liveness-detection.md) | [示例](./liveness-detection.md) |
| Embedding / comparison | [示例](./recognition.md) | [示例](./recognition.md) | [示例](./recognition.md) | [示例](./recognition.md) | [示例](./recognition.md) |
| FeatureHub | [示例](./recognition.md) | [示例](./recognition.md) | [示例](./recognition.md) | [示例](./recognition.md) | [示例](./recognition.md) |
| Alignment crop | [示例](./api-recipes.md) | [示例](./api-recipes.md) | [示例](./api-recipes.md) | — | [示例](./api-recipes.md) |
| Aligned-image extraction | [示例](./api-recipes.md) | [示例](./api-recipes.md) | — | — | [示例](./api-recipes.md) |
| Similarity display conversion | [示例](./api-recipes.md) | [示例](./api-recipes.md) | [示例](./api-recipes.md) | [示例](./api-recipes.md) | [示例](./api-recipes.md) |
| Detection snapshots | [示例](./face-capture.md) | [复制结果值](./face-capture.md) | [源码接口](./face-capture.md) | [示例](./face-capture.md) | [示例](./face-capture.md) |
| Face capture | [示例](./face-capture.md) | [示例](./face-capture.md) | [源码接口](./face-capture.md) | [示例](./face-capture.md) | [示例](./face-capture.md) |

</div>

[Plus 被动与炫光活体演示](./liveness-detection.md#optional-plus-demos)在移动端采集图像，由服务端完成校验。对应指南介绍 Android 采集、进度提示和结果处理。

代码 tab 共用 API 选择状态：选中 Python、Android 或 HarmonyOS (ArkTS) 后，其他包含相同选项的代码组也会跟随切换。[完整示例](./examples.md)提供可直接复制的程序；功能指南中的片段会说明需要提前准备的会话、图像或模型。

## 输入、配置与部署 {#inputs-settings-and-deployment}

| Area | 涵盖内容 | 指南 |
| --- | --- | --- |
| SDK downloads and builds | 预编译包、各平台构建和 Python 原生库替换。 | [获取和编译](../build/README.md)、[Python 打包](../build/python.md) |
| Model loading and inspection | 加载、重新加载、验证模型包和读取元信息。 | [模型资源包](./models-and-builds.md) |
| Images and buffers | 文件与位图输入、原始 RGB/BGR/YUV、更新图像流、步长和旋转。 | [图像输入](./image-inputs.md) |
| Session tuning | 检测级别、最小人脸尺寸、置信度、预览尺寸、检测间隔和平滑。 | [会话与跟踪](./tracking.md) |
| Memory and threads | 缓冲区借用、独立结果、会话复用和工作线程退出。 | [架构与生命周期](./arch.md) |
| C ABI | 句柄、状态码和 `HFSessionConfigV2`。 | [C API](../using-with/c-cpp.md) |
| Android deployment | AAR、assets、Gradle/ABI、CameraX 和 JNI 配套。 | [Android](../using-with/android.md) |
| iOS deployment | 真机 Framework、Xcode 链接、像素缓冲区和 CoreML。 | [iOS](../using-with/ios.md) |
| HarmonyOS | HAR、ArkTS、Node-API 和 worker 资源管理。 | [HarmonyOS](../using-with/harmonyos.md) |
| ARM CPU | 图像预处理、内存复用和相机延迟。 | [ARM 部署](../using-with/arm.md) |
| NVIDIA | TensorRT SDK、CUDA 运行环境和设备选择。 | [TensorRT](../using-with/cuda.md) |
| Rockchip | SoC 模型包、工具链、RK 运行库和 RGA。 | [Rockchip](../using-with/rknpu.md)、[Rockchip Python](./python-rockchip-device.md) |
| Diagnostics | 版本、错误文本、运行诊断和资源计数。 | [补充 API 示例](./api-recipes.md)、[常见问题](./troubleshooting.md) |
| Performance | 预热、计时范围、中位数与 p95，以及排队延迟。 | [性能测量](./benchmark-remark(updating).md) |

参数类型、重载和其他设置可查阅对应 SDK 版本附带的头文件与语言封装。

## InspireCV 图像处理 {#inspirecv-scope}

InspireCV 是独立的 C++ 库。[指南](./inspirecv.md)介绍 Image 读写与常用操作、浮点图像、Task 变换与张量、错误处理、连续帧内存复用和可选 CUDA 处理。它的 `PixelFormat`、旋转和 Pipeline 类型，与 InspireFace C API 及 `FrameProcess` 分别定义。

完整公开接口可查看 [InspireFace C 声明](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/c_api/inspireface.h)、[原生 C++ 头文件](https://github.com/HyperInspire/InspireFace/tree/master/cpp/inspireface/include/inspireface)、[Python 封装](https://github.com/HyperInspire/InspireFace/tree/master/python/inspireface)、[HarmonyOS ArkTS 导出](https://github.com/HyperInspire/InspireFace/blob/master/harmony/inspireface/src/main/ets/InspireFace.ets)和 [InspireCV 头文件](https://github.com/tunmx/InspireCV/tree/main/include/inspirecv)。这些链接指向源码分支，接入某个发布包时仍以随包头文件为准。

## 接入说明 {#known-boundaries}

- 使用 Android 抓拍和快照接口时，将 Java 类和 JNI 库一起更新到指南中使用的版本。
- 复制 C++ 人脸结果向量可以保留几何信息和 token。后续还要提取特征时，同时保留对应帧的像素。
- ArkTS 跟踪快照用 `session.releaseFaceResult()` 释放；图像流、位图、抓拍会话和会话使用完后调用 `close()`。各封装对象留在创建它的 worker 中使用。
- 标准 HarmonyOS HAR 使用 MNN CPU 推理，接收原始图像缓冲区。文件解码和图像显示使用 HarmonyOS 系统 API。
- CoreML、TensorRT、RKNN、RGA 和 CUDA 预处理需要匹配的 SDK 构建与运行环境，部署步骤见对应平台指南。
