# 常见问题 {#troubleshooting}

先用本地模型文件和一张已知图像跑通，再逐步添加分析选项、跟踪、摄像头和硬件预处理。这样更容易区分库加载问题与图像格式问题。

## 确认实际加载的 SDK {#identify-the-loaded-sdk}

当前 1.2.4 Python 封装与匹配的原生库可以这样检查：

```python
import inspireface as isf

print("Python package:", isf.__version__)
print("Native SDK:", isf.version())
print("C API level:", isf.c_api_level())
print(isf.diagnostic_info())
```

同时检查 Python 包版本和原生 SDK 版本。如果设置了 `INSPIREFACE_LIBRARY_PATH`，也记录这个路径：程序会加载它指定的原生库，替代 wheel 自带的库。

上面的诊断调用使用 SDK 1.2.4。较早的 SDK 可以记录 `isf.version()` 和加载的库路径。

## 导入或加载库失败 {#library-import-or-loading-fails}

| 现象 | 检查内容 |
| --- | --- |
| `wrong architecture`、无效 ELF 或不兼容的 Mach-O | 库架构须与运行进程一致，包括模拟运行或 32 位 Python。 |
| 缺少依赖的 `.so` 或 `.dylib` | 检查原生依赖，安装该构建所需的运行库。 |
| 更新 Python 文件后提示缺少函数 | 将封装和原生库一起更新到配套的构建。 |
| 本机能导入，设备上失败 | 检查 libc 兼容性、目标 ABI 和打包的依赖路径。 |

Linux 使用 `ldd /path/to/libInspireFace.so` 查看动态依赖；macOS 使用 `otool -L /path/to/libInspireFace.dylib`。

在首次导入前设置 `INSPIREFACE_LIBRARY_PATH`。修改路径后，重新启动进程以加载指定的库。

## Apple Framework 或相机接入失败 {#apple-integration-fails}

| Symptom | 排查方向 |
| --- | --- |
| `No such module InspireFaceSwift` | 将同一构建中的两个 XCFramework 都加入 Swift target；检查 Framework Search Paths，以及包内是否有目标平台和架构。 |
| 链接器报告 iOS 与 iOS Simulator 不匹配 | 选择模拟器切片。真机 `arm64` 与模拟器 `arm64` 属于不同平台目标；使用 XCFramework 让 Xcode 自动选择。 |
| 原生符号重复 | 移除重复的 SDK 或推理库。新版 iOS `InspireFace.framework` 已经包含静态推理依赖。 |
| macOS 启动时找不到 Framework | Swift 应用需要嵌入并签名两个动态 Framework；检查应用内的 Frameworks 目录和 runpath。命令行程序用 `-rpath` 指定 Framework 所在目录。 |
| iOS Framework 嵌入或签名失败 | 新版 iOS Framework 为静态库，选择 **Do Not Embed**；应用 target 的签名配置独立于 SDK 构建。 |
| Pixel buffer 构造返回错误 | 检查实际像素格式、每行字节数和各平面布局。带行填充的 BGRA、平面不连续的 NV12 需先重新排列，再交给借用缓冲区接口。 |
| 下一帧之后，先前结果发生变化 | 借用指针被保留到了有效范围之外。叠加显示可复制几何数值；延后处理则保留 snapshot 与对应像素。 |
| 封装报告无效句柄 | 检查对象或其所有者是否已经关闭。继续持有已关闭对象的强引用，不会重新打开原生句柄。 |

链接配置见 [iOS](../using-with/ios.md) 与 [macOS](../using-with/macos.md)。[Apple API 指南](../using-with/apple.md)提供完整的 `NSError` 和 Swift `throws` 示例。记录错误时保留 domain、数值 code 和 message。

## 模型启动失败 {#model-launch-fails}

如果下载的是 ZIP 压缩包，先解压，再把模型包文件传给 SDK。核对下载文件的大小和校验值。

然后检查模型包与后端：`Megatron_TRT` 需要 TensorRT 构建，`Gundam_*` 需要对应的 Rockchip 目标。当前构建可使用 `validate_resource_pack(path)` 区分资源格式问题与后续会话初始化问题。

应用启动时加载一次模型。加载失败时记录错误，修正资源或环境后再创建会话。

## 检测不到人脸 {#detection-returns-no-faces}

“无人脸”是处理成功但返回空列表或零数量的正常结果。先测试清晰、正向的人脸图像，再检查：

- 像素格式：BGR 缓冲区标为 RGB 时，数组形状可能正确，但通道顺序错误。
- 旋转：避免先旋转像素，再让 SDK 执行一次相同修正。
- 输入内存：行数据紧密排列、尺寸有效，缓冲区在整个处理期间保持有效。
- 人脸大小：远处的小脸可能需要更高的受支持检测级别；最小人脸尺寸过滤也可能移除结果。
- 模式：不相关的静态图片使用 `ALWAYS_DETECT`，有序视频帧使用跟踪模式。

将实际提交给 SDK 的缓冲区保存成图像，对照相机预览检查颜色和方向，并确认行间是否有填充字节。

## 人脸框或关键点在预览中偏移 {#boxes-or-landmarks-drift-over-the-preview}

检查原始帧到显示画面的变换。预览的中心裁剪、缩放、旋转和前置镜像都会影响绘制。在画面中心和各个边缘分别测试。详见[坐标处理](./image-inputs.md#rotation-and-display-coordinates)。

## 分析结果缺失或始终不变 {#pipeline-output-is-missing-or-unchanged}

创建会话时启用所需选项，运行分析流水线时再次请求对应功能。调用成功后，读取已启用选项的结果。

使用当前帧对应的 token，并保留图像。C 中普通跟踪结果和部分 getter 数组是借用缓冲区，需要在后续调用覆盖前复制。各类生命周期见[架构说明](./arch.md)和 [C 接入指南](../using-with/c-cpp.md#image-buffers-and-ownership)。

## 识别或检索结果不符合预期 {#recognition-or-search-results-look-wrong}

录入时明确选择目标人脸，使用同一模型生成的兼容向量，并在读取检索身份前检查 `matched`。Eager 搜索可能返回第一条满足阈值的记录；需要最佳匹配时使用 exhaustive 搜索。

识别使用 cosine similarity 阈值。检测置信度、活体置信度和抓拍评分各有自己的判断条件。识别阈值的选择与模型迁移见[识别与特征库](./recognition.md)。

## 抓拍始终无法就绪 {#capture-never-becomes-ready}

持续送入新帧，保证 ID 和毫秒时间戳递增。检查 `reject_reasons` 和 `metrics.available_filters`。人数过滤需要会话能够检测多张人脸，姿态和质量过滤则需要启用对应会话选项。

使用快照时，为每个新帧创建快照，让跟踪次数随视频推进。处理离线视频时，使用视频本身的时间戳。

## 内存或延迟持续增长 {#memory-or-latency-grows-over-time}

复用会话，及时释放图像流和独立创建的检测快照，只缓存需要的候选图像。避免无限增长的帧队列，也不要默认保存所有特征向量或预览位图。释放工作线程的会话前，先停止提交任务。

测量内存时，区分稳定的分配器或运行时缓存，以及未释放句柄的持续增加。当前 Python API 提供 `show_system_resource_statistics()` 查看 SDK 资源计数，可以比较多轮创建、使用、释放后的数量。

## 在哪里关注 SDK 的最新更新？ {#follow-sdk-development}

需要更快的问题响应和 SDK 版本更新，可以关注 [develop 仓库](https://github.com/HyperInspire/InspireFace)。

## 提供可复现的问题 {#share-a-reproducible-issue}

附上原生版本、封装版本、模型标识、平台与后端、准确错误码，以及最小可复现输入或代码。摄像头问题还需说明提交的格式、尺寸、步长和旋转，并附上可公开的测试图片。

所有问题统一提交到 [InspireFace Issues](https://github.com/HyperInspire/InspireFace/issues)。
