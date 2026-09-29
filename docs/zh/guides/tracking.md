# 会话与跟踪 {#sessions-and-tracking}

会话保存已启用的模型、工作内存和视频跟踪历史。为一个工作线程或一路摄像头创建一个会话，在连续帧间复用，减少重复初始化的开销。

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/track.webp" alt="多个人脸框、各自的 track ID 与帧间移动轨迹" width="1672" height="941" loading="lazy" />
<figcaption>连续帧中，track ID 用于把同一条轨迹连接起来。它只在当前跟踪序列中有意义；图中的彩色轨迹是应用可绘制的叠加层。</figcaption>
</figure>

## 按输入选择模式 {#pick-a-mode-for-the-input}

| Mode | 速度 / 延时 | 适用输入 | 工作方式 |
| --- | --- | --- | --- |
| `ALWAYS_DETECT` | ★★☆☆☆<br>较高延时 | 静态图片、互不相关的请求 | 每次调用都运行检测，不维护连续的 track ID。 |
| `LIGHT_TRACK` | ★★★★★<br>低延时 | 实时摄像头、连续视频 | 复用前帧结果进行跟踪，按需运行检测。 |
| `TRACK_BY_DETECTION` | ★★☆☆☆<br>较高延时 | 需要逐帧检测并关联轨迹的视频 | 每帧运行检测，再将检测结果关联到连续轨迹。 |

表中的模式名省略了 C API 的 `HF_DETECT_MODE_` 前缀。星数越多，表示典型场景下处理速度越快、单帧延时越低。星级用于相对比较，实际耗时还取决于设备、模型、检测尺寸、人脸数量和启用的分析功能。

### 三种模式如何工作 {#how-the-modes-differ}

- **`ALWAYS_DETECT`**：每张输入独立处理，适合上传照片、批量图片或互不相关的请求。结果中的人脸排列顺序不能用于关联不同图片中的人脸。
- **`LIGHT_TRACK`**：利用前帧信息跟踪人脸，稳定跟踪时计算开销较小。首帧、到达检测间隔或没有可跟踪的人脸时，会运行检测；这些帧通常比只做跟踪的帧耗时更高。画面中没有可跟踪的人脸时，也会继续逐帧检测。
- **`TRACK_BY_DETECTION`**：每帧先检测，再将结果关联为轨迹。监控、抓拍等既需要逐帧检测、又需要连续轨迹的场景可以使用；每帧仍需承担检测开销。

track ID 用于连接同一段序列中的观测结果，不代表识别出的人员身份，也不是永久 ID。需要持久保存身份时，另外使用业务 ID 或 FeatureHub ID。

### 单帧延时与新脸发现速度 {#processing-latency-and-new-faces}

使用 `LIGHT_TRACK` 时，增大检测间隔可以减少周期检测的开销，但新进入画面的人脸可能更晚出现在结果中。对抓拍时机要求较高时，可以先用较短间隔，再根据实际视频调整。检测间隔不会降低 `ALWAYS_DETECT` 或 `TRACK_BY_DETECTION` 的逐帧检测频率。

实时摄像头除了测量 SDK 单帧耗时，还要关注显示的画面落后了多久。输入队列积压时，即使每次 SDK 调用很快，预览也会有明显延迟。保留较短的队列，处理跟不上时丢弃过期帧，再按时间顺序送入剩余帧。各阶段的计时方法见[性能测量](./benchmark-remark(updating).md)。

## 视频处理循环 {#a-video-loop}

下面按接入语言切换示例，每种写法都在连续帧间复用会话。示例对应原生 SDK 1.2.4；Android 使用 [1.2.4.post1 AAR](../using-with/android.md)。Objective-C 与 Swift 示例需搭配包含这两种接口的 Apple framework。

::: tabs #api-language

@tab C API

按 [C 接入说明](../using-with/c-cpp.md)初始化 SDK 后，为整段视频创建一个会话。每帧用有效的图像流调用 `track_frame`，处理完成后释放该帧的图像流；视频结束后再释放会话。

```c
#include <stdio.h>
#include <inspireface.h>

static HResult create_tracker(HFSession *session) {
    return HFCreateInspireFaceSessionOptional(
        HF_ENABLE_NONE, HF_DETECT_MODE_LIGHT_TRACK, 5, 320, -1, session);
}

static HResult track_frame(HFSession session, HFImageStream stream) {
    HFMultipleFaceData faces = {0};
    HResult status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED) return status;
    for (HInt32 i = 0; i < faces.detectedNum; ++i) {
        printf("track=%d observations=%d\n", faces.trackIds[i], faces.trackCounts[i]);
    }
    return HSUCCEED;
}
// At the end of the sequence: HFReleaseInspireFaceSession(session);
```

@tab C++

[C++ 接入说明](../using-with/cpp.md)介绍了运行时和 `FrameProcess` 的创建方式。下面的会话在视频期间持续保留，每帧按顺序调用一次 `trackFrame(frame)`。

```cpp
inspire::CustomPipelineParameter options;
auto session = inspire::Session::Create(
    inspire::DETECT_MODE_LIGHT_TRACK, 5, options, 320);
auto trackFrame = [&](inspirecv::FrameProcess& frame) {
    std::vector<inspire::FaceTrackWrap> faces;
    int status = session.FaceDetectAndTrack(frame, faces);
    if (status != 0) throw std::runtime_error("Tracking failed");
    for (const auto& face : faces) {
        std::cout << face.trackId << " " << face.trackCount << '\n';
    }
};
```

@tab Objective-C

先完成 [Apple 接入](../using-with/apple.md)，为整个相机序列创建一个 tracker。在串行相机工作队列中调用 `TrackFrame` 并检查 `BOOL`，失败原因由 `NSError` 返回。回调只在执行期间借用人脸数组；调用方需保持图像流和像素有效，直到处理完成。

```objc
#import <InspireFace/InspireFaceApple.h>

static IFSession *CreateTracker(NSError **error) {
    return [[IFSession alloc] initWithOptions:HF_ENABLE_NONE
        mode:HF_DETECT_MODE_LIGHT_TRACK maximumFaces:5 pixelLevel:320
        framesPerSecond:-1 error:error];
}

static BOOL TrackFrame(IFSession *session, IFImageStream *stream, NSError **error) {
    return [session withBorrowedFacesFromStream:stream
        body:^(HFMultipleFaceData faces) {
            for (HInt32 i = 0; i < faces.detectedNum; ++i) {
                NSLog(@"track=%d observations=%d", faces.trackIds[i], faces.trackCounts[i]);
            }
        } error:error];
}
// After the camera worker stops: [session closeWithError:&error];
```

@tab Swift

链接两份 Apple framework 并 `import InspireFaceSwift`。运行时启动后创建一次会话，再按帧顺序调用 `trackFrame`。SDK 失败会抛出错误。借用视图在闭包内用完，不保存其中的指针，也不在闭包内再次跟踪、重置或关闭会话。

```swift
import InspireFaceSwift

func createTracker() throws -> FaceSession {
    try FaceSession(configuration: SessionConfiguration(
        detectionMode: .lightTracking, maximumFaces: 5, pixelLevel: 320))
}

func trackFrame(session: FaceSession, stream: ImageStream) throws {
    try session.withUnsafeFaces(in: stream) { faces in
        for i in 0..<faces.count {
            print("track=\(faces.trackIDs[i]) observations=\(faces.trackCounts[i])")
        }
    }
}
// After the camera worker stops: try session.close()
```

@tab Java

按 [Java 接入说明](../using-with/java.md)初始化后，调用一次 `createTracker()`，再将每帧的图像流句柄传给 `trackFrame`。在同一工作线程上按顺序处理；每帧完成后释放图像流，整段序列结束后释放会话。`trackIds` 和 `trackCounts` 是使用本机字节序的借用 `ByteBuffer`，`getInt` 的参数是**字节偏移**。下一次跟踪、重置或释放会话前读完这些值。

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

public final class TrackingExample {
    public static long createTracker() {
        long[] session = new long[1];
        check(HFCreateInspireFaceSessionOptional(
                HF_ENABLE_NONE, HF_DETECT_MODE_LIGHT_TRACK, 5, 320, -1, session));
        return session[0];
    }

    public static void trackFrame(long session, long stream) {
        HFMultipleFaceData faces = new HFMultipleFaceData();
        check(HFExecuteFaceTrack(session, stream, faces));
        for (int i = 0; i < faces.detectedNum; i++) {
            int offset = i * Integer.BYTES;
            System.out.println("track=" + faces.trackIds.getInt(offset)
                    + " observations=" + faces.trackCounts.getInt(offset));
        }
    }
    // After the camera worker stops: check(HFReleaseInspireFaceSession(session));
}
```

@tab Android

`GlobalLaunch` 成功后创建一次会话，随后每帧调用 `trackFrame`。图像流由当前摄像头帧创建，格式转换和释放方式见 [Android 摄像头接入](../using-with/android.md#process-camera-frames)。以下数据类型位于 `com.insightface.sdk.inspireface.base`。`trackIds` 用于关联连续帧中的人脸，`trackCounts` 表示同一跟踪目标的累计观测次数。返回的数组与 token 已复制到 Java 内存；同一会话的调用仍需按帧串行执行。

```java
static Session createTracker() {
    Session session = InspireFace.CreateSession(
            InspireFace.CreateCustomParameter(),
            InspireFace.DETECT_MODE_LIGHT_TRACK, 5, 320, -1);
    if (session == null || session.handle == 0L) {
        throw new IllegalStateException("Cannot create tracker");
    }
    return session;
}

static void trackFrame(Session session, ImageStream stream) {
    MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
    if (faces == null) throw new IllegalStateException("Tracking failed");
    for (int i = 0; i < faces.detectedNum; i++) {
        System.out.println("track=" + faces.trackIds[i]
                + " observations=" + faces.trackCounts[i]);
    }
}
// After the camera worker stops: InspireFace.ReleaseSession(session);
```

@tab HarmonyOS

先按 [HarmonyOS 接入说明](../using-with/harmonyos.md)初始化 SDK，再为相机序列创建一个跟踪会话。按顺序把每帧的 `ImageStream` 传给 `trackFrame`；调用方在该帧处理完成后关闭图像流，序列结束后调用 `session.close()`。

```ts
import { DetectMode, Feature, ImageStream, Session }
  from '@hyperinspire/inspireface';

function createTracker(): Session {
  return new Session({
    featureMask: Feature.NONE,
    detectMode: DetectMode.LIGHT_TRACK,
    maxFaces: 5,
    detectPixelLevel: 320
  });
}

function trackFrame(session: Session, stream: ImageStream): void {
  const result = session.track(stream);
  try {
    for (const face of result.faces) {
      console.info(`track=${face.trackId} observations=${face.trackCount}`);
    }
  } finally {
    session.releaseFaceResult(result);
  }
}
```

@tab Python

这个完整循环读取 `input.mp4`，不需要摄像头权限或显示窗口。

```python
import cv2
import inspireface as isf

video = cv2.VideoCapture("input.mp4")
if not video.isOpened():
    raise RuntimeError("Cannot open input.mp4")

try:
    isf.launch(resource_path="/path/to/Pikachu")
    with isf.InspireFaceSession(
        isf.HF_ENABLE_NONE,
        isf.HF_DETECT_MODE_LIGHT_TRACK,
        max_detect_num=5,
        detect_pixel_level=320,
        auto_launch=False,
    ) as session:
        while True:
            ok, frame = video.read()
            if not ok:
                break
            faces = session.face_detection(frame)
            for face in faces:
                print(face.track_id, face.track_count, face.location)
finally:
    video.release()
    isf.terminate()
```

:::

## 每次调整一个参数 {#tune-one-setting-at-a-time}

| Setting | 作用 | 调整建议 |
| --- | --- | --- |
| Detector pixel level | 设置检测模型的输入尺寸。 | 在模型支持的范围内提高输入尺寸，可能改善小脸检测，但也会增加计算量。 |
| Maximum faces | 限制会话处理的人脸数量。 | 按实际业务需要设置，避免留出过大的容量。 |
| Detection confidence threshold | 过滤低于阈值的检测结果。 | 先检查漏检和误检样本，再调整阈值。 |
| Minimum face pixel size | 过滤尺寸过小的人脸。 | 结合输入分辨率和后续任务选择。 |
| Track preview size | 设置跟踪时使用的预览与预处理尺寸。 | 与检测模型的输入尺寸分别配置。 |
| Detector interval | 控制跟踪期间运行检测的频率。 | 间隔越短，通常越容易及时发现新出现的人脸，但检测开销也更高。 |
| Landmark smoothing | 平滑连续帧中的关键点位置。 | 增强平滑可以减少抖动，也可能增加响应延迟。 |

支持的检测输入档位由模型包决定。C 使用 `HFQuerySupportedPixelLevelsForFaceDetection`，Android 使用 `InspireFace.QuerySupportedPixelLevelsForFaceDetection()`，Objective-C 使用 `IFRuntime.getSupportedDetectionPixelLevels:error:`，Swift 使用 `InspireFaceRuntime.getSupportedDetectionPixelLevels(_:)` 查询可用档位，再从中选择会话使用的值。

各接口对应的设置方法如下：

::: tabs #api-language

@tab C API

对已创建的会话设置参数；任何一步失败时返回对应状态码。

```c
static HResult tune_tracking(HFSession session) {
    HResult status = HFSessionSetFaceDetectThreshold(session, 0.5f);
    if (status != HSUCCEED) return status;
    status = HFSessionSetFilterMinimumFacePixelSize(session, 32);
    if (status != HSUCCEED) return status;
    status = HFSessionSetTrackPreviewSize(session, 320);
    if (status != HSUCCEED) return status;
    status = HFSessionSetTrackModeDetectInterval(session, 20);
    if (status != HSUCCEED) return status;
    status = HFSessionSetTrackModeSmoothRatio(session, 0.05f);
    if (status != HSUCCEED) return status;
    return HFSessionSetTrackModeNumSmoothCacheFrame(session, 5);
}
```

@tab C++

当前头文件提供浮点数版本的平滑参数接口，注意保留 `f` 后缀。

```cpp
session.SetFaceDetectThreshold(0.5f);
session.SetFilterMinimumFacePixelSize(32);
session.SetTrackPreviewSize(320);
session.SetTrackModeDetectInterval(20);
session.SetTrackModeSmoothRatio(0.05f);
session.SetTrackModeNumSmoothCacheFrame(5);
```

@tab Objective-C

在会话的处理队列上调用这些 setter。任一设置失败后返回 `NO`，不再继续修改后续参数。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL TuneTracking(IFSession *session, NSError **error) {
    return [session setDetectionThreshold:0.5f error:error] &&
        [session setMinimumFacePixelSize:32 error:error] &&
        [session setTrackPreviewSize:320 error:error] &&
        [session setDetectionInterval:20 error:error] &&
        [session setTrackingSmoothRatio:0.05f error:error] &&
        [session setTrackingSmoothCacheFrames:5 error:error];
}
```

@tab Swift

对已有 `FaceSession` 调用。每个 setter 失败时都会抛出错误；在帧循环开始前，或一帧处理完成后调整参数。

```swift
import InspireFaceSwift

func tuneTracking(session: FaceSession) throws {
    try session.setDetectionThreshold(0.5)
    try session.setMinimumFacePixelSize(32)
    try session.setTrackPreviewSize(320)
    try session.setDetectionInterval(20)
    try session.setTrackingSmoothRatio(0.05)
    try session.setTrackingSmoothCacheFrames(5)
}
```

@tab Java

传入帧循环使用的 `long` 会话句柄。每次调用返回状态码，失败时 `check` 抛出异常。在启动循环前，或前一帧处理完成后调整参数。

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

public final class TrackingSettings {
    public static void tune(long session) {
        check(HFSessionSetFaceDetectThreshold(session, 0.5f));
        check(HFSessionSetFilterMinimumFacePixelSize(session, 32));
        check(HFSessionSetTrackPreviewSize(session, 320));
        check(HFSessionSetTrackModeDetectInterval(session, 20));
        check(HFSessionSetTrackModeSmoothRatio(session, 0.05f));
        check(HFSessionSetTrackModeNumSmoothCacheFrame(session, 5));
    }
}
```

@tab Android

对已有的 `Session` 设置参数。`QuerySupportedPixelLevelsForFaceDetection()` 查询当前模型包支持的检测尺寸，`GetTrackPreviewSize()` 读取实际预览尺寸。下方同时展示丢失后重新检测与跟踪置信度的设置；使用目标摄像头的视频评估阈值。启用丢失恢复后，如果当前帧未执行检测且所有跟踪目标都丢失，会在这一帧补做一次检测，因此该帧耗时可能增加。

```java
System.out.println(java.util.Arrays.toString(
        InspireFace.QuerySupportedPixelLevelsForFaceDetection()));
InspireFace.SetFaceDetectThreshold(session, 0.5f);
InspireFace.SetFilterMinimumFacePixelSize(session, 32);
InspireFace.SetTrackPreviewSize(session, 320);
InspireFace.SetTrackModeDetectInterval(session, 20);
InspireFace.SetTrackModeSmoothRatio(session, 0.05f);
InspireFace.SetTrackModeNumSmoothCacheFrame(session, 5);
InspireFace.SetTrackLostRecoveryMode(session, true);
InspireFace.SetLightTrackConfidenceThreshold(session, 0.6f);
System.out.println("preview=" + InspireFace.GetTrackPreviewSize(session));
```

@tab HarmonyOS

对已有 `Session` 调用 `configure`。`getSupportedPixelLevels()` 返回当前模型包支持的检测尺寸。切换到另一段相机序列时，用 `session.clearTracking()` 清空跟踪历史。

```ts
import { InspireFace } from '@hyperinspire/inspireface';

console.info(`detector levels: ${InspireFace.getSupportedPixelLevels()}`);
session.configure({
  detectThreshold: 0.5,
  minimumFaceSize: 32,
  previewSize: 320,
  detectInterval: 20,
  smoothRatio: 0.05,
  smoothCacheFrames: 5
});
```

@tab Python

以下方法用于已创建的 `InspireFaceSession`。

```python
session.set_detection_confidence_threshold(0.5)
session.set_filter_minimum_face_pixel_size(32)
session.set_track_preview_size(320)
session.set_track_model_detect_interval(20)
session.set_track_mode_smooth_ratio(0.05)
session.set_track_mode_num_smooth_cache_frame(5)
```

:::

使用目标摄像头的典型视频调整这些示例值。Python 的 `set_track_model_detect_interval` 对应 C 接口的 `HFSessionSetTrackModeDetectInterval`。

## 重置跟踪序列 {#resetting-a-sequence}

切换摄像头、跳转视频位置或改变输入方向后，应重置跟踪历史。C 与 Java 提供 `HFSessionClearTrackingFace`，C++ 提供 `Session::ClearTrackingFace`，Objective-C 使用 `[session clearTrackingWithError:&error]`，Swift 使用 `try session.clearTracking()`，HarmonyOS 使用 `session.clearTracking()`，Android 使用 `InspireFace.ClearTrackingFace(session)`。清空前先处理完上一帧，清空后继续复用该会话。使用 Python 高层接口时，重新创建会话开始新序列。

按应用需要的输出启用姿态、质量、识别和其他分析模型。优化整个循环之前，先[分别测量检测、跟踪和分析的耗时](./benchmark-remark(updating).md)。
