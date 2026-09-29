# Objective-C 与 Swift {#objective-c-and-swift}

iOS 和 macOS 使用同一套 Apple 接口。Objective-C 类负责持有原生句柄，Swift 在此基础上提供 `throws`、功能选项，以及限定作用域的结果访问方式。需要直接处理缓冲区时，仍可使用 C 结构体。

下载 [inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip) 即可使用 CPU SDK，包内已包含 Objective-C 和 Swift 接口。先按 [iOS](./ios.md) 或 [macOS](./macos.md) 页面配置工程，再运行下方示例。CoreML 构建方式见[获取和编译](../build/README.md)。

## 模块与类型 {#modules-and-types}

| Language | Import | Libraries |
| --- | --- | --- |
| Objective-C / Objective-C++ | `#import <InspireFace/InspireFaceApple.h>` | `InspireFace` |
| Swift | `import InspireFaceSwift` | `InspireFace` 和 `InspireFaceSwift` |
| C / C++ | `#include <InspireFace/inspireface.h>` | `InspireFace` |

Framework 带有 Clang module，Swift 库带有模块接口文件。通过模块接入时，无需自己添加 bridging header。Objective-C 文件启用 ARC；只有同一文件还包含 C++ 代码时，才需要使用 `.mm`。

| Objective-C | Swift | 用途 |
| --- | --- | --- |
| `IFRuntime` | `InspireFaceRuntime` | 加载模型包，设置进程级运行环境。 |
| `IFSession` | `FaceSession` | 检测、跟踪、特征提取及可选分析。 |
| `IFImageStream` | `ImageStream` | 描述输入图像，借用像素或持有符合要求的像素缓冲区。 |
| `IFImageBitmap` | `ImageBitmap` | 持有像素，读取文件，绘制和保存图像。 |
| `IFFaceSnapshot` | `FaceSnapshot` | 持有一帧检测结果的独立副本。 |
| `IFFeatureBuffer` | `FaceFeatureBuffer` | 持有特征缓冲区，比较特征。 |
| `IFFeatureHub` | `FeatureHub` | 管理进程级人脸数据库。 |
| `IFCaptureSession` | `FaceCaptureSession` | 从连续帧中筛选抓拍候选。 |
| `IFFaceToken` | `FaceTokenUtilities` | 复制 token，读取关键点。 |
| `IFDiagnostics` | `InspireFaceDiagnostics` | 查询版本、错误信息和资源状态。 |

## 检测一张图片 {#a-complete-detection-example}

下面的完整函数会启动 SDK、检测图片，并在成功或失败时释放资源。传入模型资源文件（如 `Pikachu`）和 JPEG、PNG 图片的实际路径即可。调用成功且返回 0，表示没有检测到人脸。

这段代码适合首次检查接入是否正确。实际应用中，运行环境与会话应跨帧复用：在工作队列的初始化阶段创建，在退出时统一释放。

<details>
<summary>展开完整的文件检测示例</summary>

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL DetectFile(NSString *modelPath, NSString *imagePath,
                HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    if (![IFRuntime launchAtPath:modelPath error:error]) return NO;
    IFSession *session = nil;
    IFImageBitmap *bitmap = nil;
    IFImageStream *stream = nil;
    BOOL success = NO;
    do {
        session = [[IFSession alloc] initWithOptions:0
                                               mode:HF_DETECT_MODE_ALWAYS_DETECT
                                       maximumFaces:10
                                         pixelLevel:320
                                    framesPerSecond:-1
                                              error:error];
        if (!session) break;
        bitmap = [[IFImageBitmap alloc] initWithContentsOfFile:imagePath
                                                     channels:3 error:error];
        if (!bitmap) break;
        HFImageBitmapData pixels = {0};
        if (![bitmap getBorrowedData:&pixels error:error]) break;
        HFImageData input = {pixels.data, pixels.width, pixels.height,
                             HF_STREAM_BGR, HF_CAMERA_ROTATION_0};
        stream = [[IFImageStream alloc] initWithBorrowedData:input error:error];
        if (!stream) break;
        HFMultipleFaceData faces = {0};
        if (![session trackStream:stream borrowedResult:&faces error:error]) break;
        for (HInt32 i = 0; i < faces.detectedNum; ++i) {
            HFaceRect rect = faces.rects[i];
            NSLog(@"face %d: x=%d y=%d width=%d height=%d", i,
                  rect.x, rect.y, rect.width, rect.height);
        }
        *faceCount = faces.detectedNum;
        success = YES;
    } while (NO);
    [stream closeWithError:NULL];
    [bitmap closeWithError:NULL];
    [session closeWithError:NULL];
    [IFRuntime terminateWithError:NULL];
    return success;
}
```

@tab Swift

```swift
import Foundation
import InspireFaceSwift

func detectFile(modelPath: String, imagePath: String) throws -> Int {
    try InspireFaceRuntime.launch(path: modelPath)
    defer { try? InspireFaceRuntime.terminate() }
    let session = try FaceSession(configuration: SessionConfiguration(
        detectionMode: .alwaysDetect, maximumFaces: 10, pixelLevel: 320))
    defer { try? session.close() }
    let bitmap = try ImageBitmap(contentsOfFile: imagePath, channels: 3)
    defer { try? bitmap.close() }
    return try bitmap.withUnsafeMutablePixels { bytes, pixels in
        try ImageStream.withBorrowedBytes(
            bytes, width: pixels.width, height: pixels.height, format: .bgr
        ) { stream in
            try session.withUnsafeFaces(in: stream) { faces in
                for (index, rect) in faces.rectangles.enumerated() {
                    print("face \(index): x=\(rect.x) y=\(rect.y) " +
                          "width=\(rect.width) height=\(rect.height)")
                }
                return faces.count
            }
        }
    }
}
```

:::

</details>

使用 `channels: 3` 读取文件后，位图像素按 BGR 排列。示例直接借用位图存储，并在下一次跟踪前读完所有人脸结果，创建图像流时无需再复制一份像素。

## 模型路径与错误处理 {#model-paths-and-errors}

将模型作为资源文件加入 App，再取得实际路径。如果模型由应用下载，先完成文件写入，再从应用自己的存储目录加载。模型与 Framework 分开提供；添加库文件不会同时安装模型。

Objective-C 方法失败时返回 `NO` 或 `nil`，可通过 `NSError` 获取原因；Swift 对应方法使用 `throws`。SDK 错误的 domain 为 `IFErrorDomain`，`NSError.code` 保留原生 `HResult`。判断本次调用是否成功应看返回值，不要依赖旧的 error 变量。

::: tabs #api-language

@tab Objective-C

```objectivec
NSError *error = nil;
HInt32 count = 0;
if (!DetectFile(modelPath, imagePath, &count, &error)) {
    NSLog(@"%@ (%ld): %@", error.domain, (long)error.code, error.localizedDescription);
} else {
    NSLog(@"Detected %d faces", count);
}
```

@tab Swift

```swift
do {
    let count = try detectFile(modelPath: modelPath, imagePath: imagePath)
    print("Detected \(count) faces")
} catch {
    let failure = error as NSError
    print("\(failure.domain) (\(failure.code)): \(failure.localizedDescription)")
}
```

:::

## 像素缓冲区与借用输入 {#pixel-buffers-and-borrowed-bytes}

`CVPixelBuffer` 构造方法会保留并锁定缓冲区，直到图像流关闭或更换存储。它不会复制像素，也不会自动去掉行填充。

| Pixel format | 直接输入的条件 |
| --- | --- |
| BGRA / RGBA | 单平面，每行恰好 `width × 4` 字节。 |
| 8-bit gray | 单平面，每行恰好 `width` 字节。 |
| NV12，full / video range | 宽高为偶数；Y、UV 每行均为 `width` 字节；UV 紧接在 `width × height` 个 Y 字节之后。 |

行末存在填充、NV12 平面不连续或格式不支持时，返回 `HERR_INVALID_IMAGE_STREAM_PARAM`。[iOS 摄像头示例](./ios.md#camera-input-and-row-stride)给出了带行填充 BGRA 的完整复制方法，macOS 也可以使用。

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL CountPixelBuffer(IFSession *session, CVPixelBufferRef pixelBuffer,
                      HFRotation rotation, HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    IFImageStream *stream = [[IFImageStream alloc] initWithPixelBuffer:pixelBuffer
                                                               rotation:rotation
                                                                  error:error];
    if (!stream) return NO;
    HFMultipleFaceData faces = {0};
    BOOL success = [session trackStream:stream borrowedResult:&faces error:error];
    if (success) *faceCount = faces.detectedNum;
    [stream closeWithError:NULL];
    return success;
}
```

@tab Swift

```swift
import CoreVideo
import InspireFaceSwift

func countPixelBuffer(session: FaceSession, pixelBuffer: CVPixelBuffer,
                      rotation: ImageRotation) throws -> Int {
    let stream = try ImageStream(pixelBuffer: pixelBuffer, rotation: rotation)
    defer { try? stream.close() }
    return try session.withUnsafeFaces(in: stream) { faces in
        faces.count
    }
}
```

:::

`initWithBorrowedData:` / `ImageStream(borrowing:)` 只保存指针，不会持有分配这段内存的对象。在流关闭前保留原始存储，处理期间不要修改它。Swift 的 `ImageStream.withBorrowedBytes` 会在离开闭包前关闭图像流；跟踪及后续处理都应在闭包中完成。

## 结果有效期与释放 {#result-ownership-and-cleanup}

| Result or resource | 有效期 |
| --- | --- |
| Borrowed faces / tokens | 会话下一次跟踪、重置或关闭之前。 |
| Borrowed embedding | 下一次特征提取或会话关闭之前。 |
| Pipeline result pointers | 对应结果缓存更新或会话关闭之前。 |
| Snapshot data | Snapshot 关闭之前，不受会话后续跟踪影响。 |
| `nativeHandle` | 从包装对象借用，不能再通过 C API 单独释放。 |

::: warning Snapshot 的拷贝开销
Snapshot 更便于跨帧安全地保存结果，但复制会增加延时。单路摄像头顺序处理时，可以在下一帧开始前直接读完会话中的结果；需要跨越这个处理阶段保留结果时，再使用 Snapshot。
:::

ARC 会在包装对象销毁时释放其持有的原生资源。需要及时归还摄像头缓冲区等场景，可显式调用 `close`。重复 `close` 会报无效句柄错误，并不是可反复调用的操作。先关闭抓拍对象，再关闭其父会话；所有会话释放后，再终止进程级运行环境。

## 队列与帧顺序 {#queues-and-frame-order}

SDK 调用都是同步的。每个会话使用一个串行工作队列，跟踪、pipeline 和特征提取均在这个队列完成。Swift 的 unsafe-access 闭包限定结果的使用范围，但不会让会话支持并发访问。通过 `nativeHandle` 直接调用 C API，同样可能使已有指针失效。

摄像头每帧按 `track → pipeline / 特征提取 → 复制 UI 所需数据 → 关闭流` 的顺序处理完，再开始下一帧。只向主队列传递已复制的矩形、分数等值。运行环境和 FeatureHub 的全局变更也要串行处理，不要在其他工作队列推理时重载模型。

## CoreML 运行模式 {#coreml-runtime-modes}

使用 CoreML 构建和 Apple 模型包，在创建会话前选择模式。这个设置不会为 CPU-only 构建开启 CoreML，也不会转换其中的模型。

| Objective-C / C mode | Swift | CoreML compute units |
| --- | --- | --- |
| `HF_APPLE_COREML_INFERENCE_MODE_CPU` | `.cpu` | 仅 CPU。 |
| `HF_APPLE_COREML_INFERENCE_MODE_GPU` | `.gpu` | CPU 和 GPU。 |
| `HF_APPLE_COREML_INFERENCE_MODE_ANE` | `.neuralEngine` | 所有可用单元，由 CoreML 选择 Neural Engine、GPU 或 CPU。 |

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL ConfigureCoreML(NSError **error) {
    return [IFRuntime setCoreMLInferenceMode:HF_APPLE_COREML_INFERENCE_MODE_ANE
                                      error:error];
}
```

@tab Swift

```swift
import InspireFaceSwift

func configureCoreML() throws {
    try InspireFaceRuntime.setCoreMLInferenceMode(.neuralEngine)
}
```

:::

`.neuralEngine` 并不强制每一步都在 Neural Engine 上执行，实际选择还取决于硬件和模型支持情况。与运行环境初始化放在同一个工作队列设置；改变影响模型的配置后，重新创建会话。对应的库见 [iOS 构建](../build/ios.md#build-with-the-apple-extension)和 [macOS 构建](../build/macos.md#pick-a-script)。

## 继续使用其他功能 {#continue-with-a-feature}

[会话与跟踪](../guides/tracking.md)、[人脸识别](../guides/recognition.md)、[关键点](../guides/dense-landmark.md)、[活体检测](../guides/liveness-detection.md)、[可选分析](../guides/optional-analysis.md)、[FeatureHub](../guides/recognition.md#store-and-search-a-gallery) 和[抓拍](../guides/face-capture.md)均提供 Objective-C、Swift 标签页。一帧中的后续操作应使用同一个图像流及本次检测得到的 token。
