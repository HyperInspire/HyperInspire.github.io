# 从视频中选择人脸 {#select-a-face-from-video}

人脸抓拍从视频中选择可用的人脸图像。它持续检查人脸的位置、大小和稳定性，再保留合适的候选帧，适用于人脸录入、头像采集等需要少量合格图像的场景。

本页使用 **1.2.4** 的抓拍和快照接口，封装类、头文件与原生库需使用同一版本。Android 接入时，从 1.2.4 一起构建 Java 类和 JNI 库。

## 抓拍如何推进 {#how-capture-progresses}

<figure>
<a href="/images/capture-state-flow.svg" target="_blank" rel="noopener"><img class="doc-diagram" src="/images/capture-state-flow.svg" alt="抓拍的主要状态流程、丢失跟踪后的恢复与结束条件" loading="lazy" /></a>
<figcaption>抓拍先等待稳定的人脸，再收集候选帧。READY 表示已满足抓拍条件；FINISHED 表示本轮结束，也可能由超时触发。</figcaption>
</figure>

<details>
<summary>文字版流程</summary>

```text
Frame + timestamp → Track faces → Evaluate enabled filters
                                      ↓
                 IDLE → STABILIZING → COLLECTING → READY
                            ↑                         ↓
                       Retry / reset              finish()
                                                  FINISHED
```

</details>

每次 `update` 同步评估一帧。应用负责打开摄像头、调度处理任务和显示提示。跟踪目标丢失时可能进入 `TRACK_LOST`，配置的宽限时间和新出现的稳定目标决定如何恢复。调用 `reset()` 可以开始新一轮抓拍。

## 从默认策略开始 {#start-with-the-default-policy}

::: tabs #api-language

@tab C API

SDK 和 `HF_DETECT_MODE_LIGHT_TRACK` 会话已初始化。抓拍对象只创建一次，每个有效图像流调用一次 `update_capture`；结束时先释放抓拍对象，再释放父会话。当前 `outputCount` 最多为八，因此结果数组预留八个位置。

```c
#include <stdio.h>
#include <inspireface.h>

static HResult create_capture(HFSession session, HFFaceCaptureSession *capture) {
    HFFaceCaptureConfig config = {0};
    HResult status = HFGetDefaultFaceCaptureConfig(&config);
    if (status != HSUCCEED) return status;
    return HFCreateFaceCaptureSession(session, &config, capture);
}

static HResult update_capture(HFFaceCaptureSession capture, HFImageStream stream,
                              HFUInt64 frame_id, HFUInt64 timestamp_ms,
                              HFFaceCaptureProgress *progress) {
    HResult status = HFUpdateFaceCaptureSession(
        capture, stream, frame_id, timestamp_ms, progress);
    if (status != HSUCCEED) return status;
    printf("state=%d reject=%llu\n", progress->state,
           (unsigned long long)progress->rejectReasons);
    if (progress->state == HF_CAPTURE_STATE_READY) {
        status = HFFinishFaceCaptureSession(capture, progress);
        if (status != HSUCCEED) return status;
    }
    HFFaceCaptureResult results[8];
    HFUInt32 count = 0;
    status = HFGetFaceCaptureResults(capture, results, 8, &count);
    if (status != HSUCCEED) return status;
    for (HFUInt32 i = 0; i < count; ++i) {
        printf("candidate=%llu score=%.3f\n",
               (unsigned long long)results[i].frameId, results[i].score);
    }
    // Retain matching candidate images in the application (see below).
    return HSUCCEED;
}
// End of the round: HFReleaseFaceCaptureSession(capture);
```

@tab C++

C++ 的 `FaceCaptureSelector` 独立于会话，更新时接收当前帧和已有的跟踪结果。保留会话与选择器，每帧调用 `updateCapture(frame, frameId, timestampMs)`。

```cpp
inspire::CustomPipelineParameter options;
auto session = inspire::Session::Create(
    inspire::DETECT_MODE_LIGHT_TRACK, 5, options, 320);
inspire::FaceCaptureSelector capture;
inspire::FaceCaptureConfig config;
if (capture.Configure(config, options) != 0) {
    throw std::runtime_error("Cannot configure capture");
}
auto updateCapture = [&](inspirecv::FrameProcess& frame,
                         uint64_t frameId, uint64_t timestampMs) {
    std::vector<inspire::FaceTrackWrap> faces;
    if (session.FaceDetectAndTrack(frame, faces) != 0) {
        throw std::runtime_error("Tracking failed");
    }
    inspire::FaceCaptureUpdate progress;
    if (capture.Update(frame, faces, frameId, timestampMs, progress) != 0) {
        throw std::runtime_error("Capture update failed");
    }
    if (progress.state == inspire::CAPTURE_STATE_READY) {
        if (capture.Finish(progress) != 0) throw std::runtime_error("Capture finish failed");
    }
    for (const auto& candidate : capture.GetResults()) {
        std::cout << candidate.frameId << " " << candidate.score << '\n';
    }
    return progress.state;
};
```

@tab Objective-C

使用已打开的 `LIGHT_TRACK` 会话，`maximumFaces` 大于 1。抓拍对象只创建一次，随后在同一串行工作队列中逐帧调用 `UpdateCapture`。`BOOL`/`NSError` 返回错误，`progress` 返回抓拍状态。结果中的 token 是借用数据，应在下一次更新、重置、结束或关闭前用完。

```objc
#import <InspireFace/InspireFaceApple.h>

static IFCaptureSession *CreateCapture(IFSession *session, NSError **error) {
    HFFaceCaptureConfig config = {0};
    if (![IFCaptureSession getDefaultConfiguration:&config error:error]) return nil;
    return [[IFCaptureSession alloc] initWithSession:session configuration:config error:error];
}

static BOOL UpdateCapture(IFCaptureSession *capture, IFImageStream *stream,
                          uint64_t frameID, uint64_t timestampMS,
                          HFFaceCaptureProgress *progress, NSError **error) {
    if (![capture updateStream:stream frameID:frameID timestampMilliseconds:timestampMS
        progress:progress error:error]) return NO;
    if (progress->state == HF_CAPTURE_STATE_READY &&
        ![capture finishWithProgress:progress error:error]) return NO;
    HFFaceCaptureResult results[HF_FACE_CAPTURE_MAX_RESULTS];
    uint32_t count = 0;
    if (![capture getResults:results capacity:HF_FACE_CAPTURE_MAX_RESULTS
        count:&count error:error]) return NO;
    for (uint32_t i = 0; i < count; ++i) {
        NSLog(@"candidate=%llu score=%.3f", (unsigned long long)results[i].frameId,
            results[i].score);
    }
    return YES;
}
// Stop updating when progress.state == HF_CAPTURE_STATE_FINISHED.
// Close capture before session: [capture closeWithError:&error];
```

@tab Swift

父会话使用 `.lightTracking` 和 `maximumFaces: 5`。整段序列复用一个抓拍对象和结果缓冲区，结束时释放缓冲区，先关闭抓拍再关闭会话。返回状态等于 `Int32(HF_CAPTURE_STATE_FINISHED.rawValue)` 时停止送帧。`results(into:)` 复制结果描述符，其中的 token 内容仍是借用数据。

```swift
import InspireFaceSwift

func createCapture(session: FaceSession) throws -> FaceCaptureSession {
    try FaceCaptureSession(session: session,
                           configuration: FaceCaptureSession.defaultConfiguration())
}

func updateCapture(capture: FaceCaptureSession, stream: ImageStream,
                   frameID: UInt64, timestampMS: UInt64,
                   results: UnsafeMutableBufferPointer<HFFaceCaptureResult>) throws
    -> HFFaceCaptureProgress {
    var progress = HFFaceCaptureProgress()
    try capture.update(stream, frameID: frameID,
                       timestampMilliseconds: timestampMS, progress: &progress)
    if progress.state == Int32(HF_CAPTURE_STATE_READY.rawValue) {
        try capture.finish(progress: &progress)
    }
    let count = try capture.results(into: results)
    for i in 0..<count {
        print("candidate=\(results[i].frameId) score=\(results[i].score)")
    }
    return progress
}
// Allocate once for the frame loop; pass this buffer to updateCapture.
func makeCaptureResultBuffer() -> UnsafeMutableBufferPointer<HFFaceCaptureResult> {
    .allocate(capacity: Int(HF_FACE_CAPTURE_MAX_RESULTS))
}
// After the loop: results.deallocate(); try capture.close(); try session.close()
```

@tab Android

使用 **1.2.4 的 `FaceCapture` 类及配套 JNI 库**，并先创建跟踪 `Session`。`FaceCapture` 位于 `com.insightface.sdk.inspireface`，结果和配置类位于其 `.base` 包。每帧调用更新方法，摄像头工作线程结束后关闭抓拍对象。

```java
static FaceCapture createCapture(Session session) {
    return FaceCapture.create(session, FaceCapture.defaultConfig());
}

static FaceCaptureProgress updateCapture(FaceCapture capture, ImageStream stream,
                                         long frameId, long timestampMs) {
    FaceCaptureProgress progress = capture.update(stream, frameId, timestampMs);
    System.out.println(progress.state + " " + progress.rejectReasons);
    if (progress.state == FaceCapture.STATE_READY) {
        progress = capture.finish();
    }
    for (FaceCaptureResult candidate : capture.getResults()) {
        System.out.println(candidate.frameId + " " + candidate.score);
    }
    return progress;
}
// At the end of the round: capture.close();
// Then release the parent session and remaining image streams.
```

@tab HarmonyOS

使用已创建的 `LIGHT_TRACK` 会话，`maxFaces` 设为大于 1。抓拍对象只创建一次，每帧调用更新函数。停止帧循环后先执行 `capture.close()`，再关闭父会话。每帧的输入图像流由调用方管理。

```ts
import { FaceCaptureProgress, FaceCaptureSession, FaceCaptureState,
         ImageStream, Session } from '@hyperinspire/inspireface';

export function createCapture(session: Session): FaceCaptureSession {
  return new FaceCaptureSession(session, FaceCaptureSession.getDefaultConfig());
}

export function updateCapture(capture: FaceCaptureSession, image: ImageStream,
                              frameId: number, timestampMs: number): FaceCaptureProgress {
  let progress = capture.update(image, frameId, timestampMs);
  console.info(`state=${progress.state}, rejected=${progress.rejectReasons}`);
  if (progress.state === FaceCaptureState.READY) {
    progress = capture.finish();
  }
  for (const candidate of capture.getResults()) {
    console.info(`frame=${candidate.frameId}, score=${candidate.score}`);
  }
  return progress;
}
```

@tab Python

上下文管理器应覆盖整个视频循环；下方的一次更新用于展示其中一帧的处理。

```python
# The SDK is already launched. Requires the current 1.2.4 wrapper.
with isf.InspireFaceSession(
    isf.HF_ENABLE_NONE,
    isf.HF_DETECT_MODE_LIGHT_TRACK,
    max_detect_num=5,
    detect_pixel_level=320,
    auto_launch=False,
) as session:
    config = isf.FaceCaptureConfig.defaults()
    with session.create_face_capture(config) as capture:
        progress = capture.update(frame, frame_id=0, timestamp_ms=0)
        print(progress.state.name, progress.reject_reasons)
```

:::

Python 的 `frame` 是 BGR 图像数组；原生接口传入对应的图像流或 `FrameProcess`。抓拍需要持续评估连续帧，帧 ID 和毫秒时间戳应**严格递增**。实时采集使用单调时钟，离线视频使用视频自身的时间戳。

抓拍进入 `FINISHED` 后，停止提交本轮图像，读取最终结果；需要再采集时，先重置抓拍对象。

即使没有达到 `READY`，结束后仍可能保留候选帧。下面的示例仅在达到 `READY` 后保存图像；提前结束的轮次按抓拍未完成处理。

将 `max_detect_num` 设为大于 1，使人数过滤能够发现并拒绝出现多张人脸的帧。

| Filter | 默认检查内容 |
| --- | --- |
| Face count | 有且只有一张可用于抓拍的人脸。 |
| Face size | 人脸宽度占图像宽度的比例在配置范围内。 |
| Position and boundary | 人脸靠近中心，并完整处于画面内。 |
| Stability | 人脸的位置和大小在一段时间内保持稳定。 |
| Track count | 同一人脸的跟踪次数达到要求。 |

当前默认策略输出一帧，要求至少五次跟踪观测、300 ms 稳定时间和 800 ms 收集时间。通过接口读取默认配置，再修改应用需要调整的字段。

## 保存选中的图像 {#keep-the-selected-images}

抓拍结果包含帧 ID、时间戳、评分、人脸 token 和指标。**选中帧的像素由应用单独缓存**，各语言可以使用同一策略：每次更新后读取候选 ID，只复制本次被选中的图像，删除已不在候选列表中的缓存。Apple 接入时，在摄像头缓冲区复用前把选中帧的像素复制到应用持有的存储中；保留 token 不会保留图像。C++ 可使用 `Image::Clone()`；Android 应在相机缓冲区被复用前复制 bitmap 或图像字节。ArkTS 可用 `new Uint8Array(bytes)` 复制选中的相机图像，并按 `frameId` 缓存。下面是 Python 写法：

<figure>
<a href="/images/capture-candidate-cache.svg" target="_blank" rel="noopener"><img class="doc-diagram" src="/images/capture-candidate-cache.svg" alt="output_count 为 1 时，按选中的 frame ID 更新候选图像缓存" loading="lazy" /></a>
<figcaption>分数仅用于说明缓存更新方式。第 13 帧没有替换第 12 帧；第 14 帧入选后，才释放旧候选图像。</figcaption>
</figure>

```python
# Inside the frame loop; candidates is an initially empty dictionary.
progress = capture.update(frame, frame_id, timestamp_ms)
results = capture.results()
kept_ids = {result.frame_id for result in results}
if frame_id in kept_ids:
    candidates[frame_id] = frame.copy()
candidates = {key: value for key, value in candidates.items() if key in kept_ids}

if progress.state == isf.FaceCaptureState.READY:
    capture.finish()
    selected = capture.results()[0]
    selected_frame = candidates[selected.frame_id]
elif progress.state == isf.FaceCaptureState.FINISHED:
    raise RuntimeError("Capture finished before becoming ready; start a new round")
```

缓存只保留当前候选，数量由 `output_count` 决定，最多八帧。较早入选的帧会一直保留，直到被更好的候选替换或本轮结束。

将下面的完整代码保存为 `capture.py`，然后传入视频路径：

<details>
<summary>capture.py — 完整代码</summary>

```python
"""Select a stable face frame from a video using InspireFace 1.2.4."""
import argparse
import math
from pathlib import Path

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video")
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", default="captured.jpg")
    args = parser.parse_args()
    video = cv2.VideoCapture(args.video)
    if not video.isOpened():
        parser.error("Cannot open the input video")
    fps = video.get(cv2.CAP_PROP_FPS)
    if not math.isfinite(fps) or not 0 < fps <= 1000:
        video.release()
        parser.error("This example needs a video with a valid frame rate")

    launched = False
    try:
        isf.launch(resource_path=args.model)
        launched = True
        with isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_LIGHT_TRACK,
            max_detect_num=5, detect_pixel_level=320, auto_launch=False,
        ) as session:
            config = isf.FaceCaptureConfig.defaults()
            with session.create_face_capture(config) as capture:
                candidates = {}
                frame_id = 0
                while True:
                    ok, frame = video.read()
                    if not ok:
                        break
                    # Use video time, not the speed of this offline processing loop.
                    timestamp_ms = round(frame_id * 1000 / fps)
                    progress = capture.update(frame, frame_id, timestamp_ms)
                    results = capture.results()
                    kept_ids = {result.frame_id for result in results}
                    if frame_id in kept_ids:
                        candidates[frame_id] = frame.copy()
                    candidates = {key: value for key, value in candidates.items()
                                  if key in kept_ids}
                    print(frame_id, progress.state.name, int(progress.reject_reasons))
                    frame_id += 1
                    if progress.state == isf.FaceCaptureState.READY:
                        capture.finish()
                        selected = capture.results()[0]
                        output = Path(args.output)
                        output.parent.mkdir(parents=True, exist_ok=True)
                        if not cv2.imwrite(str(output), candidates[selected.frame_id]):
                            raise RuntimeError(f"Cannot write {output}")
                        print(f"Saved frame {selected.frame_id} to {output}")
                        return
                    if progress.state == isf.FaceCaptureState.FINISHED:
                        raise RuntimeError("Capture finished before becoming ready; start a new round")
                raise RuntimeError("Video ended before capture was ready")
    finally:
        video.release()
        if launched:
            isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python capture.py enrollment.mp4 --model /path/to/Pikachu --output captured.jpg
```

脚本在 `READY` 后保存选中的完整帧。如果尚未准备好就结束抓拍（例如收集超时），或视频先结束，脚本会立即报错并停止。示例按恒定帧率视频计算时间；可变帧率输入应使用实际显示时间戳。

## 添加质量与姿态检查 {#add-quality-and-pose-checks}

同时启用对应的会话选项和抓拍过滤项：

::: tabs #api-language

@tab C API

创建父会话时启用 `HF_ENABLE_QUALITY | HF_ENABLE_FACE_POSE`。先读取完整的默认配置，再修改需要的字段。

```c
HFFaceCaptureConfig config = {0};
HResult status = HFGetDefaultFaceCaptureConfig(&config);
if (status != HSUCCEED) return status;
config.filterMask |= HF_CAPTURE_FILTER_QUALITY | HF_CAPTURE_FILTER_POSE;
config.minQualityScore = 0.60f;
config.maxAbsYaw = 25.0f;
config.maxAbsPitch = 25.0f;
config.maxAbsRoll = 20.0f;
// Pass config to HFCreateFaceCaptureSession with the enabled parent session.
```

@tab C++

创建跟踪会话和配置抓拍选择器时传入相同的选项。`FaceCaptureSelector` 会读取这个会话产生的姿态和质量信息。

```cpp
inspire::CustomPipelineParameter options;
options.enable_face_quality = true;
options.enable_face_pose = true;
auto session = inspire::Session::Create(
    inspire::DETECT_MODE_LIGHT_TRACK, 5, options, 320);
inspire::FaceCaptureConfig config;
config.filterMask |= inspire::CAPTURE_FILTER_QUALITY | inspire::CAPTURE_FILTER_POSE;
config.minQualityScore = 0.60f;
config.maxAbsYaw = 25.0f;
config.maxAbsPitch = 25.0f;
config.maxAbsRoll = 20.0f;
inspire::FaceCaptureSelector capture;
if (capture.Configure(config, options) != 0) {
    throw std::runtime_error("Cannot configure capture filters");
}
```

@tab Objective-C

创建父跟踪会话时启用 `HF_ENABLE_QUALITY | HF_ENABLE_FACE_POSE`。返回的抓拍对象使用这些模型；返回 `nil` 时通过 `NSError` 获取原因。

```objc
#import <InspireFace/InspireFaceApple.h>

static IFCaptureSession *CreateFilteredCapture(IFSession *session, NSError **error) {
    HFFaceCaptureConfig config = {0};
    if (![IFCaptureSession getDefaultConfiguration:&config error:error]) return nil;
    config.filterMask |= HF_CAPTURE_FILTER_QUALITY | HF_CAPTURE_FILTER_POSE;
    config.minQualityScore = 0.60f;
    config.maxAbsYaw = 25.0f;
    config.maxAbsPitch = 25.0f;
    config.maxAbsRoll = 20.0f;
    return [[IFCaptureSession alloc] initWithSession:session configuration:config error:error];
}
```

@tab Swift

父会话的 `SessionConfiguration` 启用 `features: [.quality, .pose]` 和 `detectionMode: .lightTracking`。函数调整默认抓拍策略，创建失败时抛出错误。Swift 当前不能导入 C 头文件中的 `HF_CAPTURE_FILTER_*` 宏，下面两个局部 `UInt64` 值使用配套头文件定义的位位置。

```swift
import InspireFaceSwift

func createFilteredCapture(session: FaceSession) throws -> FaceCaptureSession {
    var config = try FaceCaptureSession.defaultConfiguration()
    let qualityFilter: UInt64 = 1 << 6  // HF_CAPTURE_FILTER_QUALITY
    let poseFilter: UInt64 = 1 << 5     // HF_CAPTURE_FILTER_POSE
    config.filterMask |= qualityFilter | poseFilter
    config.minQualityScore = 0.60
    config.maxAbsYaw = 25
    config.maxAbsPitch = 25
    config.maxAbsRoll = 20
    return try FaceCaptureSession(session: session, configuration: config)
}
```

@tab Android

使用 1.2.4 Java 类及配套 JNI 库。先在父会话中启用质量和姿态，再配置抓拍过滤项：

```java
FaceCaptureConfig config = FaceCapture.defaultConfig();
config.filterMask |= FaceCapture.FILTER_QUALITY | FaceCapture.FILTER_POSE;
config.minQualityScore = 0.60f;
config.maxAbsYaw = 25.0f;
config.maxAbsPitch = 25.0f;
config.maxAbsRoll = 20.0f;
// Parent session must already provide quality and pose.
// Then: FaceCapture.create(session, config);
```

@tab HarmonyOS

父会话先启用 `Feature.QUALITY | Feature.FACE_POSE`。下面在默认抓拍规则上增加质量和姿态检查。帧循环中复用返回的抓拍对象，结束后先关闭抓拍，再关闭会话。

```ts
import { FaceCaptureFilter, FaceCaptureSession, Session }
  from '@hyperinspire/inspireface';

export function createFilteredCapture(session: Session): FaceCaptureSession {
  const config = FaceCaptureSession.getDefaultConfig();
  config.filterMask = (config.filterMask ?? FaceCaptureFilter.NONE) |
    FaceCaptureFilter.QUALITY | FaceCaptureFilter.POSE;
  config.minQualityScore = 0.60;
  config.maxAbsYaw = 25;
  config.maxAbsPitch = 25;
  config.maxAbsRoll = 20;
  return new FaceCaptureSession(session, config);
}
```

@tab Python

先启用会话功能，再创建抓拍对象。

```python
options = isf.HF_ENABLE_QUALITY | isf.HF_ENABLE_FACE_POSE
config = isf.FaceCaptureConfig.defaults()
config.filter_mask |= int(isf.FaceCaptureFilter.QUALITY | isf.FaceCaptureFilter.POSE)
config.min_quality_score = 0.60
config.max_abs_yaw = 25.0
config.max_abs_pitch = 25.0
config.max_abs_roll = 20.0
# Create the session with options, then create_face_capture(config).
```

:::

还可以按需启用清晰度和亮度过滤。先使用默认策略，查看被拒绝的帧，再逐个调整参数，观察每项设置对抓拍的影响。

使用 `progress.reject_reasons` 生成具体提示，例如“请靠近一些”或“请将人脸保持在框内”。有效指标掩码标记了本次已计算的字段：Python 使用 `metrics.available_filters`，C、C++、Java 和 ArkTS 使用 `metrics.availableMetrics`。读取掩码中包含的字段即可。

## 复用检测快照 {#reuse-a-detection-snapshot}

::: warning 快照的生命周期与复制开销
Snapshot 会复制检测结果，生命周期更清晰，保留结果和延后处理时更安全、易用，但也会增加复制开销和延时。单路视频按顺序跟踪时，可以通过 C、Objective-C 或 Swift 读取会话内的借用结果，并在下一次检测前用完，减少这部分复制。借用数据可能被后续调用覆盖，不适合跨帧保留，或在同一会话的多次处理之间交叉复用。检测快照不复制原始图像，后续仍需处理像素时，应另行保留对应帧。
:::

如果每帧已经需要检测结果来绘制人脸框，可以避免重复运行跟踪：

::: tabs #api-language

@tab C API

为当前帧创建一份独立快照，在快照有效期内读取人脸框，再交给现有抓拍对象评估。`progress` 用于接收本次处理状态。

```c
static HResult capture_with_snapshot(HFSession session,
                                    HFFaceCaptureSession capture,
                                    HFImageStream stream, HFUInt64 frame_id,
                                    HFUInt64 timestamp_ms,
                                    HFFaceCaptureProgress *progress) {
    HFFaceResultSnapshot snapshot = NULL;
    HResult status = HFExecuteFaceTrackSnapshot(session, stream, &snapshot);
    if (status != HSUCCEED) return status;
    HFMultipleFaceData faces = {0};
    status = HFGetFaceResultSnapshotData(snapshot, &faces);
    if (status == HSUCCEED) {
        // Read or copy faces.rects here for the overlay.
        status = HFUpdateFaceCaptureSessionWithSnapshot(
            capture, stream, snapshot, frame_id, timestamp_ms, progress);
    }
    HResult release_status = HFReleaseFaceResultSnapshot(snapshot);
    return status == HSUCCEED ? release_status : status;
}
```

@tab C++

C++ 返回的 `FaceTrackWrap` 按值保存检测信息。同一个 vector 可以交给绘制逻辑和 `FaceCaptureSelector` 使用。

```cpp
std::vector<inspire::FaceTrackWrap> faces;
int status = session.FaceDetectAndTrack(frame, faces);
if (status != 0) throw std::runtime_error("Tracking failed");
for (const auto& face : faces) {
    auto box = session.GetFaceBoundingBox(face);
    // Transform box to preview coordinates and draw it.
}
inspire::FaceCaptureUpdate progress;
status = capture.Update(frame, faces, frameId, timestampMs, progress);
if (status != 0) throw std::runtime_error("Capture update failed");
```

@tab Objective-C

函数只管理本次新建的快照，抓拍使用完毕后将其关闭。框坐标在函数内同步读取；若异步更新预览，应先复制所需的框，再转换到预览坐标绘制。抓拍对象、会话和图像流由调用方管理。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL CaptureWithSnapshot(IFSession *session, IFCaptureSession *capture,
                                IFImageStream *stream, uint64_t frameID,
                                uint64_t timestampMS, HFFaceCaptureProgress *progress,
                                NSError **error) {
    IFFaceSnapshot *snapshot = [session snapshotFromStream:stream error:error];
    if (snapshot == nil) return NO;
    @try {
        HFMultipleFaceData faces = {0};
        if (![snapshot getBorrowedFaces:&faces error:error]) return NO;
        for (HInt32 i = 0; i < faces.detectedNum; ++i) {
            NSLog(@"track=%d x=%d y=%d", faces.trackIds[i], faces.rects[i].x, faces.rects[i].y);
        }
        return [capture updateStream:stream snapshot:snapshot frameID:frameID
            timestampMilliseconds:timestampMS progress:progress error:error];
    } @finally {
        [snapshot closeWithError:NULL];
    }
}
```

@tab Swift

一帧使用同一会话产生的快照和对应图像。快照独立持有检测结果，但 `withUnsafeFaces` 返回的仍是对快照存储的借用视图；`snapshot.close()` 后还要使用的数据需先复制，原图像素另行管理。

```swift
import InspireFaceSwift

func captureWithSnapshot(session: FaceSession, capture: FaceCaptureSession,
                         stream: ImageStream, frameID: UInt64,
                         timestampMS: UInt64) throws -> HFFaceCaptureProgress {
    let snapshot = try session.snapshot(from: stream)
    defer { try? snapshot.close() }
    try snapshot.withUnsafeFaces { faces in
        for i in 0..<faces.count {
            let box = faces.rectangles[i]
            print("track=\(faces.trackIDs[i]) x=\(box.x) y=\(box.y)")
        }
    }
    var progress = HFFaceCaptureProgress()
    try capture.update(stream, snapshot: snapshot, frameID: frameID,
                       timestampMilliseconds: timestampMS, progress: &progress)
    return progress
}
```

@tab Android

将 `FaceDetectionSnapshot` 传给抓拍更新方法，完成本帧更新后关闭快照。

```java
try (FaceDetectionSnapshot snapshot = FaceDetectionSnapshot.create(session, stream)) {
    FaceCaptureProgress progress = capture.update(
            stream, snapshot, frameId, timestampMs);
    System.out.println(progress.state + " " + progress.rejectReasons);
}
```

@tab HarmonyOS

`Session.track()` 返回的结果本身就是独立快照。将同一份结果交给抓拍，完成本帧的全部处理后再释放。调用方保留有效的抓拍对象、会话和输入图像流。

```ts
import { FaceCaptureProgress, FaceCaptureSession, ImageStream, Session }
  from '@hyperinspire/inspireface';

export function updateWithSnapshot(session: Session, capture: FaceCaptureSession,
                                   image: ImageStream, frameId: number,
                                   timestampMs: number): FaceCaptureProgress {
  const faces = session.track(image);
  try {
    for (const face of faces.faces) {
      // Transform face.rect to preview coordinates for the overlay.
      console.info(`track=${face.trackId}, x=${face.rect.x}, y=${face.rect.y}`);
    }
    return capture.update(image, frameId, timestampMs, faces);
  } finally {
    session.releaseFaceResult(faces);
  }
}
```

@tab Python

绘制人脸框和抓拍使用同一份独立快照。

```python
with session.face_detection_snapshot(frame) as snapshot:
    progress = capture.update(frame, frame_id, timestamp_ms, snapshot=snapshot)
    boxes = [face.location for face in snapshot.faces]
```

:::

每帧都从同一个会话创建新快照。快照保存该帧的跟踪次数和几何信息，更新抓拍时，与对应的原始图像一起传入。

## 原生接口与生命周期 {#native-apis-and-lifetimes}

C 接口包括 `HFCreateFaceCaptureSession`、`HFUpdateFaceCaptureSession`、`HFGetFaceCaptureResults`、`HFFinishFaceCaptureSession`、`HFResetFaceCaptureSession` 和 `HFReleaseFaceCaptureSession`。使用 `HFGetDefaultFaceCaptureConfig` 初始化带版本的配置结构体。

`HFUpdateFaceCaptureSessionWithSnapshot` 接受具有独立生命周期的检测快照。C、Objective-C 和 Swift 结果中的 token 是借用数据，在下一次抓拍更新、重置、结束或释放之前有效；需要跨越这些调用保留时应复制。先释放抓拍对象，再释放它依赖的会话。Python 封装会复制结果中的人脸 token，并为这两种资源提供上下文管理器。C++ 候选结果按值保存 `FaceTrackWrap`，Java 和 ArkTS 结果会复制 token 字节；对应的原图像素保存在上文所述的应用缓存中。
