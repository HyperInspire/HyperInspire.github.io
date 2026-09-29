# iOS {#ios}

iOS 应用可以使用 Objective-C、Swift 或 C API。当前 Apple 构建提供成对的 XCFramework，覆盖真机和模拟器。先检测一张 App 内的图片，再复用会话处理摄像头帧。

[Objective-C 与 Swift 接入](./apple.md)提供完整检测示例、错误处理和资源管理说明。本页介绍 Xcode 配置与摄像头输入。

## 选择 Framework {#build-the-frameworks}

下载 [inspireface-apple-1.2.4.zip](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-apple-1.2.4.zip)。这个 CPU 包包含 iOS 真机、模拟器及 macOS 的 Framework，已提供 Objective-C 和 Swift 接口。解压后的目录如下：

```text
inspireface-apple-1.2.4/
  InspireFace.xcframework/
  InspireFaceSwift.xcframework/
  Frameworks/                 # Frameworks grouped by platform
  SDKs/                       # Individual architecture SDKs
  sdk-manifest.json
```

链接 XCFramework 时，Xcode 会选择对应切片。1.2.4 发布包的 iOS 最低系统版本如下：

| Platform | Architecture | Minimum OS |
| --- | --- | --- |
| iOS device | `arm64` | iOS 11.0 |
| iOS Simulator | `arm64` | iOS 14.0 |
| iOS Simulator | `x86_64` | iOS 11.0 |

按选用切片设置应用的 deployment target。需要更改构建配置或启用 CoreML 时，参考 [iOS 构建](../build/ios.md)。

## 将 SDK 和模型加入 Xcode {#add-the-sdk-and-model-to-xcode}

将 `InspireFace.xcframework` 加入 App Target。Swift 代码使用 `import InspireFaceSwift` 时，还要加入同一次构建的 `InspireFaceSwift.xcframework`。iOS 切片是**静态库**，链接设置选择 **Do Not Embed**。在 Other Linker Flags 中加入 `-ObjC`，保留 Objective-C 包装类。

核心 Framework 已合并 CPU 推理依赖，不要再同时链接旧的 `MNN.framework`、另一份 `libMNN.a` 或原始 `libInspireFace.a`。`SDKs/` 目录保留了旧的原始库接入方式，供已有 C/C++ 工程使用；同一个 Target 选择其中一种方式即可。

### 检查 Target 设置 {#check-the-target-settings}

| Xcode setting | 配置 |
| --- | --- |
| Frameworks, Libraries, and Embedded Content | 添加核心 XCFramework；Swift 工程再添加 Swift XCFramework。iOS 上都选择 **Do Not Embed**。 |
| Other Linker Flags | 保留 `$(inherited)`，加入 `-ObjC`。 |
| System libraries | Foundation、CoreVideo 和 `libc++`；CoreML 构建还使用 CoreML 与 Accelerate。模块导入会自动提供这些链接声明。 |
| Framework Search Paths | 直接使用 `.framework` 时，指向相应平台和架构的目录。 |
| Copy Bundle Resources | 加入模型文件，如 `Pikachu`，保持原文件名。 |
| Info | 请求相机授权前，添加 `NSCameraUsageDescription`。 |

![Xcode Build Phases 中添加 Framework 链接的位置](https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/setup_s1.png)

*截图来自较早的示例工程，用于说明 Build Phases 的位置。请按上文添加当前版本的 InspireFace Framework；Pods 条目属于截图中的工程。*

在 SDK 工作队列初始化时取得模型路径。下面的片段放在初始化方法内部，导入语句见[共享接入页](./apple.md#modules-and-types)。

::: tabs #api-language

@tab Objective-C

```objectivec
NSString *modelPath = [[NSBundle mainBundle] pathForResource:@"Pikachu" ofType:nil];
if (!modelPath) {
    NSLog(@"Pikachu is missing from the app resources");
    return;
}
NSError *error = nil;
if (![IFRuntime launchAtPath:modelPath error:&error]) {
    NSLog(@"InspireFace launch failed: %@", error);
    return;
}
```

@tab Swift

```swift
guard let modelPath = Bundle.main.path(forResource: "Pikachu", ofType: nil) else {
    throw NSError(domain: "App.Model", code: 1,
                  userInfo: [NSLocalizedDescriptionKey: "Pikachu is missing from the app resources"])
}
try InspireFaceRuntime.launch(path: modelPath)
```

:::

下载的模型可以放在 Application Support 等应用自己的目录，文件写入完成后再加载。Bundle 内的资源是只读的；只有需要后续替换模型时，才需要将其复制到可写目录。

## 摄像头输入与行步长 {#camera-input-and-row-stride}

取得相机授权后，配置 `AVCaptureSession`，添加 `AVCaptureVideoDataOutput`，让 delegate 与人脸会话使用同一个串行队列。下面的设置请求 BGRA 输出，并丢弃来不及处理的帧：

::: tabs #api-language

@tab Objective-C

```objectivec
#import <AVFoundation/AVFoundation.h>

AVCaptureVideoDataOutput *output = [[AVCaptureVideoDataOutput alloc] init];
output.videoSettings = @{
    (NSString *)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA)
};
output.alwaysDiscardsLateVideoFrames = YES;
dispatch_queue_t analysisQueue = dispatch_queue_create("app.face.analysis", DISPATCH_QUEUE_SERIAL);
// delegate implements AVCaptureVideoDataOutputSampleBufferDelegate.
[output setSampleBufferDelegate:delegate queue:analysisQueue];
```

@tab Swift

```swift
import AVFoundation

let output = AVCaptureVideoDataOutput()
output.videoSettings = [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
]
output.alwaysDiscardsLateVideoFrames = true
let analysisQueue = DispatchQueue(label: "app.face.analysis")
// delegate implements AVCaptureVideoDataOutputSampleBufferDelegate.
output.setSampleBufferDelegate(delegate, queue: analysisQueue)
```

:::

在 `captureOutput(_:didOutput:from:)` 或对应的 Objective-C 回调中，通过 `CMSampleBufferGetImageBuffer` 取得当前帧。开始采集前创建 `LIGHT_TRACK` 会话并持续复用，不要每帧加载模型或创建会话。

[共享输入示例](./apple.md#pixel-buffers-and-borrowed-bytes)中的 `CVPixelBuffer` 构造方法只接受紧密排列的存储。摄像头缓冲区常在行末增加填充。下面的完整函数逐行复制 BGRA，在存储离开作用域前关闭图像流，最后返回独立的人脸数量。

<details>
<summary>展开带行填充 BGRA 的 Objective-C、Swift 输入代码</summary>

::: tabs #api-language

@tab Objective-C

```objectivec
#import <InspireFace/InspireFaceApple.h>
#include <stdint.h>
#include <string.h>

BOOL CountPaddedBGRA(IFSession *session, CVPixelBufferRef buffer,
                     HFRotation rotation, HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    if (!buffer || CVPixelBufferGetPixelFormatType(buffer) != kCVPixelFormatType_32BGRA ||
        CVPixelBufferIsPlanar(buffer))
        return IFCheck(HERR_INVALID_IMAGE_STREAM_PARAM, error);
    size_t width = CVPixelBufferGetWidth(buffer);
    size_t height = CVPixelBufferGetHeight(buffer);
    if (!width || !height || width > INT32_MAX || height > INT32_MAX ||
        width > SIZE_MAX / 4 || height > SIZE_MAX / (width * 4))
        return IFCheck(HERR_INVALID_IMAGE_STREAM_PARAM, error);
    if (CVPixelBufferLockBaseAddress(buffer, kCVPixelBufferLock_ReadOnly) != kCVReturnSuccess)
        return IFCheck(HERR_INVALID_IMAGE_STREAM_PARAM, error);
    const uint8_t *source = CVPixelBufferGetBaseAddress(buffer);
    size_t rowBytes = width * 4;
    size_t stride = CVPixelBufferGetBytesPerRow(buffer);
    if (!source || stride < rowBytes) {
        CVPixelBufferUnlockBaseAddress(buffer, kCVPixelBufferLock_ReadOnly);
        return IFCheck(HERR_INVALID_IMAGE_STREAM_PARAM, error);
    }
    __attribute__((objc_precise_lifetime)) NSMutableData *packed =
        [NSMutableData dataWithLength:rowBytes * height];
    uint8_t *destination = packed.mutableBytes;
    for (size_t row = 0; row < height; ++row)
        memcpy(destination + row * rowBytes, source + row * stride, rowBytes);
    CVPixelBufferUnlockBaseAddress(buffer, kCVPixelBufferLock_ReadOnly);
    HFImageData input = {destination, (HInt32)width, (HInt32)height,
                         HF_STREAM_BGRA, rotation};
    IFImageStream *stream = [[IFImageStream alloc] initWithBorrowedData:input error:error];
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
import Foundation
import InspireFaceSwift

func countPaddedBGRA(session: FaceSession, pixelBuffer: CVPixelBuffer,
                     rotation: ImageRotation) throws -> Int {
    func invalidImage() -> NSError {
        NSError(domain: IFErrorDomain, code: Int(HERR_INVALID_IMAGE_STREAM_PARAM))
    }
    guard CVPixelBufferGetPixelFormatType(pixelBuffer) == kCVPixelFormatType_32BGRA,
          !CVPixelBufferIsPlanar(pixelBuffer) else { throw invalidImage() }
    let width = CVPixelBufferGetWidth(pixelBuffer)
    let height = CVPixelBufferGetHeight(pixelBuffer)
    guard width > 0, height > 0, let w = Int32(exactly: width),
          let h = Int32(exactly: height) else { throw invalidImage() }
    let (rowBytes, rowOverflow) = width.multipliedReportingOverflow(by: 4)
    let (byteCount, countOverflow) = rowBytes.multipliedReportingOverflow(by: height)
    guard !rowOverflow, !countOverflow, byteCount <= Int(Int32.max),
          CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly) == kCVReturnSuccess
    else { throw invalidImage() }
    var packed = Data(count: byteCount)
    do {
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
        guard let source = CVPixelBufferGetBaseAddress(pixelBuffer),
              CVPixelBufferGetBytesPerRow(pixelBuffer) >= rowBytes
        else { throw invalidImage() }
        let stride = CVPixelBufferGetBytesPerRow(pixelBuffer)
        packed.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
            for row in 0..<height {
                bytes.baseAddress!.advanced(by: row * rowBytes).copyMemory(
                    from: source.advanced(by: row * stride), byteCount: rowBytes)
            }
        }
    }
    return try packed.withUnsafeMutableBytes { (bytes: UnsafeMutableRawBufferPointer) in
        try ImageStream.withBorrowedBytes(
            bytes, width: w, height: h, format: .bgra, rotation: rotation
        ) { stream in
            try session.withUnsafeFaces(in: stream) { $0.count }
        }
    }
}
```

:::

</details>

在分析回调中，将复用的会话传给 `CountPaddedBGRA` / `countPaddedBGRA`。示例为了便于阅读，每次分配一个连续缓冲区；持续处理视频时，可在同一工作队列保留这块存储，只在尺寸改变时调整大小。本帧的全部操作完成前，不要覆盖其中的像素。

NV12 的输入带宽通常低于 BGRA。直接传入时，两个平面都必须紧密排列且内存连续；不符合时，分别按 Y、UV 的步长逐行复制，或显式转换为应用选定的格式。旋转与坐标约定见[图像输入](../guides/image-inputs.md)。

## 会话与界面生命周期 {#session-and-ui-lifetime}

每帧顺序完成跟踪、特征提取和 pipeline 分析。向主队列传递结果前，先复制矩形和分数；绘制时再应用预览的旋转、缩放、裁剪及前置镜像变换。SDK 输出不是 UIKit 视图坐标。

关闭摄像头时，先停止提交新帧，等待分析队列处理完已有任务，再关闭抓拍对象和会话；没有其他模块使用 SDK 后，终止运行环境。`CVPixelBuffer` 图像流会一直锁定摄像头缓冲区，处理完成后应及时关闭。

## Apple 加速 {#apple-acceleration}

1.2.4 Apple 发布包使用 CPU 推理。需要 CoreML 时，按[启用 Apple 扩展](../build/ios.md#build-with-the-apple-extension)构建。CPU 与 CoreML 包的模块名相同，一个 Target 只使用其中一套。CoreML 构建还需要对应的 Apple 模型资源，只更换 Framework 不会将 CPU 模型包转换成 CoreML 模型。

创建会话前，通过 `IFRuntime` / `InspireFaceRuntime` 选择 CoreML 模式。CPU、GPU 与 Neural Engine 的设置见 [CoreML 运行模式](./apple.md#coreml-runtime-modes)。延时、功耗和 Neural Engine 性能应在真机测量，模拟器只适合检查接入是否正常。
