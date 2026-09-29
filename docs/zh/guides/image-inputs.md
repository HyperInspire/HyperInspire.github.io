# 图像输入与坐标 {#image-inputs-and-coordinates}

图像输入由像素、尺寸、像素格式和旋转信息组成。先使用文件图像完成接入，再配置摄像头缓冲区布局和预览坐标。

## 按实际字节布局声明格式 {#describe-the-bytes-you-actually-have}

| Format | Size (packed) | 说明 |
| --- | --- | --- |
| RGB / BGR | `width × height × 3` bytes | OpenCV 读取文件后的默认格式是 BGR。 |
| RGBA / BGRA | `width × height × 4` bytes | 声明的格式必须与通道顺序一致。 |
| Gray | `width × height` bytes | 使用 `HF_STREAM_GRAY`。 |
| NV12 / NV21 | `width × height × 3 / 2` bytes | 宽高为偶数；NV12 交错存储 UV，NV21 交错存储 VU。 |
| I420 | `width × height × 3 / 2` bytes | 宽高为偶数；Y、U、V 分别存储。 |

`HFImageData` 使用表中的紧密排列布局。摄像头每行带有填充时，先重新排列数据，再传给原始 C 图像流接口。Android `YUV_420_888` 按各平面的 row stride 和 pixel stride 读取，然后组装成所声明的输出格式。

<figure>
<a href="/images/image-row-stride.svg" target="_blank" rel="noopener"><img class="doc-diagram" src="/images/image-row-stride.svg" alt="带行填充的摄像头缓冲区与紧密排列的 BGR 缓冲区对照" loading="lazy" /></a>
<figcaption>每行只复制有效像素，跳过 padding。YUV 分平面输入还需要单独处理每个平面的 row stride 和 pixel stride。</figcaption>
</figure>

## 原始 C 图像流 {#raw-c-stream}

```c
/* pixels points to width * height * 3 tightly packed BGR bytes. */
HFImageData input = {0};
input.data = pixels;
input.width = width;
input.height = height;
input.format = HF_STREAM_BGR;
input.rotation = HF_CAMERA_ROTATION_0;
HFImageStream stream = NULL;
HResult status = HFCreateImageStream(&input, &stream);
if (status == HSUCCEED) {
    /* Run detection and any downstream calls using this frame here. */
    HFReleaseImageStream(stream);
}
```

图像流借用 `pixels`，缓冲区由应用持有。所有图像流操作结束前，保持缓冲区有效且内容不变，之后再归还相机或复用。

可以通过 `HFImageStreamSetBuffer`、`HFImageStreamSetFormat` 和 `HFImageStreamSetRotation` 复用已有图像流。检查每次调用的返回状态，并保证修改时没有其他处理调用正在使用旧缓冲区。

## 文件与位图输入 {#file-and-bitmap-input}

`HFCreateImageBitmapFromFilePath` 解码图像并持有像素内存。在 1.2.4 中，`HFCreateImageStreamFromImageBitmap` 会将像素复制到图像流自己的内存。创建后可以修改或释放原位图；两个句柄在各自使用结束后分别释放。

首次接入可使用[完整的 C 检测程序](../using-with/c-cpp.md#a-complete-detection-program)。它采用文件输入，先确认 SDK 配置，再接入摄像头。

## Apple 相机与内存输入 {#apple-camera-and-memory-inputs}

Apple 封装可以直接接收紧密排列的 BGRA、RGBA、Gray 或 NV12 `CVPixelBuffer`。图像流会保留并锁定缓冲区，直到关闭或替换输入；这个构造方法不会复制像素。

::: tabs #api-language

@tab Objective-C

```objc
#import <InspireFace/InspireFaceApple.h>

// session is initialized; buffer uses a supported tightly packed layout.
BOOL CountCameraFaces(IFSession *session, CVPixelBufferRef buffer,
                      HInt32 *count, NSError **error) {
    IFImageStream *stream = [[IFImageStream alloc]
        initWithPixelBuffer:buffer rotation:HF_CAMERA_ROTATION_0 error:error];
    if (!stream) return NO;
    @try {
        return [session withBorrowedFacesFromStream:stream
            body:^(HFMultipleFaceData faces) {
                *count = faces.detectedNum;
            } error:error];
    } @finally {
        [stream closeWithError:nil];
    }
}
```

@tab Swift

```swift
import CoreVideo
import InspireFaceSwift

// session is initialized; buffer uses a supported tightly packed layout.
func countCameraFaces(session: FaceSession, buffer: CVPixelBuffer) throws -> Int {
    let stream = try ImageStream(pixelBuffer: buffer, rotation: .degrees0)
    defer { try? stream.close() }
    return try session.withUnsafeFaces(in: stream) { faces in
        faces.count
    }
}
```

:::

构造方法会拒绝带有行填充的缓冲区，以及未组成连续内存的 NV12 平面。即使相机设置为 BGRA，输出也可能带有行填充。先检查 `CVPixelBufferGetBytesPerRow`；需要重新排列时，使用 [iOS 页中的完整 BGRA 逐行复制示例](../using-with/ios.md#camera-input-and-row-stride)。不能只把 stride 改成图像宽度而不移动像素。

像素已经保存在应用内存中时，Swift 可以让图像流留在该内存的指针作用域内：

```swift
import InspireFaceSwift

// bgra holds width * height * 4 bytes, without padding between rows.
func countPackedFaces(session: FaceSession, bgra: inout [UInt8],
                      width: Int32, height: Int32) throws -> Int {
    try bgra.withUnsafeMutableBytes { bytes in
        try ImageStream.withBorrowedBytes(
            bytes, width: width, height: height, format: .bgra
        ) { stream in
            try session.withUnsafeFaces(in: stream) { faces in
                faces.count
            }
        }
    }
}
```

离开这些作用域前，完成检测、分析与特征提取。不要从 `withUnsafeMutableBytes` 回调中返回图像流或借用的人脸指针。文件输入则可以使用 Objective-C 的 `IFImageBitmap` 或 Swift 的 `ImageBitmap`，由位图持有解码后的像素；`snapshotStream` 会复制像素，生成独立的图像流。文件加载与错误处理见 [Apple 示例](../using-with/apple.md)。

## Java 图像缓冲区 {#java-image-buffers}

JVM 接口使用可写的 direct `ByteBuffer` 传递原始像素。BGR 输入需要紧密排列的 `width * height * 3` 个字节；带行填充的图像先逐行整理。`ByteBuffer.allocateDirect(size)` 可分配直接缓冲区，`ByteBuffer.wrap(byte[])` 不适用。

下面的辅助类读取一帧 BGR 图像。调用前已加载模型并创建 Session，`pixels.position()` 指向图像起点，`remaining()` 至少覆盖整帧；如果刚用 `put()` 写入缓冲区，先调用 `flip()`。

```java
import java.nio.ByteBuffer;
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

public final class PackedBgr {
    // SDK and session are initialized. pixels starts at the first BGR byte.
    public static int countFaces(long session, ByteBuffer pixels,
                                 int width, int height) {
        HFImageData input = new HFImageData();
        input.data = pixels;
        input.width = width;
        input.height = height;
        input.format = HF_STREAM_BGR;
        input.rotation = HF_CAMERA_ROTATION_0;
        long[] stream = new long[1];
        try {
            check(HFCreateImageStream(input, stream));
            HFMultipleFaceData faces = new HFMultipleFaceData();
            check(HFExecuteFaceTrack(session, stream[0], faces));
            return faces.detectedNum;
        } finally {
            if (stream[0] != 0) HFReleaseImageStream(stream[0]);
        }
    }
}
```

JNI 会保留 Java 输入缓冲区的引用，直到图像流释放或替换输入。处理结束前不要改写像素，也不要将它归还给缓冲池。如果 `pixels` 来自 `HFImageBitmapGetData`，它借用位图的原生内存，仍需保留位图句柄；Java 引用本身无法阻止 `HFReleaseImageBitmap` 释放像素。

文件输入的完整程序见 [Java 接入](../using-with/java.md)。读取 token、特征或分析结果中的 `ByteBuffer` 时，还要遵守[结果生命周期](./arch.md#java-object-lifetimes)。

## NumPy 输入 {#numpy-input}

BGR 输入使用形状为 `(height, width, 3)` 的 `uint8` 数组。当前 Python 封装也接受 `(height, width)` 的灰度数组和 `(height, width, 4)` 的 BGRA 数组。用下面的代码保证数组内存连续：

```python
import numpy as np
image = np.ascontiguousarray(image, dtype=np.uint8)
faces = session.face_detection(image)
```

输入为 `[0, 1]` 浮点数时，先缩放到 `[0, 255]`，再转换为 `uint8`。图像读取库返回 RGB 时，转换成 BGR，或显式创建 RGB 格式的 `ImageStream`。

## 旋转与显示坐标 {#rotation-and-display-coordinates}

接入预览画面时，要区分三个坐标空间：

1. **原始帧**：提交给 SDK 的缓冲区尺寸和像素布局。
2. **正向处理画面**：SDK 旋转、预处理后用于检测的视图。
3. **界面预览**：UI 缩放、裁剪、留边和镜像后的显示画面。

SDK 将人脸几何信息映射回输入帧坐标。UI 再对这些坐标应用预览变换，包括前置摄像头的镜像。

原生接口 `HF_CAMERA_ROTATION_90` 和 `_270` 使用逆时针约定。摄像头 API 可能给出顺时针修正角度，需要明确转换。也可以先将像素旋转为正向图像，再传入 `HF_CAMERA_ROTATION_0`。

绘制人脸框时，让人脸分别靠近画面的四边检查。若中心位置正确、靠近边缘就发生偏移，通常是映射遗漏了裁剪或缩放；若移动方向相反，应检查镜像处理。

<figure>
<a href="/images/image-coordinate-spaces.svg" target="_blank" rel="noopener"><img class="doc-diagram" src="/images/image-coordinate-spaces.svg" alt="Raw frame、SDK 处理视图与显示预览之间的坐标转换" loading="lazy" /></a>
<figcaption>SDK 返回原始帧坐标；预览的缩放、裁剪和镜像由应用处理。图像和覆盖层必须使用同一套显示变换。</figcaption>
</figure>

## 拷贝与异步处理 {#copies-and-asynchronous-work}

检测快照保留检测数据。送入队列做特征提取时，同时保留快照和对应帧，或一份像素副本。只绘制人脸框时，复制几何数据即可；图像处理结束后可以释放原帧。

抓拍模块返回候选帧 ID。用这些 ID 作为键，将对应图像保存在容量受限的缓存中，保存时再编码选中的图像。详见[人脸抓拍](./face-capture.md)。

## 在 SDK 外进行预处理 {#need-preprocessing-outside-the-sdk}

独立的 [InspireCV Task API](./inspirecv.md#task-preprocessing) 接受带行步长的原始图像视图，可输出图像或张量。使用 Task 自己的 `PixelFormat` 值；在 Task、`HFImageFormat` 和 InspireFace `FrameProcess` 之间传递数据时，明确转换格式枚举。
