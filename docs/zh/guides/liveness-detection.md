# 活体检测 {#liveness-detection}

InspireFace 提供 RGB 活体检测和人脸动作分析。前者对人脸图像给出评分，后者观察连续帧中的动作。应用可以将这些信号用于核验流程，并根据实际摄像头配置采集规则和阈值。

## 选择输入与交互方式 {#choose-the-input-and-interaction}

| Approach | 输入要求 | 结果说明 |
| --- | --- | --- |
| RGB anti-spoofing | 从 RGB 摄像头图像中检测人脸。 | 返回活体置信度分数。 |
| Facial actions | 连续提交同一跟踪人脸的帧。 | 返回睁闭眼分数，以及眨眼、摇头等动作事件。 |
| Passive liveness [Plus] | 按引导完成短时采集。 | 服务端返回这组采集图像的活体判断。 |
| Flash liveness [Plus] | 采集与屏幕补光同步的图像序列。 | 服务端返回这组采集图像的活体判断。 |

先获取清晰、尺寸足够、朝向正确且完整处于画面内的人脸，通过输入检查后，再执行所选的活体流程。

## RGB 活体检测 {#rgb-anti-spoofing}

创建会话时启用活体选项，调用分析流水线时再次请求该功能，返回结果与输入人脸顺序一致。原生头文件和库须匹配；Android 示例使用 1.2.4.post1 AAR。

::: tabs #api-language

@tab C API

创建会话时启用 `HF_ENABLE_LIVENESS`。辅助函数在同一个有效图像流上完成检测和分析，需要包含 `<stdio.h>` 和 `<inspireface.h>`。

```c
static HResult process_rgb_liveness(HFSession session, HFImageStream stream) {
    HFMultipleFaceData faces = {0};
    HResult status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED || faces.detectedNum == 0) return status;
    status = HFMultipleFacePipelineProcessOptional(
        session, stream, &faces, HF_ENABLE_LIVENESS);
    if (status != HSUCCEED) return status;
    HFRGBLivenessConfidence scores = {0};
    status = HFGetRGBLivenessConfidence(session, &scores);
    if (status != HSUCCEED) return status;
    for (HInt32 i = 0; i < faces.detectedNum && i < scores.num; ++i) {
        printf("face=%d liveness=%.4f\n", i, scores.confidence[i]);
    }
    return HSUCCEED;
}
```

@tab C++

创建会话时设置 `options.enable_liveness = true`。下面的 `faces` 必须来自同一 `frame` 的成功检测。

```cpp
inspire::CustomPipelineParameter request;
request.enable_liveness = true;
if (!faces.empty()) {
    int status = session.MultipleFacePipelineProcess(frame, request, faces);
    if (status != 0) throw std::runtime_error("Liveness analysis failed");
    auto scores = session.GetRGBLivenessConfidence();
    for (size_t i = 0; i < faces.size(); ++i) {
        std::cout << i << " " << scores.at(i) << '\n';
    }
}
```

@tab Objective-C

创建 `IFSession` 时启用 `HF_ENABLE_LIVENESS`。传入该会话和当前图像流，并检查 `BOOL`/`NSError`。分数数组借用会话缓存，应在下一次 Pipeline 调用前读取或复制。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL ReadRGBLiveness(IFSession *session, IFImageStream *stream, NSError **error) {
    HFMultipleFaceData faces = {0};
    if (![session trackStream:stream borrowedResult:&faces error:error]) return NO;
    if (faces.detectedNum == 0) return YES;
    if (![session processStream:stream faces:&faces options:HF_ENABLE_LIVENESS error:error]) return NO;
    HFRGBLivenessConfidence scores = {0};
    if (![session getBorrowedRGBLiveness:&scores error:error]) return NO;
    if (scores.num != faces.detectedNum) return IFCheck(HERR_INVALID_PARAM, error);
    for (HInt32 i = 0; i < scores.num; ++i) {
        NSLog(@"face=%d liveness=%.4f", i, scores.confidence[i]);
    }
    return YES;
}
```

@tab Swift

用 `SessionConfiguration(features: [.rgbLiveness])` 创建会话。函数对同一图像流执行检测与分析，SDK 失败时抛出错误；借用的分数数组在闭包中同步读取。

```swift
import InspireFaceSwift

func readRGBLiveness(session: FaceSession, stream: ImageStream) throws {
    try session.withUnsafeFaces(in: stream) { borrowed in
        guard borrowed.count > 0 else { return }
        var faces = borrowed.cValue
        try session.process(stream, faces: &faces, options: Int32(FaceFeatures.rgbLiveness.rawValue))
        var scores = HFRGBLivenessConfidence()
        try session.getBorrowedRGBLiveness(&scores)
        guard scores.num == faces.detectedNum else {
            throw NSError(domain: IFErrorDomain, code: Int(HERR_INVALID_PARAM))
        }
        for i in 0..<borrowed.count {
            print("face=\(i) liveness=\(scores.confidence[i])")
        }
    }
}
```

@tab Java

按 [Java 接入说明](../using-with/java.md)初始化，创建会话后将图像流句柄传给 `readScores`。检测和分析使用同一条图像流。函数立即读取借用的分数缓冲区；交给后续 UI 任务前，先把分数复制为普通数值。调用方在每帧完成后释放图像流，全部处理结束后释放会话。

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

public final class RgbLivenessExample {
    public static long createSession() {
        long[] session = new long[1];
        check(HFCreateInspireFaceSessionOptional(
                HF_ENABLE_LIVENESS, HF_DETECT_MODE_ALWAYS_DETECT, 5, 320, -1, session));
        return session[0];
    }

    public static void readScores(long session, long stream) {
        HFMultipleFaceData faces = new HFMultipleFaceData();
        check(HFExecuteFaceTrack(session, stream, faces));
        if (faces.detectedNum == 0) return;
        check(HFMultipleFacePipelineProcessOptional(session, stream, faces, HF_ENABLE_LIVENESS));
        HFRGBLivenessConfidence scores = new HFRGBLivenessConfidence();
        check(HFGetRGBLivenessConfidence(session, scores));
        if (scores.num != faces.detectedNum) {
            throw new IllegalStateException("Incomplete liveness result");
        }
        for (int i = 0; i < scores.num; i++) {
            System.out.println("face=" + i + " liveness="
                    + scores.confidence.getFloat(i * Float.BYTES));
        }
    }
    // After all frames: check(HFReleaseInspireFaceSession(session));
}
```

@tab Android

创建会话时传入 `InspireFace.CreateCustomParameter().enableLiveness(true)`。下面使用已创建的 `ImageStream`，读取完结果后再释放该图像流。

```java
MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
if (faces == null) throw new IllegalStateException("Detection failed");
if (faces.detectedNum > 0) {
    CustomParameter request = InspireFace.CreateCustomParameter().enableLiveness(true);
    if (!InspireFace.MultipleFacePipelineProcess(session, stream, faces, request)) {
        throw new IllegalStateException("Liveness analysis failed");
    }
    RGBLivenessConfidence scores = InspireFace.GetRGBLivenessConfidence(session);
    if (scores == null || scores.num != faces.detectedNum)
        throw new IllegalStateException("Incomplete liveness results");
    for (int i = 0; i < faces.detectedNum; i++) {
        System.out.println(i + " " + scores.confidence[i]);
    }
}
```

@tab HarmonyOS

启动 SDK 后，用 `featureMask: Feature.LIVENESS` 创建会话。把当前帧的图像流传入函数，处理完成后关闭该图像流。处理视频时保留会话，序列结束后再关闭。

```ts
import { Feature, ImageStream, Session }
  from '@hyperinspire/inspireface';

function readRgbLiveness(session: Session, stream: ImageStream): void {
  const faces = session.track(stream);
  try {
    if (faces.detectedNum === 0) return;
    const result = session.processPipeline(stream, faces, Feature.LIVENESS);
    for (let i = 0; i < faces.detectedNum; ++i) {
      console.info(`face=${i} liveness=${result.rgbLiveness[i]}`);
    }
  } finally {
    session.releaseFaceResult(faces);
  }
}
```

@tab Python

SDK 已启动，`image` 是 BGR 图像数组。

```python
# The SDK is launched and image is a BGR frame.
options = isf.HF_ENABLE_LIVENESS
with isf.InspireFaceSession(options, auto_launch=False) as session:
    faces = session.face_detection(image)
    results = session.face_pipeline(image, faces, options) if faces else []
    for face, result in zip(faces, results):
        print(face.location, result.rgb_liveness_confidence)
```

:::

C 接口使用带 `HF_ENABLE_LIVENESS` 的 `HFMultipleFacePipelineProcessOptional`，随后通过 `HFGetRGBLivenessConfidence` 读取结果。读取置信度数组前，先检查处理状态。

分数越高，越倾向于活体。结合目标相机选择判断阈值：采集真实人脸、打印照片和屏幕翻拍，覆盖实际光照、距离和图像质量，再根据误通过和误拒绝情况确定阈值。

视频中可以对同一跟踪目标最近一小段时间的分数做平滑，让显示更稳定。目标变化或跟踪丢失时清空窗口。

## 人脸动作分析 {#facial-actions}

在跟踪会话中启用 `HF_ENABLE_INTERACTION`，连续送入帧。眨眼和头部动作通过连续帧中的状态变化识别。

::: tabs #api-language

@tab C API

创建会话时使用 `HF_ENABLE_INTERACTION | HF_ENABLE_FACE_POSE` 和 `HF_DETECT_MODE_LIGHT_TRACK`，整个视频期间保留会话。姿态选项用于头部动作，动作模型同时提供眼部和嘴部状态。

```c
static HResult process_actions(HFSession session, HFImageStream stream) {
    HFMultipleFaceData faces = {0};
    HResult status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED || faces.detectedNum == 0) return status;
    status = HFMultipleFacePipelineProcessOptional(
        session, stream, &faces, HF_ENABLE_INTERACTION);
    if (status != HSUCCEED) return status;
    HFFaceInteractionState eyes = {0};
    HFFaceInteractionsActions actions = {0};
    status = HFGetFaceInteractionStateResult(session, &eyes);
    if (status != HSUCCEED) return status;
    status = HFGetFaceInteractionActionsResult(session, &actions);
    if (status != HSUCCEED) return status;
    for (HInt32 i = 0; i < faces.detectedNum && i < actions.num && i < eyes.num; ++i) {
        printf("track=%d left=%.3f right=%.3f blink=%d shake=%d\n",
               faces.trackIds[i], eyes.leftEyeStatusConfidence[i],
               eyes.rightEyeStatusConfidence[i], actions.blink[i], actions.shake[i]);
    }
    return HSUCCEED;
}
```

@tab C++

使用 `DETECT_MODE_LIGHT_TRACK` 创建会话，并将 `enable_interaction_liveness` 和 `enable_face_pose` 设为 `true`。每帧成功执行 `FaceDetectAndTrack` 后，将本帧的 `faces` 用于下列处理。

```cpp
inspire::CustomPipelineParameter request;
request.enable_interaction_liveness = true;
if (!faces.empty()) {
    int status = session.MultipleFacePipelineProcess(frame, request, faces);
    if (status != 0) throw std::runtime_error("Action analysis failed");
    auto eyes = session.GetFaceInteractionState();
    auto actions = session.GetFaceInteractionAction();
    for (size_t i = 0; i < faces.size(); ++i) {
        std::cout << faces[i].trackId << " "
                  << eyes.at(i).left_eye_status_confidence << " "
                  << eyes.at(i).right_eye_status_confidence << " "
                  << actions.at(i).blink << " " << actions.at(i).shake << '\n';
    }
}
```

@tab Objective-C

用 `HF_ENABLE_INTERACTION | HF_ENABLE_FACE_POSE` 创建一个 `HF_DETECT_MODE_LIGHT_TRACK` 会话，并在整段序列中复用。按时间顺序逐帧调用；下一次 Pipeline 前复制 UI 所需的值，并检查 `BOOL`/`NSError`。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL ReadActions(IFSession *session, IFImageStream *stream, NSError **error) {
    HFMultipleFaceData faces = {0};
    if (![session trackStream:stream borrowedResult:&faces error:error]) return NO;
    if (faces.detectedNum == 0) return YES;
    if (![session processStream:stream faces:&faces options:HF_ENABLE_INTERACTION error:error]) return NO;
    HFFaceInteractionState eyes = {0};
    HFFaceInteractionsActions actions = {0};
    if (![session getBorrowedInteractionState:&eyes error:error] ||
        ![session getBorrowedInteractionActions:&actions error:error]) return NO;
    if (eyes.num != faces.detectedNum || actions.num != faces.detectedNum)
        return IFCheck(HERR_INVALID_PARAM, error);
    for (HInt32 i = 0; i < faces.detectedNum; ++i) {
        NSLog(@"track=%d left=%.3f right=%.3f blink=%d shake=%d",
            faces.trackIds[i], eyes.leftEyeStatusConfidence[i],
            eyes.rightEyeStatusConfidence[i], actions.blink[i], actions.shake[i]);
    }
    return YES;
}
```

@tab Swift

用 `SessionConfiguration(features: [.interaction, .pose], detectionMode: .lightTracking, maximumFaces: 5, pixelLevel: 320)` 创建会话并跨帧复用。函数读取当前帧的眼睛分数和动作事件；调用成功后，再更新应用自己的动作挑战状态。

```swift
import InspireFaceSwift

func readActions(session: FaceSession, stream: ImageStream) throws {
    try session.withUnsafeFaces(in: stream) { borrowed in
        guard borrowed.count > 0 else { return }
        var faces = borrowed.cValue
        try session.process(stream, faces: &faces, options: Int32(FaceFeatures.interaction.rawValue))
        var eyes = HFFaceInteractionState()
        var actions = HFFaceInteractionsActions()
        try session.getBorrowedInteractionState(&eyes)
        try session.getBorrowedInteractionActions(&actions)
        guard eyes.num == faces.detectedNum, actions.num == faces.detectedNum else {
            throw NSError(domain: IFErrorDomain, code: Int(HERR_INVALID_PARAM))
        }
        for i in 0..<borrowed.count {
            print("track=\(borrowed.trackIDs[i])")
            print("left=\(eyes.leftEyeStatusConfidence[i]) right=\(eyes.rightEyeStatusConfidence[i])")
            print("blink=\(actions.blink[i]) shake=\(actions.shake[i])")
        }
    }
}
```

@tab Java

启动 SDK 后创建一个跟踪会话，在连续帧间复用。姿态选项为头部动作提供输入。每帧将有效的图像流传给 `readActions`，处理后释放该流，序列结束后释放会话。眼睛分数和动作标记引用会话内存，应在下一次流水线调用前读出需要的值，更新应用的验证步骤。

<details>
<summary>Java — 展开完整动作示例</summary>

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

public final class ActionExample {
    public static long createTracker() {
        long[] session = new long[1];
        check(HFCreateInspireFaceSessionOptional(
                HF_ENABLE_INTERACTION | HF_ENABLE_FACE_POSE,
                HF_DETECT_MODE_LIGHT_TRACK, 5, 320, -1, session));
        return session[0];
    }

    public static void readActions(long session, long stream) {
        HFMultipleFaceData faces = new HFMultipleFaceData();
        check(HFExecuteFaceTrack(session, stream, faces));
        if (faces.detectedNum == 0) return;
        check(HFMultipleFacePipelineProcessOptional(session, stream, faces, HF_ENABLE_INTERACTION));
        HFFaceInteractionState eyes = new HFFaceInteractionState();
        HFFaceInteractionsActions actions = new HFFaceInteractionsActions();
        check(HFGetFaceInteractionStateResult(session, eyes));
        check(HFGetFaceInteractionActionsResult(session, actions));
        if (eyes.num != faces.detectedNum || actions.num != faces.detectedNum) {
            throw new IllegalStateException("Incomplete action result");
        }
        for (int i = 0; i < faces.detectedNum; i++) {
            int f = i * Float.BYTES;
            int n = i * Integer.BYTES;
            System.out.println("track=" + faces.trackIds.getInt(n)
                    + " left=" + eyes.leftEyeStatusConfidence.getFloat(f)
                    + " right=" + eyes.rightEyeStatusConfidence.getFloat(f)
                    + " blink=" + actions.blink.getInt(n)
                    + " shake=" + actions.shake.getInt(n));
        }
    }
    // After the sequence: check(HFReleaseInspireFaceSession(session));
}
```

</details>

@tab Android

使用 `.enableInteractionLiveness(true).enableFacePose(true)` 创建 `DETECT_MODE_LIGHT_TRACK` 会话，显式加载头部动作所需的姿态模型。整个摄像头序列持续复用会话；逐帧读取眼睛状态、眨眼、摇头、抬头和张嘴结果，并据此更新应用的验证步骤。

```java
MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
if (faces == null) throw new IllegalStateException("Tracking failed");
if (faces.detectedNum > 0) {
    CustomParameter request = InspireFace.CreateCustomParameter()
            .enableInteractionLiveness(true);
    if (!InspireFace.MultipleFacePipelineProcess(session, stream, faces, request)) {
        throw new IllegalStateException("Action analysis failed");
    }
    FaceInteractionState eyes = InspireFace.GetFaceInteractionStateResult(session);
    FaceInteractionsActions actions = InspireFace.GetFaceInteractionActionsResult(session);
    if (eyes == null || actions == null || eyes.num != faces.detectedNum
            || actions.num != faces.detectedNum)
        throw new IllegalStateException("Incomplete action results");
    for (int i = 0; i < faces.detectedNum; i++) {
        System.out.println(faces.trackIds[i] + " " + eyes.leftEyeStatusConfidence[i]
                + " " + eyes.rightEyeStatusConfidence[i]
                + " " + actions.blink[i] + " " + actions.shake[i]
                + " " + actions.headRaise[i] + " " + actions.jawOpen[i]);
    }
}
```

@tab HarmonyOS

SDK 启动后，为整段序列创建一个动作跟踪会话。逐帧调用 `readActions`，每帧处理完关闭图像流，采集结束后关闭会话。`FACE_POSE` 提供头部动作需要的姿态信息。

```ts
import { DetectMode, Feature, ImageStream, Session }
  from '@hyperinspire/inspireface';

function createActionTracker(): Session {
  return new Session({
    featureMask: Feature.INTERACTION | Feature.FACE_POSE,
    detectMode: DetectMode.LIGHT_TRACK,
    maxFaces: 5,
    detectPixelLevel: 320
  });
}

function readActions(session: Session, stream: ImageStream): void {
  const faces = session.track(stream);
  try {
    if (faces.detectedNum === 0) return;
    const result = session.processPipeline(stream, faces, Feature.INTERACTION);
    for (let i = 0; i < faces.detectedNum; ++i) {
      console.info(`track=${faces.faces[i].trackId}`);
      console.info(`left=${result.leftEyeStatusConfidence[i]} right=${result.rightEyeStatusConfidence[i]}`);
      console.info(`blink=${result.blink[i]} shake=${result.shake[i]}`);
    }
  } finally {
    session.releaseFaceResult(faces);
  }
}
```

@tab Python

为整段视频创建一个会话，同时启用姿态选项以支持头部动作。

```python
# Keep this session alive for the whole camera sequence.
options = isf.HF_ENABLE_INTERACTION | isf.HF_ENABLE_FACE_POSE
with isf.InspireFaceSession(
    options, isf.HF_DETECT_MODE_LIGHT_TRACK,
    max_detect_num=5, detect_pixel_level=320, auto_launch=False,
) as session:
    # Repeat the following calls for each ordered frame:
    faces = session.face_detection(frame)
    results = session.face_pipeline(frame, faces, options) if faces else []
    for face, result in zip(faces, results):
        print(face.track_id, result.action_blink, result.action_shake)
```

:::

| Field | 说明 |
| --- | --- |
| `left_eye_status_confidence`、`right_eye_status_confidence` | 接近 1 表示睁眼，接近 0 表示闭眼。 |
| `action_blink` | 检测到眨眼事件。 |
| `action_shake` | 检测到摇头事件。 |
| `action_jaw_open` | 检测到张嘴动作。 |
| `action_head_raise` | 检测到抬头动作。 |
| `action_normal` | 模型报告的正常动作状态。 |

应用可以用这些事件推进动作提示：

1. 等待一张稳定的人脸，选择下一个动作。
2. 显示提示，并开始计时。
3. 在时间窗口内，接受同一跟踪目标的对应事件。
4. 超时、人脸变化或跟踪丢失时，清空本轮状态。

分别记录动作完成状态和活体判断结果，再按本轮核验规则处理。

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/action_liveness.webp" alt="依次提示人脸动作的摄像头交互流程" width="1536" height="1024" loading="lazy" />
<figcaption>动作提示由应用推进，SDK 返回对应人脸的眼部状态和动作事件。</figcaption>
</figure>

Android 示例包含 **Silent liveness** 评分页面和 **Action liveness** 动作核验流程。可以先[安装体验应用](../introduction.md#try-the-android-example-app)，比较两种交互方式。

## 可选的 Plus 演示 {#optional-plus-demos}

Android 应用的 **Anti-fraud** 分类提供 **Passive-RGB Liveness · PLUS** 和 **Color liveness · PLUS**。两种方案都由移动端完成相机引导，再由在线服务验证：InspireFace 在设备上定位人脸和眼部关键点，应用采集完整的一轮数据，服务端返回活体结果。人脸识别和身份匹配仍是另外的处理步骤。

Android 演示使用以下采集方式：

| Flow | 采集输入 | 设备要求 |
| --- | --- | --- |
| Passive RGB | 同一张人脸的 20 个连续有效 RGB 帧。 | 前置摄像头与网络连接。 |
| Flash / Color | 白、红、绿、蓝每个光照阶段各采集一个样本。 | 前置摄像头、兼容的传感器时间戳、曝光与白平衡锁定能力，以及网络连接。 |

[安装 Android 示例](../introduction.md#try-the-android-example-app)后，进入对应的 PLUS 页面，阅读人脸数据说明并点击 **Agree and enter**，随后才会打开相机预览。让画面中唯一的一张人脸进入引导区域，保持稳定，再点击 **Start verification**。采集完成后，应用再上传序列。

### 被动 RGB 采集 {#passive-rgb-capture}

被动采集保持屏幕的正常显示，只要求用户面向摄像头。它适合需要短序列输入、又希望省去动作挑战和屏幕补光变化的自拍核验流程。

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="用户在人脸引导框内保持稳定，完成被动活体采集" width="1536" height="1024" loading="lazy" />
<figcaption>移动端负责取景引导，完整序列采集后统一提交，取得一次验证结果。</figcaption>
</figure>

输入序列需要保持**连续**。演示收集同一跟踪人脸的 20 个有效帧，要求相机帧序号和时间戳递增。每个样本来自新采集的相机帧，再通过眼部关键点准备提交给服务端的人脸区域。

短暂晃动或模糊会暂停采集，并在本轮内重新收集连续片段。人脸丢失、出现第二张脸、持续离开引导区域或转头过大时，会停止本轮并丢弃已采集的输入。重新摆正位置后，由用户开始新一轮，重新收集完整序列。

### 炫光采集 {#flash-capture}

应用中的入口名为 **Color liveness**。补光来自手机屏幕：用户直视摄像头，屏幕按白 → 红 → 绿 → 蓝变化。采集图像与对应的光照阶段一起构成完整序列。

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/light_liveness.webp" alt="人脸采集与屏幕颜色变化同步进行" width="1536" height="1024" loading="lazy" />
<figcaption>炫光采集将每张图像与屏幕光照阶段对应起来，时间同步和相机设置稳定都是输入的一部分。</figcaption>
</figure>

正式采样前，演示先使用白光，等待曝光和白平衡稳定，再锁定这两个设置。进入每个阶段时，屏幕立即切换颜色，等待光照稳定后，根据时间信息选择对应的相机帧。四个阶段都完成后，才组成请求。

前置摄像头需要提供 `REALTIME` 传感器时间戳，并支持 AE/AWB 锁定。演示在采集前检查这些能力，不支持的设备会显示提示。

炫光采集适合应用可以在核验步骤中统一控制屏幕和摄像头的场景。机型验证时，应一起观察屏幕亮度、环境光和相机时序。如果希望屏幕保持正常显示，可以在同一批目标设备上评估被动采集。

### 读取验证结果 {#read-the-verification-result}

完整的一轮采集会统一准备并上传一次。应用分别处理服务端判断、采集进度和请求错误：

| Result | 含义 | 应用处理 |
| --- | --- | --- |
| `status=ok`, `alive=true` | 本轮活体验证通过。 | 进入应用的下一步流程。 |
| `status=ok`, `alive=false` | 本轮活体验证未通过。 | 显示未通过结果，并提供应用安排的下一步操作。 |
| `status=retry` | 服务端未能得出结论，`alive` 和 `score` 为 null。 | 提示重新采集。 |
| Network / service error | 请求失败或未收到结果。 | 显示连接或服务提示，允许时重新提交同一轮请求。 |
| Capture interrupted | 本地采集在形成完整请求前中断。 | 重新调整位置，再开始一轮。 |

收到 `status=ok` 后，通过 `alive` 读取判断，通过 `score` 读取活体分数。根据返回的判断推进核验流程。

连接或响应错误允许重试时，演示保留原请求和 capture ID，用于查询或重试本轮。开始新一轮采集时，会创建新的 capture ID。取消操作会停止本地采集或等待，但服务端已经接受的请求仍可能完成。

### 接入 Plus 流程 {#integrate-a-plus-flow}

接入时可以按下面的分工组织：

| Component | 职责 |
| --- | --- |
| Mobile capture | 相机权限、进入前的数据说明、取景引导、帧连续性和时间戳；炫光还需要协调屏幕与相机。 |
| Local InspireFace | 跟踪人脸并提供眼部关键点，用于准备采集序列。 |
| Service request | 按要求提交完整采集、帧信息和鉴权数据，重试时保留同一个请求标识。 |
| Result handling | 区分通过、未通过、重新采集和请求失败，再衔接应用的后续步骤。 |

演示在本轮期间将采集图像保存在内存中。应用入口说明上传内容和保存规则，生产服务凭据通过业务后端管理。

PLUS 在移动端采集后发起在线请求。本地 SDK 选择适合设备的人脸跟踪与关键点处理后端，再按 [InspireFacePlus 服务文档](https://api.inspirehub.cc/docs)提交序列并读取结果。如需商用版本使用权，可向 [contact@insightface.ai](mailto:contact@insightface.ai) 说明平台、摄像头配置和使用流程。
