# API 实用示例 {#api-recipes}

本页介绍对齐人脸图像、转换显示分数、查询运行库和检查资源释放。运行前，先按[语言接入指南](../using-with/c-cpp.md)初始化 Session 并准备输入图像。Native、Python 和 [HarmonyOS](../using-with/harmonyos.md) 示例使用 1.2.4，Android 示例使用 Java SDK 1.2.0。

## 获取对齐后的人脸图像 {#get-an-aligned-face-image}

人脸对齐根据检测到的关键点，将眼睛等位置调整到识别模型要求的布局。可以保存对齐图，检查识别模型的输入，也可以将它交给接受已对齐图像的后续步骤。

普通识别直接调用 `face_feature_extract` / `FaceFeatureExtract` 即可，接口内部包含对齐操作。

::: tabs #api-language

@tab C API

调用前用 `HFCreateFaceFeature` 分配 `output`，用完后通过 `HFReleaseFaceFeature` 释放。原始 stream 和 token 在调用期间需要保持有效。

```c
#include <inspireface.h>
#include <stddef.h>

// session has recognition enabled; token belongs to source.
// output was allocated by HFCreateFaceFeature and remains caller-owned.
HResult extract_aligned(HFSession session, HFImageStream source,
                        HFFaceBasicToken token, HFFaceFeature output) {
    HFImageBitmap crop = NULL;
    HFImageStream aligned = NULL;
    HResult status = HFFaceGetFaceAlignmentImage(session, source, token, &crop);
    if (status != HSUCCEED) return status;
    status = HFCreateImageStreamFromImageBitmap(crop, HF_CAMERA_ROTATION_0, &aligned);
    if (status == HSUCCEED) {
        status = HFFaceFeatureExtractWithAlignmentImage(session, aligned, output);
    }
    if (aligned != NULL) HFReleaseImageStream(aligned);
    HFReleaseImageBitmap(crop);
    return status;
}
```

如果只想保存对齐图，调用 `HFFaceGetFaceAlignmentImage`，再用 `HFImageBitmapWriteToFile` 写入文件，最后释放 bitmap。两次调用都要检查返回值。

@tab C++

```cpp
#include <inspireface/inspireface.hpp>

int32_t extract_aligned(inspire::Session& session,
                        inspirecv::FrameProcess& frame,
                        inspire::FaceTrackWrap& face,
                        inspire::FaceEmbedding& embedding) {
    inspirecv::Image aligned;
    session.GetFaceAlignmentImage(frame, face, aligned);
    if (aligned.Empty()) return HERR_SESS_REC_EXTRACT_FAILURE;
    // aligned can also be inspected or saved with aligned.Write(...).
    return session.FaceFeatureExtractWithAlignmentImage(aligned, embedding);
}
```

图像和特征各自持有数据。`GetFaceAlignmentImage` 返回 `void`，因此继续提取前需要检查输出图像是否为空。

@tab Android

```java
// session, stream and faces come from the same detection call.
static android.graphics.Bitmap alignedFace(
        com.insightface.sdk.inspireface.base.Session session,
        com.insightface.sdk.inspireface.base.ImageStream stream,
        com.insightface.sdk.inspireface.base.MultipleFaceData faces) {
    if (faces == null || faces.detectedNum != 1) {
        throw new IllegalArgumentException("Expected exactly one face");
    }
    android.graphics.Bitmap aligned = InspireFace.GetFaceAlignmentImage(
            session, stream, faces.tokens[0]);
    if (aligned == null) throw new IllegalStateException("Alignment failed");
    return aligned;
}
```

导入 `com.insightface.sdk.inspireface.InspireFace` 后即可使用。应用可以显示或保存返回的 bitmap，处理完成后释放原始 `ImageStream`。识别时调用 `ExtractFaceFeature(session, stream, token)`，由接口完成对齐和特征提取。

@tab HarmonyOS

调用方准备已启用识别的 `Session`、原始 `ImageStream` 和对应的检测结果，并在调用期间保持它们有效。将结果 `faces` 中的一张人脸传给下面的函数；函数只释放自己创建的对齐图和 stream。

```ts
import { ImageStream, Session, TrackedFace } from '@hyperinspire/inspireface';

function extractAligned(session: Session, image: ImageStream,
                        face: TrackedFace): Float32Array {
  const crop = session.getFaceAlignmentImage(image, face);
  try {
    const aligned = ImageStream.fromBitmap(crop);
    try {
      return session.extractFeatureFromAlignmentImage(aligned);
    } finally {
      aligned.close();
    }
  } finally {
    crop.close();
  }
}
```

关闭 bitmap 前，可以用 `crop.getData()` 读取像素、尺寸和通道数。对齐图使用 BGR 像素，显示或编码时需转换成应用图像接口要求的格式。标准 HAR 构建使用内存图像操作。普通识别直接调用 `session.extractFeature(image, face)`，由接口一次完成对齐和提取。

@tab Python

识别时调用 `session.face_feature_extract(image, face)`，由接口完成对齐和特征提取。绘制调试图时，可以用 `get_face_five_key_points` 读取五点坐标。需要保存对齐图本身时，可使用上方的 C、C++ 或 Android 示例。

:::

将对齐和提取拆开处理时，把 SDK 生成的对齐图传给提取接口，并保持其对齐方式、尺寸和像素格式。

## 转换用于显示的相似度 {#convert-a-similarity-score-for-display}

识别和 FeatureHub 检索使用原始 cosine similarity 判断是否通过阈值。Similarity converter 按配置的曲线将它转换为显示分数。匹配判断和日志使用原始 cosine 分数。

`outputMin` 和 `outputMax` 决定转换后的分数范围，默认约为 0.01–1.0。显示前先读取这两个配置，再决定如何换算。

::: tabs #api-language

@tab C API

```c
#include <inspireface.h>
#include <stdio.h>

HResult print_display_score(float cosine) {
    HFloat display = 0.0f;
    HFSimilarityConverterConfig config = {0};
    HResult status = HFGetCosineSimilarityConverter(&config);
    if (status != HSUCCEED) return status;
    status = HFCosineSimilarityConvertToPercentage(cosine, &display);
    if (status == HSUCCEED) {
        printf("cosine=%.4f display=%.4f range=[%.2f, %.2f]\n",
               cosine, display, config.outputMin, config.outputMax);
    }
    return status;
}
```

@tab C++

```cpp
#include <inspireface/inspireface.hpp>
#include <iostream>

void print_display_score(float cosine) {
    auto& converter = inspire::SimilarityConverter::getInstance();
    auto config = converter.getConfig();
    std::cout << "cosine=" << cosine
              << " display=" << converter.convert(cosine)
              << " range=[" << config.outputMin << ", " << config.outputMax << "]\n";
}
```

@tab Android

```java
static void printDisplayScore(float cosine) {
    com.insightface.sdk.inspireface.base.SimilarityConverterConfig config =
            InspireFace.GetCosineSimilarityConverter();
    if (config == null) throw new IllegalStateException("Converter unavailable");
    float display = InspireFace.CosineSimilarityConvertToPercentage(cosine);
    android.util.Log.i("FaceScore", "cosine=" + cosine + " display=" + display
            + " range=[" + config.outputMin + ", " + config.outputMax + "]");
}
```

@tab HarmonyOS

```ts
import { InspireFace } from '@hyperinspire/inspireface';

// cosine is the raw result of InspireFace.compareFeatures(first, second).
function printDisplayScore(cosine: number): void {
  const config = InspireFace.getSimilarityConverter();
  const display = InspireFace.similarityToPercentage(cosine);
  console.info(`cosine=${cosine} display=${display} ` +
    `range=[${config.outputMin}, ${config.outputMax}]`);
}
```

需要在应用初始化时调整曲线，可将 `SimilarityConverterConfig` 传给 `InspireFace.updateSimilarityConverter(config)`。

@tab Python

```python
import inspireface as isf

# cosine is the raw result of isf.feature_comparison(feature_a, feature_b).
def print_display_score(cosine):
    config = isf.get_similarity_converter_config()
    display = isf.cosine_similarity_convert_to_percentage(cosine)
    print("cosine", cosine, "display", display,
          "range", (config["outputMin"], config["outputMax"]))
```

:::

可以通过 `HFUpdateCosineSimilarityConverter`、C++ `SimilarityConverter::updateConfig`、Java `UpdateCosineSimilarityConverter`、ArkTS `InspireFace.updateSimilarityConverter` 或 Python `set_similarity_converter_config` 修改曲线。配置字段为 `threshold`、`middleScore`、`steepness`、`outputMin` 和 `outputMax`。通常在应用初始化时设置一次。识别阈值另外用具有代表性的同人、非同人图片对来评估。

## 检查运行库与错误信息 {#inspect-the-loaded-runtime-and-errors}

排查部署问题时，记录实际加载的库版本、模型包和已启用后端。Native 和 Python 的诊断查询可以在加载模型前调用。组件状态中，`known` 表示版本已读取，`unknown` 表示版本无法读取，`disabled` 表示后端未启用。

::: tabs #api-language

@tab C API

```c
#include <inspireface.h>
#include <stdio.h>
#include <stdlib.h>

int print_diagnostics(void) {
    HInt32 required = 0;
    HResult status = HFQueryInspireFaceDiagnosticInformation(NULL, 0, &required);
    if (status != HSUCCEED || required <= 0) return 1;
    char *text = (char *)malloc((size_t)required);
    if (text == NULL) return 1;
    status = HFQueryInspireFaceDiagnosticInformation(text, required, &required);
    if (status == HSUCCEED) puts(text);
    free(text);
    return status == HSUCCEED ? 0 : 1;
}

void print_sdk_error(HResult failure) {
    char message[256];
    HInt32 required = 0;
    HResult status = HFGetErrorMessage(failure, message, sizeof(message), &required);
    if (status == HSUCCEED) {
        fprintf(stderr, "InspireFace %ld: %s\n", (long)failure, message);
    } else {
        fprintf(stderr, "InspireFace %ld (message needs %d bytes)\n",
                (long)failure, required);
    }
}
```

第一次查询得到所需容量，包含字符串结尾的空字符；第二次查询传入该容量。`HFGetErrorMessage` 同样会报告所需长度，示例在消息缓冲区不足时仍记录原始错误码。

@tab C++

```cpp
#include <inspireface/component_version.h>
#include <iostream>

void print_diagnostics() {
    std::cout << inspire::GetDiagnosticInfo() << '\n';
    auto cv = inspire::GetComponentVersion(inspire::ComponentType::INSPIRECV);
    if (cv.IsVersionKnown()) {
        std::cout << "InspireCV " << cv.GetVersionString() << '\n';
    }
}
```

C++ 操作返回错误码时，也可以包含 `<inspireface.h>`，使用上面的 `HFGetErrorMessage` 辅助函数读取错误文字。

@tab Android

```java
static void printDiagnostics() {
    com.insightface.sdk.inspireface.base.InspireFaceVersion version =
            InspireFace.QueryInspireFaceVersion();
    if (version == null) throw new IllegalStateException("Version query failed");
    android.util.Log.i("FaceSDK", version.major + "." + version.minor + "."
            + version.patch + " " + version.information);
    InspireFace.SetLogLevel(InspireFace.LOG_INFO);
}
```

Java SDK 1.2.0 提供版本信息和日志设置。每次调用都检查 `null` 或 boolean 结果，并在应用日志中记录具体操作和输入格式。

@tab HarmonyOS

```ts
import { FaceTrackResult, ImageStream, InspireFace, LogLevel, Session }
  from '@hyperinspire/inspireface';

function printDiagnostics(): void {
  const version = InspireFace.getVersion();
  console.info(`${version.major}.${version.minor}.${version.patch} ` +
    `C API level=${InspireFace.getCapiLevel()}`);
  console.info(InspireFace.getDiagnosticInformation());
  console.info(InspireFace.getComponentVersions());
  InspireFace.setLogLevel(LogLevel.INFO);
}

// The caller owns session/image and releases the returned face result.
function detectWithContext(session: Session, image: ImageStream): FaceTrackResult {
  try {
    return session.track(image);
  } catch (error) {
    const failure = error as Error;
    console.error(`track failed: ${failure.message}`);
    throw error;
  }
}
```

ArkTS 调用失败时会抛出异常。保留异常消息，其中包含操作名称和 SDK 错误文字。已有数字错误码时，可以用 `InspireFace.getErrorMessage(code)` 查询说明。调用成功且 `detectedNum === 0` 表示没有检测到人脸。

@tab Python

```python
import inspireface as isf

print(isf.version(), "C API level", isf.c_api_level())
print(isf.diagnostic_info())
for name, component in isf.component_versions().items():
    print(name, component["state"], component["version"])

# At the application boundary, preserve the original exception.
def detect_with_context(session, image):
    try:
        return session.face_detection(image)
    except isf.InspireFaceError as error:
        print(error.error_code, error.error_name, str(error))
        raise
```

这些诊断方法需要配套的 1.2.4 wrapper 和 Native 库。处理异常时记录错误，并与检测结果分开处理。空列表表示检测成功，但没有符合条件的人脸。

:::

## 检查资源是否释放 {#check-resource-lifetime}

开发时可以反复创建、使用和关闭一组对象，对比操作前后的资源数量。对比时先暂停其他工作线程，避免把它们仍在使用的 Session 算进结果。

::: tabs #api-language

@tab C API

```c
#include <inspireface.h>
#include <stdio.h>

HResult print_open_handles(void) {
    HInt32 sessions = 0, streams = 0;
    HResult status = HFDeBugGetUnreleasedSessionsCount(&sessions);
    if (status != HSUCCEED) return status;
    status = HFDeBugGetUnreleasedStreamsCount(&streams);
    if (status != HSUCCEED) return status;
    printf("open sessions=%d streams=%d\n", sessions, streams);
    return HFDeBugShowResourceStatistics();
}
```

@tab C++

C++ 的 `Session`、`Image` 和 capture selector 在离开作用域时释放自己持有的资源。应用同时使用 C API 时，可以用上面的诊断函数统计仍在使用的 C Session 和 stream handle。Native C++ 对象和 GPU 分配可通过内存分析工具检查。

@tab Android

每个 `CreateSession` 对应一个 `ReleaseSession`，每个 stream 创建操作对应一个 `ReleaseImageStream`，一般放在 `finally` 中释放。较新的 `FaceCapture` 和 `FaceDetectionSnapshot` 支持 try-with-resources，使用时配套更新 JNI 库。

@tab HarmonyOS

调用前先加载模型。输入为紧凑排列的 RGBA 数据；每次调用创建并释放一个 Session、image stream 和检测结果。

```ts
import { DetectMode, ImageFormat, InspireFace } from '@hyperinspire/inspireface';

function checkResourceLifetime(rgba: Uint8Array, width: number, height: number): void {
  const before = InspireFace.getDebugResourceCounts();
  const session = InspireFace.createSession({ detectMode: DetectMode.ALWAYS_DETECT });
  try {
    const image = InspireFace.createImageStream(rgba, width, height, ImageFormat.RGBA);
    try {
      const faces = session.track(image);
      try {
        console.info(`faces=${faces.detectedNum}`);
      } finally {
        session.releaseFaceResult(faces);
      }
    } finally {
      image.close();
    }
  } finally {
    session.close();
    const after = InspireFace.getDebugResourceCounts();
    console.info(`sessions=${before.sessions}->${after.sessions} ` +
      `streams=${before.streams}->${after.streams}`);
    InspireFace.showDebugResourceStatistics();
  }
}
```

计数器统计 Session 和 stream。自己创建的 `ImageBitmap`、`FaceCaptureSession` 也要调用 `close()`，每次 `session.track()` 返回的结果都要释放。Capture session 需在它所依赖的 Session 关闭前结束使用。

@tab Python

```python
import inspireface as isf

# Call before and after a bounded workload during development.
isf.show_system_resource_statistics()
```

Session、stream、snapshot 和 capture 优先使用上下文管理器。长期存在的应用对象可以在结束使用时调用 `close()` 或 `release()`。

:::

计数器报告仍在使用的 SDK handle。进程内存需单独测量，其中也包含运行中的工作线程所保留的模型内存和分配器缓存。逐帧耗时的测量方法见[性能测试](./benchmark-remark(updating).md)。
