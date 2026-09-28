# 介绍 {#introduction}

InspireFace 是一个用于处理图片和视频中人脸的 C/C++ SDK。它可以检测人脸、跨帧跟踪、提取关键点和特征向量，也可以按需进行姿态、质量和 RGB 活体分析。你负责提供图像并使用结果；相机和应用界面由应用自身管理。

C、C++、Python、Android Java、HarmonyOS ArkTS、Objective-C 和 Swift 都采用相同的处理流程。Apple 接口覆盖 iOS 与 macOS，支持图像输入、跟踪、分析、识别和抓拍。

<figure>
<img class="doc-banner" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/banner.webp" alt="InspireFace 的检测、关键点、识别、活体与多平台部署示意" width="2048" height="683" />
</figure>

## 一个典型应用的处理流程 {#what-a-typical-application-does}

1. 应用启动时加载一次模型资源包。
2. 根据输入类型和所需功能创建会话。
3. 提交图片或相机帧，获取人脸列表。
4. 读取关键点、提取特征向量，或执行额外分析。
5. 释放当前帧的资源，工作线程结束时再释放会话。

人脸的 **track ID** 用于关联同一视频会话中的连续检测结果。跨图片或跨会话比对身份时，提取特征向量，再进行比对或特征库检索。

| Task | 说明 | 继续阅读 |
| --- | --- | --- |
| Detection and tracking | 返回人脸框、检测置信度、track ID 和跟踪次数。 | [会话与跟踪](./guides/tracking.md) |
| Landmarks and pose | 返回关键点坐标，启用姿态选项后还可读取 roll、yaw、pitch。 | [人脸关键点](./guides/dense-landmark.md) |
| Recognition | 提取特征向量，用于人脸比对与检索。 | [人脸识别](./guides/recognition.md) |
| Face capture | 根据质量和稳定性等条件，从视频中选出少量候选帧。 | [人脸抓拍](./guides/face-capture.md) |
| Liveness and actions | 返回 RGB 活体分数、睁闭眼状态和动作事件。 | [活体检测](./guides/liveness-detection.md) |

<div class="doc-image-grid">
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/blogs_box/o-10.gif" alt="头部转动时的关键点跟随" width="200" height="200" loading="lazy" />
</figure>
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/o-4.gif" alt="局部手部遮挡下的关键点示例" width="240" height="240" loading="lazy" />
</figure>
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/out-8.gif" alt="表情变化时的关键点跟随" width="200" height="200" loading="lazy" />
</figure>
</div>

## 快速体验 {#quick-start}

### 体验 Android 示例应用 {#try-the-android-example-app}

可以先用 Android 应用体验检测、跟踪、识别和活体流程，再开始集成 SDK。

<div class="demo-download">
  <a class="no-external-link-icon" href="http://fir.tunm.top/pro/pz7b3dgv">
    <img src="/images/inspireface-android-example-app-download.png" alt="InspireFace Android 示例应用下载二维码" width="176" height="176" />
  </a>
  <div>
    <p><a href="http://fir.tunm.top/pro/pz7b3dgv">安装 Android 体验应用</a>，也可以用手机扫描二维码。</p>
    <p>在光线充足的环境中，让人脸对准相机提示框。应用的 <strong>Anti-fraud</strong> 菜单包含静默活体和动作活体演示。</p>
    <p>可选的 <strong>PLUS</strong> 被动活体和炫光活体演示需要联网调用服务，详情见<a href="./guides/liveness-detection.html#optional-plus-demos">活体检测指南</a>。</p>
  </div>
</div>

准备写代码时，可以从[单张图片的 Python 示例](./get-started.md)或[完整 C 示例](./using-with/c-cpp.md)开始，两者都直接读取本地图片。

## 新特性：移动端实时活体检测 [Plus] {#new-mobile-real-time-liveness-plus}

Plus 新增被动活体与炫光活体，通过移动端实时采集、服务端校验，兼顾高精度检测和移动端低功耗。两种方式都使用普通 RGB 相机：被动活体要求保持正脸，炫光活体会在屏幕上显示颜色序列。

<div class="doc-image-grid two-column">
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="面对手机完成被动活体采集的示意" width="1536" height="1024" loading="lazy" />
<figcaption><strong>Passive Liveness [Plus]</strong>：采集连续有效帧，无需眨眼或转头指令。<a href="./feature.html#passive-liveness-plus">查看功能说明</a>。</figcaption>
</figure>
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/light_liveness.webp" alt="通过屏幕颜色变化采集人脸响应的炫光活体示意" width="1536" height="1024" loading="lazy" />
<figcaption><strong>Flash Liveness [Plus]</strong>：将屏幕颜色变化与前置相机采集配合，记录人脸在不同光照下的响应。<a href="./feature.html#flash-liveness-plus">查看功能说明</a>。</figcaption>
</figure>
</div>

上方 Android 演示目前通过联网服务完成校验，可用来体验完整的采集、等待和结果反馈。具体流程、设备条件和重试处理见 [Plus 活体指南](./guides/liveness-detection.md#optional-plus-demos)。

## 选择接入语言 {#choose-a-language}

| Interface | 适用场景 |
| --- | --- |
| [C API](./using-with/c-cpp.md) | 原生应用、FFI 封装，以及需要明确管理资源所有权的集成。也可在 C++ 中使用。 |
| [Python](./using-with/python.md) | 原型、脚本和服务，可直接传入 NumPy 数组。 |
| [C++](./using-with/cpp.md) | 希望使用 `Session`、`Image` 和 `FrameProcess` 对象的应用。头文件和库需要来自同一版本。 |
| [Android](./using-with/android.md) | 通过 JNI 封装接入的 Java 或 Kotlin 应用。 |
| [Objective-C / Swift](./using-with/apple.md) | Apple 原生接口，使用 NSError / throws 处理错误，并显式管理缓冲区和资源。 |
| [iOS](./using-with/ios.md) | Xcode 接入、真机与模拟器构建、相机像素缓冲区。 |
| [macOS](./using-with/macos.md) | Intel 与 Apple Silicon 应用、动态 Framework 和原生命令行工具。 |
| [HarmonyOS](./using-with/harmonyos.md) | 通过源码中的 Node-API 适配层接入 ArkTS 应用。 |

## SDK、模型与计算后端 {#sdk-models-and-backends}

SDK 库提供运行时，**资源包**包含模型及其配置，两者缺一不可。没有特定硬件要求时，可以先使用 CPU 版本和 `Pikachu` 模型包。

使用硬件加速时，选择目标后端对应的 SDK 和模型包，并安装所需的运行库。具体配置见[模型资源包指南](./guides/models-and-builds.md)。

InspireCV 负责图像操作和预处理。即使应用不需要人脸识别，也可以单独使用它的 [Image 和 Task API](./guides/inspirecv.md)。

预编译 SDK 的平台、版本和下载源见[概述与下载](./build/README.md)。需要自行编译时，按[获取和编译](./build/README.md#choose-a-build-guide)中的平台章节操作；Python 更换 `.so` / `.dylib` 和制作 wheel 有[独立章节](./build/python.md)。

## 示例对应的版本 {#about-these-examples}

Native 和 Python 示例使用 InspireFace **1.2.4**，图像处理示例使用 InspireCV **1.0.2**，Android 示例会注明所需的 Java SDK 版本。添加快照、抓拍或诊断等调用时，也要保持语言封装、头文件和原生库配套。

在 [SDK Releases](https://github.com/HyperInspire/InspireFace/releases) 和 [Python 包文件列表](https://pypi.org/project/inspireface/#files)中选择适合平台的版本。[常见问题](./guides/troubleshooting.md#identify-the-loaded-sdk)说明了如何查看应用实际加载的版本。

## 文档版本 {#documentation-version}

<script setup>
const docsRelease = __DOCS_RELEASE__
</script>

当前文档：**{{ docsRelease.version }}**，对应 SDK **{{ docsRelease.sdkVersion }}** 的第 **{{ docsRelease.revision }}** 版文档。

站点名称旁的版本号采用 `SDK 版本.dN`。前半部分取自本文档对应的开发仓库源码版本，`dN` 表示该 SDK 版本下的第几版文档。同一 SDK 下每次更新文档，序号加一；文档跟进新的 SDK 版本时，从 `d1` 重新计数。

预编译 SDK 和 Python 包有各自的发布版本，下载时请以[概述与下载](./build/README.md)中的信息为准。
