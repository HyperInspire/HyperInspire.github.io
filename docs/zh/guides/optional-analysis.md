# 人脸分析 {#face-analysis}

Quality、Mask、Attributes 和 Expression 都是可选模型。按需启用后，对**同一张图像**的检测结果执行 Pipeline。Pose 直接从检测结果读取。

## 选择需要的输出 {#choose-the-outputs}

| Output | Session option | 使用说明 |
| --- | --- | --- |
| Quality | `HF_ENABLE_QUALITY` | 比较候选人脸图像的质量，抓拍时还需结合大小、姿态和稳定性。 |
| Mask | `HF_ENABLE_MASK_DETECT` | 获取每张人脸佩戴口罩的置信度。 |
| Attributes | `HF_ENABLE_FACE_ATTRIBUTE` | 获取 `ageBracket`、`gender` 和 `race` 类别索引。 |
| Expression | `HF_ENABLE_FACE_EMOTION` | 获取 `emotion` 类别索引。 |
| Pose | `HF_ENABLE_FACE_POSE` | 从检测结果读取 roll、yaw 和 pitch。 |
| RGB liveness | `HF_ENABLE_LIVENESS` | 分数使用和阈值评估见[活体检测](./liveness-detection.md#rgb-anti-spoofing)。 |
| Eye state / actions | `HF_ENABLE_INTERACTION` | 连续帧处理与动作流程见[动作示例](./liveness-detection.md#facial-actions)。 |

用质量分数比较图像，用属性和表情索引查找对应标签。Expression 描述输入图像中的面部表情。标签顺序需要与模型和封装版本匹配。

::: tip 先跑通一项输出
可以先只启用 Quality，用几张清晰和模糊图片检查结果，再按应用需要添加其他模型。全部启用会增加初始化和每帧处理的开销。
:::

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/face_analysis.webp" alt="口罩、表情、质量、姿态与特征向量输出的概念图" width="1536" height="1024" loading="lazy" />
<figcaption>同一张脸可以组合需要的分析结果。Quality 返回分数，属性和表情返回类别索引；识别特征通过特征提取接口获得。</figcaption>
</figure>

## 读取分析结果 {#read-analysis-results}

在下方选择 API。这些辅助函数创建会话并处理**一张静态图片**，可以接在平台基础检测示例之后使用。先启动 SDK 并准备输入，具体步骤见 [C](../using-with/c-cpp.md)、[C++](../using-with/cpp.md)、[Android](../using-with/android.md)、[HarmonyOS](../using-with/harmonyos.md) 和 [Python](../using-with/python.md)。接入视频时，把会话创建移到帧循环之外。

::: tabs #api-language

@tab C API

传入有效的 `HFImageStream`。成功时返回 `1`，其中包含无人脸的正常结果；SDK 调用或结果数量检查失败时返回 `0`。函数释放自己创建的会话，图像流仍由调用方管理。

<details>
<summary>C API — 完整分析示例</summary>

```c
#include <stdio.h>
#include <inspireface.h>

/* Runtime is launched; the caller owns stream. Returns 1 on success. */
int analyze_frame(HFImageStream stream) {
    const HInt32 pipeline = HF_ENABLE_QUALITY | HF_ENABLE_MASK_DETECT |
                           HF_ENABLE_FACE_ATTRIBUTE | HF_ENABLE_FACE_EMOTION;
    HFSession session = NULL;
    HFMultipleFaceData faces = {0};
    HFFaceQualityConfidence quality = {0};
    HFFaceMaskConfidence masks = {0};
    HFFaceAttributeResult attributes = {0};
    HFFaceEmotionResult expressions = {0};
    int ok = 0;
    if (HFCreateInspireFaceSessionOptional(
            pipeline | HF_ENABLE_FACE_POSE, HF_DETECT_MODE_ALWAYS_DETECT,
            10, 320, -1, &session) != HSUCCEED) return 0;
    if (HFExecuteFaceTrack(session, stream, &faces) != HSUCCEED) goto done;
    if (faces.detectedNum == 0) { ok = 1; goto done; }
    if (HFMultipleFacePipelineProcessOptional(session, stream, &faces, pipeline)
            != HSUCCEED) goto done;
    if (HFGetFaceQualityConfidence(session, &quality) != HSUCCEED ||
        HFGetFaceMaskConfidence(session, &masks) != HSUCCEED ||
        HFGetFaceAttributeResult(session, &attributes) != HSUCCEED ||
        HFGetFaceEmotionResult(session, &expressions) != HSUCCEED) goto done;
    if (quality.num != faces.detectedNum || masks.num != faces.detectedNum ||
        attributes.num != faces.detectedNum || expressions.num != faces.detectedNum)
        goto done;
    for (HInt32 i = 0; i < faces.detectedNum; ++i) {
        printf("face=%d quality=%.3f mask=%.3f age=%d gender=%d race=%d emotion=%d\n",
               (int)i, quality.confidence[i], masks.confidence[i],
               (int)attributes.ageBracket[i], (int)attributes.gender[i],
               (int)attributes.race[i], (int)expressions.emotion[i]);
        printf("roll=%.2f yaw=%.2f pitch=%.2f\n",
               faces.angles.roll[i], faces.angles.yaw[i], faces.angles.pitch[i]);
    }
    ok = 1;
done:
    HFReleaseInspireFaceSession(session);
    return ok;
}
```

</details>

@tab C++

传入 `FrameProcess`，并保证原始像素在处理期间有效。各结果向量与 `faces` 顺序一致，函数返回时自动释放会话。

<details>
<summary>C++ — 完整分析示例</summary>

```cpp
#include <iostream>
#include <vector>
#include <inspireface/inspireface.hpp>

// Runtime is launched; frame borrows the caller's image pixels.
bool AnalyzeFrame(inspirecv::FrameProcess& frame) {
    inspire::CustomPipelineParameter options;
    options.enable_face_quality = true;
    options.enable_mask_detect = true;
    options.enable_face_attribute = true;
    options.enable_face_emotion = true;
    options.enable_face_pose = true;
    auto session = inspire::Session::Create(
        inspire::DETECT_MODE_ALWAYS_DETECT, 10, options, 320);
    std::vector<inspire::FaceTrackWrap> faces;
    if (session.FaceDetectAndTrack(frame, faces) != 0) return false;
    if (faces.empty()) return true;
    if (session.MultipleFacePipelineProcess(frame, options, faces) != 0) return false;
    auto quality = session.GetFaceQualityConfidence();
    auto masks = session.GetFaceMaskConfidence();
    auto attributes = session.GetFaceAttributeResult();
    auto expressions = session.GetFaceEmotionResult();
    if (quality.size() != faces.size() || masks.size() != faces.size() ||
        attributes.size() != faces.size() || expressions.size() != faces.size())
        return false;
    for (size_t i = 0; i < faces.size(); ++i) {
        const auto& pose = faces[i].face3DAngle;
        std::cout << "quality=" << quality[i] << " mask=" << masks[i]
                  << " age=" << attributes[i].ageBracket
                  << " gender=" << attributes[i].gender
                  << " race=" << attributes[i].race
                  << " emotion=" << expressions[i].emotion
                  << " roll=" << pose.roll << " yaw=" << pose.yaw
                  << " pitch=" << pose.pitch << '\n';
    }
    return true;  // Session releases its resources when leaving scope.
}
```

</details>

@tab Android

此示例使用 **1.2.0 Java 包**读取 Quality、Mask 和 Attributes。搭配该包对应的原生库时，启用 Quality 也会加载姿态模型。姿态从 `faces.angles[0]` 读取，这个版本提供第一张脸的有效姿态结果。使用示例时，保持 Java 包与原生库配套。

<details>
<summary>Android — 完整分析示例</summary>

```java
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.*;

public final class AnalysisExample {
    // GlobalLaunch has succeeded; the caller keeps stream alive.
    public static void analyze(ImageStream stream) {
        CustomParameter options = InspireFace.CreateCustomParameter()
                .enableFaceQuality(true)
                .enableMaskDetect(true)
                .enableFaceAttribute(true);
        Session session = InspireFace.CreateSession(
                options, InspireFace.DETECT_MODE_ALWAYS_DETECT, 10, 320, -1);
        if (session == null || session.handle == 0L)
            throw new IllegalStateException("Cannot create session");
        try {
            MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
            if (faces == null) throw new IllegalStateException("Detection failed");
            if (faces.detectedNum == 0) return;
            if (!InspireFace.MultipleFacePipelineProcess(session, stream, faces, options))
                throw new IllegalStateException("Pipeline failed");
            FaceQualityConfidence quality = InspireFace.GetFaceQualityConfidence(session);
            FaceMaskConfidence masks = InspireFace.GetFaceMaskConfidence(session);
            FaceAttributeResult attributes = InspireFace.GetFaceAttributeResult(session);
            if (quality == null || masks == null || attributes == null ||
                    quality.num != faces.detectedNum || masks.num != faces.detectedNum ||
                    attributes.num != faces.detectedNum)
                throw new IllegalStateException("Incomplete pipeline result");
            for (int i = 0; i < faces.detectedNum; ++i) {
                System.out.println("quality=" + quality.confidence[i]
                        + " mask=" + masks.confidence[i]
                        + " age=" + attributes.ageBracket[i]
                        + " gender=" + attributes.gender[i]
                        + " race=" + attributes.race[i]);
                // The 1.2.0 JNI has a multi-face pose-copy bug; only read face 0.
                if (i == 0 && faces.angles != null && faces.angles.length > 0 && faces.angles[0] != null) {
                    FaceEulerAngle pose = faces.angles[i];
                    System.out.println("roll=" + pose.roll + " yaw=" + pose.yaw
                            + " pitch=" + pose.pitch);
                }
            }
        } finally {
            InspireFace.ReleaseSession(session);
        }
    }
}
```

</details>

@tab HarmonyOS

先启动 SDK，再传入有效的 `ImageStream`。函数创建并关闭自己的会话，图像流由调用方在使用完毕后关闭。管线数组与 `faces.faces` 的顺序一致，姿态角直接从每个人脸结果读取。

<details>
<summary>HarmonyOS — 完整分析示例</summary>

```ts
import { DetectMode, Feature, ImageStream, Session }
  from '@hyperinspire/inspireface';

function analyzeFrame(stream: ImageStream): void {
  const pipeline = Feature.QUALITY | Feature.MASK_DETECT |
    Feature.FACE_ATTRIBUTE | Feature.FACE_EMOTION;
  const session = new Session({
    featureMask: pipeline | Feature.FACE_POSE,
    detectMode: DetectMode.ALWAYS_DETECT,
    maxFaces: 10,
    detectPixelLevel: 320
  });
  try {
    const faces = session.track(stream);
    try {
      if (faces.detectedNum === 0) return;
      const result = session.processPipeline(stream, faces, pipeline);
      for (let i = 0; i < faces.detectedNum; ++i) {
        const face = faces.faces[i];
        console.info(`quality=${result.qualityConfidence[i]} mask=${result.maskConfidence[i]}`);
        console.info(`age=${result.ageBracket[i]} gender=${result.gender[i]} race=${result.race[i]}`);
        console.info(`emotion=${result.emotion[i]}`);
        console.info(`roll=${face.roll} yaw=${face.yaw} pitch=${face.pitch}`);
      }
    } finally {
      session.releaseFaceResult(faces);
    }
  } finally {
    session.close();
  }
}
```

</details>

@tab Python

上下文管理器和 `auto_launch=False` 需要 **1.2.4 源码封装及匹配的原生库**。传入 BGR `uint8` 数组。原生调用失败时抛出异常，正常处理但无人脸时返回空列表。

<details>
<summary>Python — 完整分析示例</summary>

```python
import inspireface as isf


def analyze_frame(image):
    # launch(resource_path=...) has succeeded; image is a BGR uint8 array.
    pipeline = (isf.HF_ENABLE_QUALITY | isf.HF_ENABLE_MASK_DETECT |
                isf.HF_ENABLE_FACE_ATTRIBUTE | isf.HF_ENABLE_FACE_EMOTION)
    with isf.InspireFaceSession(
        pipeline | isf.HF_ENABLE_FACE_POSE,
        isf.HF_DETECT_MODE_ALWAYS_DETECT,
        max_detect_num=10, detect_pixel_level=320, auto_launch=False,
    ) as session:
        faces = session.face_detection(image)
        results = session.face_pipeline(image, faces, pipeline) if faces else []
        if len(results) != len(faces):
            raise RuntimeError("Incomplete pipeline result")
        for face, result in zip(faces, results):
            print("quality=", result.quality_confidence,
                  "mask=", result.mask_confidence,
                  "age=", result.age_bracket,
                  "gender=", result.gender,
                  "race=", result.race,
                  "emotion=", result.emotion)
            print("roll=", face.roll, "yaw=", face.yaw, "pitch=", face.pitch)
        return results
```

</details>

:::

## 如何使用这些结果 {#interpret-the-outputs}

| Output | 含义与检查方式 |
| --- | --- |
| Quality | 分数越高，越倾向于质量可用的人脸。根据实际输入评估阈值，大小、清晰度、亮度和姿态仍需分别检查。 |
| Mask | 表示佩戴口罩的置信度。根据目标摄像头评估阈值，再将分数与阈值比较。 |
| Attributes | 返回整数类别索引。先检查索引范围，再映射为标签。 |
| Expression | 索引顺序为 `Neutral`、`Happy`、`Sad`、`Surprise`、`Fear`、`Disgust`、`Anger`。 |
| Pose | 返回 roll、yaw 和 pitch 角度。C/C++/Python 需要先启用 `HF_ENABLE_FACE_POSE` 或对应的 C++ 选项，再读取角度。HarmonyOS 使用 `Feature.FACE_POSE`。 |

完整的属性标签数组见 [Python 分析说明](../using-with/python.md#optional-analysis)。Pipeline 完成前保持输入像素不变，完成后再绘制或复用缓冲区。C getter 返回会话内部数组，需要跨越下一次分析调用保留时先复制；C++ 向量和 Python 结果使用独立存储。

升级 Android 时，一起更新 Java 包及其配套的 JNI/原生库。各接口支持的分析输出见 [API 功能索引](./api-coverage.md)。

## 用于抓拍流程 {#use-analysis-in-a-capture-flow}

录入时先明确选择一张人脸，检查大小和位置，再检查质量与姿态。如果这些条件需要持续满足一段时间，并从视频中选出一帧，可以使用[人脸抓拍](./face-capture.md)。提取特征前，先保留或复制对应图像。

预览界面可以只复制需要的分数和几何信息，再释放帧资源。绘制时还需应用预览的裁剪、缩放和镜像变换，详见[图像坐标](./image-inputs.md#rotation-and-display-coordinates)。
