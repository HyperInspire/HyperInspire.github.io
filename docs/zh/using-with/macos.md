# macOS {#macos}

AppKit / SwiftUI 应用可以使用 Objective-C 或 Swift，已有原生程序也可以继续使用 C/C++。Apple SDK 与 iOS 共用一套包装接口，macOS Framework 可以同时包含 Apple Silicon 和 Intel 架构。

JVM 应用使用 JAR 与配套的 `.dylib`，按 [Java 接入](./java.md)操作。

架构选择、CPU / CoreML 构建及命令行检查见 [macOS 构建](../build/macos.md)。[Objective-C 与 Swift 接入](./apple.md)提供完整的文件检测代码和资源管理说明。

## 选择 SDK 包 {#select-the-package}

| App | Frameworks |
| --- | --- |
| Objective-C / Objective-C++ | `InspireFace.framework` 或 `InspireFace.xcframework`。 |
| Swift | 同一次构建的 `InspireFace` 与 `InspireFaceSwift`。 |
| 已有 C/C++ 程序 | 继续使用原始头文件和库，或使用核心 Framework 中的 C 头文件。 |

下载 [inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip) 即可使用 CPU SDK。包内包含两套接口，以及合并了两个架构的 macOS Framework。各架构的最低系统版本如下：

| Architecture | Minimum OS | Raw SDK directory |
| --- | --- | --- |
| `arm64` | macOS 14.0 | `SDKs/macosx-arm64/` |
| `x86_64` | macOS 15.0 | `SDKs/macosx-x86_64/` |

可以使用包根目录下的两个 XCFramework，也可以使用 `Frameworks/macosx/` 中合并架构后的 Framework。C/C++ 程序可使用对应原始 SDK 目录内的 `InspireFace/include/` 和 `InspireFace/lib/`。模型需[单独下载](../build/README.md#download-the-model-separately)。

需要 CoreML 或自定义最低系统版本时，参考 [macOS 构建](../build/macos.md)。CPU 与 CoreML 包的模块名相同，不能同时链接到一个应用。

## 在 Xcode 中链接与嵌入 {#link-and-embed-in-xcode}

macOS 的 `InspireFace.framework` 和 `InspireFaceSwift.framework` 是**动态库**。将所需的 XCFramework 或 macOS Framework 加入 App Target，选择 **Embed & Sign**。手动复制时保留 `Versions/` 目录结构。CPU 推理依赖已链接进核心 Framework。

| Setting | 配置 |
| --- | --- |
| Framework Search Paths | 直接使用 Framework 时，填写 macOS Framework 所在目录。 |
| Runpath Search Paths | 标准 macOS App Bundle 包含 `@executable_path/../Frameworks`。 |
| Other Linker Flags | 保留 `$(inherited)`；Apple Framework 接入也可使用 `-ObjC`。 |
| App architecture | 与 SDK 架构匹配；通用应用需要两个架构切片。 |
| Deployment target | 不低于各个选用切片记录的最低版本。 |

同一个可执行文件不要同时链接原始 `libInspireFace` 与核心 Framework。命令行工具需要在部署目录放置 Framework 并配置相应的 `@rpath`，不要让最终程序依赖本机 SDK 构建缓存中的路径。

## 模型文件与沙盒 {#model-files-and-the-sandbox}

随 App 分发模型时，将 `Pikachu` 加入 Copy Bundle Resources，通过 `Bundle.main.path(forResource:ofType:)` 或 `NSBundle` 获取路径。需要更新的模型可复制或下载到应用的 Application Support 目录，再启动 SDK。命令行工具可以通过参数接收模型的绝对路径。

沙盒应用读取用户选择的图片时，通过文档或文件选择流程获得访问权限；如果使用了 security-scoped access，保持访问到 SDK 完成文件读取为止。模型加载和检测放在工作队列，将复制后的坐标传回主队列绘制。

<div class="doc-flow" aria-label="macOS 图像处理流程">
  <div><strong>1 · 取得文件</strong><span>定位模型，取得图片访问权限。</span></div>
  <div><strong>2 · 初始化</strong><span>启动运行环境，复用人脸会话。</span></div>
  <div><strong>3 · 处理</strong><span>跟踪后读取特征或 pipeline 结果。</span></div>
  <div><strong>4 · 显示</strong><span>复制界面所需数据，释放本帧资源。</span></div>
</div>

[完整检测函数](./apple.md#a-complete-detection-example)可直接用于 macOS，只使用 Foundation 和 SDK 模块，不需要 UIKit 或自定义 Swift 桥接层。

## 摄像头与像素输入 {#camera-and-pixel-input}

AVFoundation 视频回调传入 `CMSampleBuffer`，通过 `CMSampleBufferGetImageBuffer` 取得图像。[像素缓冲区示例](./apple.md#pixel-buffers-and-borrowed-bytes)接受紧密排列的 BGRA、RGBA、灰度，以及连续存储的 NV12。摄像头带行填充时，可使用[完整 BGRA 行复制函数](./ios.md#camera-input-and-row-stride)。

在 Info 设置中添加 `NSCameraUsageDescription`。开启 App Sandbox 的应用还需启用 Camera 能力，打开采集设备前先请求用户授权。

每路视频使用一个串行分析队列和一个跟踪会话，限制待处理帧数量，不要将借用的人脸指针传到另一个任务或队列。图像坐标到 AppKit 显示坐标需要单独变换，也要考虑视图的 flipped 状态。

## CoreML 与运行诊断 {#coreml-and-runtime-diagnostics}

评估 Apple 加速时，使用 CoreML 构建及配套的 Apple 模型包。Intel 与 Apple Silicon 的硬件能力不同，选择 Neural Engine 模式并不代表 Intel Mac 具有这类硬件。模式设置见 [CoreML 运行模式](./apple.md#coreml-runtime-modes)。

记录性能时同时记录 SDK 版本、架构、模型包和后端。`IFDiagnostics` / `InspireFaceDiagnostics` 可查询版本与组件信息，[API 使用示例](../guides/api-recipes.md)提供具体写法。除了验证 Framework 编译，还应在各个支持架构上运行最终签名的应用。
