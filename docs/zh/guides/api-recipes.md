# API 实用示例 {#api-recipes}

本页介绍对齐人脸图像、转换显示分数、查询运行库和检查资源释放。运行前，先按[语言接入指南](../using-with/c-cpp.md)初始化 Session 并准备输入图像。Native、[Java JVM](../using-with/java.md)、[Objective-C / Swift](../using-with/apple.md)、Python 和 [HarmonyOS](../using-with/harmonyos.md) 示例使用 1.2.4，Android 示例使用 Android SDK 1.2.4.post1。

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

@tab Objective-C

先在会话中启用识别。传入对应原图的有效 token，以及已创建的 `IFFeatureBuffer`，两者均由调用方管理。函数关闭自己的裁剪图和临时图像流，通过 `BOOL`/`NSError` 返回错误。需要保存裁剪图时，在关闭前调用 `[crop writeToFile:path error:&error]`。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL ExtractAligned(IFSession *session, IFImageStream *source,
                           HFFaceBasicToken token, IFFeatureBuffer *output,
                           NSError **error) {
    IFImageBitmap *crop = [session alignmentBitmapFromStream:source token:token error:error];
    if (crop == nil) return NO;
    IFImageStream *aligned = nil;
    @try {
        aligned = [crop snapshotStreamWithRotation:HF_CAMERA_ROTATION_0 error:error];
        if (aligned == nil) return NO;
        return [session extractAlignedFeatureFromStream:aligned
            into:output.borrowedFeature error:error];
    } @finally {
        if (aligned != nil) [aligned closeWithError:NULL];
        [crop closeWithError:NULL];
    }
}
```

@tab Swift

会话启用 `.recognition`，传入当前原图的 token 和尚未关闭的 `FaceFeatureBuffer`。`snapshotStream` 会明确复制裁剪图的像素。即使提取失败，函数也会关闭临时资源；输出特征缓冲区由调用方在使用结束后关闭。保存裁剪图可在关闭前调用 `try crop.write(toFile: path)`。

```swift
import InspireFaceSwift

func extractAligned(session: FaceSession, source: ImageStream,
                    token: FaceToken, into output: FaceFeatureBuffer) throws {
    let crop = try session.alignmentBitmap(from: source, token: token)
    defer { try? crop.close() }
    let aligned = try crop.snapshotStream(rotation: .degrees0)
    defer { try? aligned.close() }
    try session.extractAlignedFeature(from: aligned, into: output.borrowedFeature)
}
```

@tab Java

使用下面 [Java JVM SDK](../using-with/java.md) 的 import，将方法放入应用类中。`session` 需开启识别，`output` 需通过 `HFCreateFaceFeature` 分配，token 应来自这份输入图像。方法会释放临时裁剪图和 stream，`output` 由调用方使用后释放。只想保存裁剪图时，在释放前调用 `HFImageBitmapWriteToFile(crop[0], path)`。

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;
```

```java
static void extractAligned(long session, long source, HFFaceBasicToken token,
                           HFFaceFeature output) {
    long[] crop = new long[1], aligned = new long[1];
    check(HFFaceGetFaceAlignmentImage(session, source, token, crop));
    try {
        check(HFCreateImageStreamFromImageBitmap(crop[0], HF_CAMERA_ROTATION_0, aligned));
        check(HFFaceFeatureExtractWithAlignmentImage(session, aligned[0], output));
    } finally {
        if (aligned[0] != 0) HFReleaseImageStream(aligned[0]);
        HFReleaseImageBitmap(crop[0]);
    }
}
```

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

需要从这张 SDK 生成的对齐图继续提取特征时，可调用 AAR 内的 `jni.Native` 接口。会话需启用识别，裁剪图的尺寸和像素保持不变。下方方法返回复制后的 `FaceFeature`，关闭临时 stream 与特征存储；传入的 bitmap 由调用方管理。

<details>
<summary>从对齐后的 bitmap 提取特征 — 完整方法</summary>

```java
import com.insightface.sdk.inspireface.base.FaceFeature;
import com.insightface.sdk.inspireface.base.ImageStream;
import com.insightface.sdk.inspireface.base.Session;
import com.insightface.sdk.inspireface.jni.Native;
import com.insightface.sdk.inspireface.jni.NativeTypes.HFFaceFeature;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;
```

```java
static FaceFeature extractAligned(Session session, android.graphics.Bitmap crop) {
    try (ImageStream aligned = InspireFace.CreateImageStreamFromBitmap(
            crop, InspireFace.CAMERA_ROTATION_0)) {
        if (aligned == null) throw new IllegalStateException("Cannot open crop");
        HFFaceFeature output = new HFFaceFeature();
        check(Native.HFCreateFaceFeature(output));
        try {
            check(Native.HFFaceFeatureExtractWithAlignmentImage(
                    session.handle, aligned.handle, output));
            FaceFeature result = new FaceFeature();
            result.data = new float[output.size];
            output.data.order(java.nio.ByteOrder.nativeOrder())
                    .asFloatBuffer().get(result.data);
            return result;
        } finally {
            output.close();
        }
    }
}
```

</details>

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

识别时调用 `session.face_feature_extract(image, face)`，由接口完成对齐和特征提取。绘制调试图时，可以用 `get_face_five_key_points` 读取五点坐标。需要保存对齐图本身时，可使用上方的 C、C++、Java、Objective-C、Swift 或 Android 示例。

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

@tab Objective-C

传入比对得到的原始余弦分数。读取显示值前检查 `BOOL`/`NSError`。应用初始化阶段可用 `setSimilarityConverter:error:` 设置共享转换曲线。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL PrintDisplayScore(float cosine, NSError **error) {
    HFSimilarityConverterConfig config = {0};
    float display = 0;
    if (![IFFeatureBuffer getSimilarityConverter:&config error:error] ||
        ![IFFeatureBuffer convertSimilarity:cosine percentage:&display error:error]) return NO;
    NSLog(@"cosine=%.4f display=%.4f range=[%.2f, %.2f]",
        cosine, display, config.outputMin, config.outputMax);
    return YES;
}
```

@tab Swift

函数失败时抛出错误。应用初始化阶段可用 `FaceFeatureBuffer.setSimilarityConverter(_:)` 修改共享曲线；匹配判断仍使用原始余弦分数。

```swift
import InspireFaceSwift

func printDisplayScore(cosine: Float) throws {
    var config = HFSimilarityConverterConfig()
    var display: Float = 0
    try FaceFeatureBuffer.getSimilarityConverter(&config)
    try FaceFeatureBuffer.convert(similarity: cosine, percentage: &display)
    print("cosine=\(cosine) display=\(display) range=[\(config.outputMin), \(config.outputMax)]")
}
```

@tab Java

传入原始余弦分数。需要调整共享转换曲线时，在工作线程启动前调用 `HFUpdateCosineSimilarityConverter`。

```java
static void printDisplayScore(float cosine) {
    HFSimilarityConverterConfig config = new HFSimilarityConverterConfig();
    check(HFGetCosineSimilarityConverter(config));
    float[] display = new float[1];
    check(HFCosineSimilarityConvertToPercentage(cosine, display));
    System.out.printf("cosine=%.4f display=%.4f range=[%.2f, %.2f]%n",
            cosine, display[0], config.outputMin, config.outputMax);
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

可以通过 `HFUpdateCosineSimilarityConverter`、C++ `SimilarityConverter::updateConfig`、Objective-C `setSimilarityConverter:error:`、Swift `FaceFeatureBuffer.setSimilarityConverter(_:)`、Java `UpdateCosineSimilarityConverter`、ArkTS `InspireFace.updateSimilarityConverter` 或 Python `set_similarity_converter_config` 修改曲线。配置字段为 `threshold`、`middleScore`、`steepness`、`outputMin` 和 `outputMax`。通常在应用初始化时设置一次。识别阈值另外用具有代表性的同人、非同人图片对来评估。

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

@tab Objective-C

模型启动前也能查询。先获取包含末尾空字符的所需容量。SDK 失败时，`NSError.domain` 为 `IFErrorDomain`，`code` 保留 C 接口的 `HResult`。记录这两个字段，并附上 `localizedDescription`，有说明文本时便于一起排查。每次调用都要检查 `BOOL` 或 `nil`。

```objc
#import <InspireFace/InspireFaceApple.h>
#include <stdlib.h>

static BOOL PrintDiagnostics(NSError **error) {
    HInt32 required = 0;
    if (![IFDiagnostics getDiagnosticInformation:NULL capacity:0
        requiredSize:&required error:error]) return NO;
    if (required <= 0) return IFCheck(HERR_INVALID_PARAM, error);
    char *buffer = calloc((size_t)required, 1);
    if (buffer == NULL) return IFCheck(HERR_INVALID_PARAM, error);
    BOOL ok = [IFDiagnostics getDiagnosticInformation:buffer capacity:required
        requiredSize:&required error:error];
    if (ok) NSLog(@"%s", buffer);
    free(buffer);
    return ok;
}

static void LogSDKError(NSError *error) {
    NSLog(@"%@ code=%ld: %@", error.domain, (long)error.code, error.localizedDescription);
}
// NSError *error = nil;
// if (!PrintDiagnostics(&error)) LogSDKError(error);
```

@tab Swift

Swift 方法通过抛出 `NSError` 传递同一套 SDK 错误。分配前先查询容量，在应用层记录 domain、数值 code 和说明。跟踪调用成功但结果为零张人脸时属于正常结果，不会因此抛出异常。

```swift
import InspireFaceSwift

func printDiagnostics() throws {
    var required: Int32 = 0
    try InspireFaceDiagnostics.getDiagnosticInformation(nil, capacity: 0, requiredSize: &required)
    guard required > 0 else {
        throw NSError(domain: IFErrorDomain, code: Int(HERR_INVALID_PARAM))
    }
    let buffer = UnsafeMutablePointer<CChar>.allocate(capacity: Int(required))
    defer { buffer.deallocate() }
    try InspireFaceDiagnostics.getDiagnosticInformation(buffer, capacity: required,
                                                        requiredSize: &required)
    print(String(cString: buffer))
}

func logSDKError(_ error: Error) {
    let failure = error as NSError
    print("\(failure.domain) code=\(failure.code): \(failure.localizedDescription)")
}
// do { try printDiagnostics() } catch { logSDKError(error) }
```

@tab Java

先查询所需字节数，再分配可写的 direct buffer。诊断文本使用 UTF-8，并包含末尾的 NUL。`check(status)` 会抛出带 SDK 错误说明的 `InspireFaceException`，可通过 `getCode()` 记录原始错误码。

```java
static void printRuntime() {
    HFInspireFaceVersion version = new HFInspireFaceVersion();
    check(HFQueryInspireFaceVersion(version));
    int[] apiLevel = new int[1];
    check(HFQueryCAPILevel(apiLevel));
    System.out.printf("SDK %d.%d.%d, C API level %d%n",
            version.major, version.minor, version.patch, apiLevel[0]);
    int[] required = new int[1];
    check(HFQueryInspireFaceDiagnosticInformation(null, 0, required));
    java.nio.ByteBuffer buffer = java.nio.ByteBuffer.allocateDirect(required[0]);
    check(HFQueryInspireFaceDiagnosticInformation(buffer, buffer.capacity(), required));
    byte[] text = new byte[required[0] - 1]; // Exclude the trailing NUL.
    buffer.get(text);
    System.out.println(new String(text, java.nio.charset.StandardCharsets.UTF_8));
}
```

@tab Android

```java
static void printDiagnostics() {
    com.insightface.sdk.inspireface.base.InspireFaceVersion version =
            InspireFace.QueryInspireFaceVersion();
    if (version == null) throw new IllegalStateException("Version query failed");
    android.util.Log.i("FaceSDK", "native=" + version.major + "." + version.minor
            + "." + version.patch + " C API level=" + InspireFace.QueryCAPILevel());
    android.util.Log.i("FaceSDK", InspireFace.QueryInspireFaceDiagnosticInformation());
    android.util.Log.i("FaceSDK", InspireFace.QueryInspireFaceComponentVersions());
    InspireFace.SetLogLevel(InspireFace.LOG_INFO);
}
```

Android 1.2.4.post1 可以通过这些高层方法直接读取诊断信息和组件版本，加载模型前也可调用。原生版本返回 `1.2.4`，`post1` 表示 Android 包的修订号，应在应用构建信息中单独记录依赖版本。新增诊断方法在原生调用失败时抛出 `jni.InspireFaceException`；兼容接口仍按各自约定返回 `null` 或 boolean。

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

@tab Objective-C

在处理队列空闲时，于任务前后各调用一次。`closeWithError:` 会立即释放对象持有的原生句柄；ARC 在对象销毁时也会释放。先关闭抓拍再关闭父会话，先关闭借用图像流再释放输入像素。计数器只统计会话和图像流，不代表全部内存分配。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL PrintOpenHandles(NSError **error) {
    HInt32 sessions = 0, streams = 0;
    if (![IFDiagnostics getLiveSessionCount:&sessions error:error] ||
        ![IFDiagnostics getLiveStreamCount:&streams error:error]) return NO;
    NSLog(@"open sessions=%d streams=%d", sessions, streams);
    return [IFDiagnostics printResourceStatisticsWithError:error];
}
```

@tab Swift

函数内创建的资源，可以紧接着写 `defer { try? resource.close() }`。长期保留的相机对象在串行工作队列停止后关闭。Swift 闭包辅助接口限制借用范围，但不会让已保存的指针在关闭或后续处理后继续有效。

```swift
import InspireFaceSwift

func printOpenHandles() throws {
    var sessions: Int32 = 0
    var streams: Int32 = 0
    try InspireFaceDiagnostics.getLiveSessionCount(&sessions)
    try InspireFaceDiagnostics.getLiveStreamCount(&streams)
    print("open sessions=\(sessions) streams=\(streams)")
    try InspireFaceDiagnostics.printResourceStatistics()
}
```

@tab Java

查询期间不要让其他线程创建或释放资源，保证数量和列表对应同一状态。这些计数器统计会话与 stream；抓拍、snapshot、bitmap 和独立分配的特征仍需调用各自的释放接口，Java 垃圾回收不会释放这些原生资源。

```java
static void printLiveResources() {
    int[] count = new int[1];
    check(HFDeBugGetUnreleasedSessionsCount(count));
    long[] sessions = new long[count[0]];
    if (sessions.length > 0) check(HFDeBugGetUnreleasedSessions(sessions, sessions.length));
    check(HFDeBugGetUnreleasedStreamsCount(count));
    long[] streams = new long[count[0]];
    if (streams.length > 0) check(HFDeBugGetUnreleasedStreams(streams, streams.length));
    System.out.println("sessions=" + sessions.length + " streams=" + streams.length);
}
```

@tab Android

Android 1.2.4.post1 的 `Session`、`ImageStream`、`FaceCapture` 和 `FaceDetectionSnapshot` 都支持 try-with-resources。先关闭抓拍对象，再关闭父会话。由 Android bitmap/byte[] 方法创建的 stream，应通过 `ImageStream.close()` 或 `InspireFace.ReleaseImageStream()` 释放，连同它管理的像素缓冲区一起清理。

完整 AAR 也包含 portable API 的资源查询。可在处理前后各调用一次，查询期间不要让其他线程创建或释放资源。这些计数器统计原生会话和 stream；snapshot、capture、bitmap 和独立分配的特征仍需调用各自的关闭或释放接口。

```java
import com.insightface.sdk.inspireface.jni.Native;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;
```

```java
static void printResources() {
    int[] count = new int[1];
    check(Native.HFDeBugGetUnreleasedSessionsCount(count));
    long[] sessions = new long[count[0]];
    if (sessions.length > 0) {
        check(Native.HFDeBugGetUnreleasedSessions(sessions, sessions.length));
    }
    check(Native.HFDeBugGetUnreleasedStreamsCount(count));
    long[] streams = new long[count[0]];
    if (streams.length > 0) {
        check(Native.HFDeBugGetUnreleasedStreams(streams, streams.length));
    }
    android.util.Log.i("FaceSDK", "sessions=" + java.util.Arrays.toString(sessions)
            + " streams=" + java.util.Arrays.toString(streams));
}
```

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
