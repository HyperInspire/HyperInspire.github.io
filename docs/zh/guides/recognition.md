# 识别与特征库 {#recognition-and-featurehub}

识别从人脸特征向量开始：使用图像和对应的人脸 token 提取一组向量。比较两个向量解决一对一比对问题，在特征库中搜索解决一对多检索问题。识别结果通过业务 ID 或 FeatureHub ID 关联到人员记录。

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/feature.webp" alt="从人脸提取特征向量并进行比较的示意" width="1672" height="941" loading="lazy" />
<figcaption>从人脸到特征向量，再进行比较。图中的距离仅用于示意向量关系；下面的 API 示例使用 cosine similarity，并按当前模型选择阈值。</figcaption>
</figure>

## 比较两张图像 {#compare-two-images}

创建会话时启用识别。分别检测两张图像，选择目标人脸，并在对应图像仍然有效时提取特征。

::: tabs #api-language

@tab C API

创建 `session` 时启用 `HF_ENABLE_FACE_RECOGNITION`，然后传入两张图片的图像流。这里分别分配两个特征，避免第二次提取覆盖第一次结果。会话和两个图像流均由调用方管理。

```c
#include <inspireface.h>

static HResult extract_one(HFSession session, HFImageStream stream,
                           HFFaceFeature output) {
    HFMultipleFaceData faces = {0};
    HResult status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED) return status;
    if (faces.detectedNum != 1) return HERR_INVALID_PARAM;
    return HFFaceFeatureExtractTo(session, stream, faces.tokens[0], output);
}

static HResult compare_images(HFSession session, HFImageStream first,
                              HFImageStream second, HFloat *score,
                              HFloat *threshold) {
    HFFaceFeature enrolled = {0}, query = {0};
    HResult status = HFCreateFaceFeature(&enrolled);
    if (status != HSUCCEED) return status;
    status = HFCreateFaceFeature(&query);
    if (status != HSUCCEED) {
        HFReleaseFaceFeature(&enrolled);
        return status;
    }
    status = extract_one(session, first, enrolled);
    if (status == HSUCCEED) status = extract_one(session, second, query);
    if (status == HSUCCEED) status = HFFaceComparison(enrolled, query, score);
    if (status == HSUCCEED) status = HFGetRecommendedCosineThreshold(threshold);
    HFReleaseFaceFeature(&query);
    HFReleaseFaceFeature(&enrolled);
    return status;
}
```

@tab C++

启动运行时后，将两张图片的 `FrameProcess` 作为 `enrollmentFrame` 和 `queryFrame` 传入，保留其底层图像。需要包含 `<stdexcept>`、`<iostream>` 和 `<inspireface/inspireface.hpp>`。

```cpp
inspire::CustomPipelineParameter options;
options.enable_recognition = true;
auto session = inspire::Session::Create(
    inspire::DETECT_MODE_ALWAYS_DETECT, 10, options, 320);
auto extractOne = [&](inspirecv::FrameProcess& frame) {
    std::vector<inspire::FaceTrackWrap> faces;
    int status = session.FaceDetectAndTrack(frame, faces);
    if (status != 0) throw std::runtime_error("Detection failed");
    if (faces.size() != 1) throw std::runtime_error("Expected exactly one face");
    inspire::FaceEmbedding feature;
    status = session.FaceFeatureExtract(frame, faces[0], feature);
    if (status != 0) throw std::runtime_error("Feature extraction failed");
    return feature;
};
auto enrolled = extractOne(enrollmentFrame);
auto query = extractOne(queryFrame);
float score = 0.0f;
int status = inspire::FeatureHubDB::CosineSimilarity(
    enrolled.embedding, query.embedding, score);
if (status != 0) throw std::runtime_error("Comparison failed");
float threshold = SIMILARITY_CONVERTER_GET_RECOMMENDED_COSINE_THRESHOLD();
std::cout << score << " " << (score >= threshold) << '\n';
```

@tab Objective-C

用 `HF_ENABLE_FACE_RECOGNITION` 和 `HF_DETECT_MODE_ALWAYS_DETECT` 创建 `IFSession`。函数要求每张图恰好一张脸，将特征写入两份独立缓冲区，结束时关闭它们。会话和图像流由调用方管理；检查返回的 `BOOL` 和 `NSError`。

<details>
<summary>Objective-C — 完整示例</summary>

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL ExtractOne(IFSession *session, IFImageStream *stream,
                       IFFeatureBuffer *output, NSError **error) {
    HFMultipleFaceData faces = {0};
    if (![session trackStream:stream borrowedResult:&faces error:error]) return NO;
    if (faces.detectedNum != 1) return IFCheck(HERR_INVALID_PARAM, error);
    return [session extractFeatureFromStream:stream token:faces.tokens[0]
        into:output.borrowedFeature error:error];
}

static BOOL CompareImages(IFSession *session, IFImageStream *first,
                          IFImageStream *second, float *score,
                          float *threshold, NSError **error) {
    IFFeatureBuffer *enrolled = [[IFFeatureBuffer alloc] initWithError:error];
    if (enrolled == nil) return NO;
    IFFeatureBuffer *query = [[IFFeatureBuffer alloc] initWithError:error];
    if (query == nil) {
        [enrolled closeWithError:NULL];
        return NO;
    }
    @try {
        return ExtractOne(session, first, enrolled, error) &&
            ExtractOne(session, second, query, error) &&
            [IFFeatureBuffer compare:enrolled.borrowedFeature with:query.borrowedFeature
                similarity:score error:error] &&
            [IFFeatureBuffer getRecommendedThreshold:threshold error:error];
    } @finally {
        [query closeWithError:NULL];
        [enrolled closeWithError:NULL];
    }
}
```

</details>

@tab Swift

使用 `SessionConfiguration(features: [.recognition], maximumFaces: 10, pixelLevel: 320)` 创建 `FaceSession`，传入两个有效的图像流；默认模式为 `.alwaysDetect`。每份特征缓冲区拥有独立内存，提取第二张脸不会覆盖第一份结果。SDK 调用失败时抛出错误。

<details>
<summary>Swift — 完整示例</summary>

```swift
import InspireFaceSwift

func extractOne(session: FaceSession, stream: ImageStream,
                into output: FaceFeatureBuffer) throws {
    try session.withUnsafeFaces(in: stream) { faces in
        guard faces.count == 1 else {
            throw NSError(domain: IFErrorDomain, code: Int(HERR_INVALID_PARAM),
                          userInfo: [NSLocalizedDescriptionKey: "Expected exactly one face"])
        }
        try output.withUnsafeMutableBufferPointer { buffer in
            try session.extractFeature(from: stream, token: faces.tokens[0], into: buffer)
        }
    }
}

func compareImages(session: FaceSession, first: ImageStream,
                   second: ImageStream) throws -> Float {
    let enrolled = try FaceFeatureBuffer()
    defer { try? enrolled.close() }
    let query = try FaceFeatureBuffer()
    defer { try? query.close() }
    try extractOne(session: session, stream: first, into: enrolled)
    try extractOne(session: session, stream: second, into: query)
    var score: Float = 0
    var threshold: Float = 0
    try FaceFeatureBuffer.compare(enrolled.borrowedFeature,
                                  with: query.borrowedFeature, similarity: &score)
    try FaceFeatureBuffer.getRecommendedThreshold(&threshold)
    print("similarity=\(score), match=\(score >= threshold)")
    return score
}
```

</details>

@tab Java

使用 [Java JVM SDK](../using-with/java.md)。添加下面的 import，并将这些方法放入应用类中。创建 `session` 时启用 `HF_ENABLE_FACE_RECOGNITION`，两份输入 stream 由调用方持有。两份特征各自分配原生内存，提取失败时 `try`-with-resources 也会释放它们。

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;
```

```java
static HFFaceFeature allocateFeature() {
    HFFaceFeature feature = new HFFaceFeature();
    check(HFCreateFaceFeature(feature));
    return feature;
}

static void extractOne(long session, long stream, HFFaceFeature output) {
    HFMultipleFaceData faces = new HFMultipleFaceData();
    check(HFExecuteFaceTrack(session, stream, faces));
    if (faces.detectedNum != 1) {
        throw new IllegalArgumentException("Expected exactly one face");
    }
    check(HFFaceFeatureExtractTo(session, stream, faces.tokens[0], output));
}

static float compareImages(long session, long first, long second) {
    try (HFFaceFeature enrolled = allocateFeature();
         HFFaceFeature query = allocateFeature()) {
        extractOne(session, first, enrolled);
        extractOne(session, second, query);
        float[] score = new float[1], threshold = new float[1];
        check(HFFaceComparison(enrolled, query, score));
        check(HFGetRecommendedCosineThreshold(threshold));
        System.out.println("score=" + score[0] + " match=" + (score[0] >= threshold[0]));
        return score[0];
    }
}
```

@tab Android

创建会话时传入 `InspireFace.CreateCustomParameter().enableRecognition(true)`。辅助方法接收有效的图像流，返回 Java 持有的特征。先完成提取，再释放图像流；全部使用结束后释放会话。

```java
static FaceFeature extractOne(Session session, ImageStream stream) {
    MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
    if (faces == null) throw new IllegalStateException("Detection failed");
    if (faces.detectedNum != 1) {
        throw new IllegalArgumentException("Expected exactly one face");
    }
    FaceFeature feature = InspireFace.ExtractFaceFeature(
            session, stream, faces.tokens[0]);
    if (feature == null || feature.data == null || feature.data.length == 0) {
        throw new IllegalStateException("Feature extraction failed");
    }
    return feature;
}
```

```java
FaceFeature enrolled = extractOne(session, enrollmentStream);
FaceFeature query = extractOne(session, queryStream);
float score = InspireFace.FaceComparison(enrolled, query);
float threshold = InspireFace.GetRecommendedCosineThreshold();
System.out.println("score=" + score + " match=" + (score >= threshold));
```

@tab HarmonyOS

会话创建时启用 `Feature.FACE_RECOGNITION`，模式设为 `DetectMode.ALWAYS_DETECT`。传入两个有效的 `ImageStream`，每张图各含一张人脸。比对结束后由调用方关闭图像流和会话。

```ts
import { ImageStream, InspireFace, Session } from '@hyperinspire/inspireface';

function extractOne(session: Session, image: ImageStream): Float32Array {
  const faces = session.track(image);
  try {
    if (faces.detectedNum !== 1) {
      throw new Error('Expected exactly one face');
    }
    return session.extractFeature(image, faces.faces[0]);
  } finally {
    session.releaseFaceResult(faces);
  }
}

export function compareImages(session: Session, first: ImageStream,
                              second: ImageStream): number {
  const enrolled = extractOne(session, first);
  const query = extractOne(session, second);
  const score = InspireFace.compareFeatures(enrolled, query);
  const threshold = InspireFace.getRecommendedThreshold();
  console.info(`similarity=${score}, match=${score >= threshold}`);
  return score;
}
```

@tab Python

这个完整示例读取 `enrollment.jpg` 和 `query.jpg`，使用当前版本的上下文管理器接口。

```python
import cv2
import inspireface as isf

def extract_one(session, path):
    image = cv2.imread(path)
    if image is None:
        raise FileNotFoundError(path)
    faces = session.face_detection(image)
    if len(faces) != 1:
        raise ValueError(f"Expected one face in {path}; found {len(faces)}")
    return session.face_feature_extract(image, faces[0])

isf.launch(resource_path="/path/to/Pikachu")
try:
    with isf.InspireFaceSession(
        isf.HF_ENABLE_FACE_RECOGNITION,
        isf.HF_DETECT_MODE_ALWAYS_DETECT,
        max_detect_num=10,
        detect_pixel_level=320,
        auto_launch=False,
    ) as session:
        enrolled = extract_one(session, "enrollment.jpg")
        query = extract_one(session, "query.jpg")
        score = isf.feature_comparison(enrolled, query)
        threshold = isf.get_recommended_cosine_threshold()
        print(f"similarity={score:.4f}, threshold={threshold:.4f}")
        print("match" if score >= threshold else "no match")
finally:
    isf.terminate()
```

:::

下面的完整脚本支持通过命令行传入两张图像和模型路径。将代码保存为 `compare.py`，然后运行：

<details>
<summary>compare.py — 完整代码</summary>

```python
"""Compare two images that each contain exactly one face."""
import argparse
import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first")
    parser.add_argument("second")
    parser.add_argument("--model", required=True)
    args = parser.parse_args()
    images = [cv2.imread(path) for path in (args.first, args.second)]
    if any(image is None for image in images):
        parser.error("Both image paths must be readable")

    isf.launch(resource_path=args.model)
    session = None
    try:
        session = isf.InspireFaceSession(
            isf.HF_ENABLE_FACE_RECOGNITION, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320,
        )
        features = []
        for image in images:
            faces = session.face_detection(image)
            if len(faces) != 1:
                raise ValueError(f"Expected exactly one face; found {len(faces)}")
            features.append(session.face_feature_extract(image, faces[0]))
        similarity = isf.feature_comparison(features[0], features[1])
        threshold = isf.get_recommended_cosine_threshold()
        print(f"Cosine similarity: {similarity:.4f}")
        print(f"Model threshold: {threshold:.4f}")
        print(f"Above threshold: {similarity >= threshold}")
    finally:
        if session is not None:
            session.release()
        isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python compare.py enrollment.jpg query.jpg --model /path/to/Pikachu
```

示例要求每张图片恰好包含一张人脸。多人图片可以让用户选择检测框，或使用固定的选择规则，再提取目标人脸的特征。

## 选择阈值 {#choose-a-threshold}

余弦相似度比较两个特征向量的方向，分数范围为 -1 到 1，越高表示向量越相似。先读取所加载模型的推荐阈值，再用原始余弦分数进行比较。

从实际摄像头和使用流程中收集测试对：包括姿态、光照变化下的同一人，以及不同的人。测量各候选阈值的错误匹配率和错误拒绝率，为所用识别模型选择阈值。检测置信度用于更早的人脸筛选阶段。

录入前检查图像质量、人脸大小和姿态。提高录入图像质量，往往比反复调整检索阈值更有效。[人脸抓拍](./face-capture.md) 可以从视频中选择较稳定的候选帧。

## 存储与搜索特征库 {#store-and-search-a-gallery}

FeatureHub 用整数 ID 关联特征向量。姓名、账户等应用信息放在自己的数据库中，通过该 ID 关联。

下面假设 SDK 已启动，`enrolled` 和 `query` 是用对应接口提取的特征。C、C++、Objective-C、Swift、Python 和 HarmonyOS 使用 1.2.4 接口，Android 使用 1.2.4.post1 AAR。

::: tabs #api-language

@tab C API

`enrolled` 和 `query` 是已提取的 `HFFaceFeature`。示例使用手动 ID 1001，并从搜索结果中读取 ID 和分数。输出部分需要 `<stdio.h>`。

```c
static HResult search_gallery(HFFaceFeature enrolled, HFFaceFeature query) {
    HFFeatureHubConfiguration config = {0};
    config.primaryKeyMode = HF_PK_MANUAL_INPUT;
    config.persistenceDbPath = "";
    config.searchMode = HF_SEARCH_MODE_EXHAUSTIVE;
    HResult status = HFGetRecommendedCosineThreshold(&config.searchThreshold);
    if (status != HSUCCEED) return status;
    status = HFFeatureHubDataEnable(config);
    if (status != HSUCCEED) return status;

    HFFaceFeatureIdentity identity = {0};
    identity.id = 1001;
    identity.feature = &enrolled;
    HFaceId stored_id = HF_INVALID_FACE_ID;
    status = HFFeatureHubInsertFeature(identity, &stored_id);
    if (status == HSUCCEED) {
        HFFeatureHubSearchResultV2 result = {0};
        status = HFFeatureHubFaceSearchV2(query, &result);
        if (status == HSUCCEED && result.found) {
            printf("id=%lld score=%.4f\n", (long long)result.id, result.confidence);
        }
    }
    HResult close_status = HFFeatureHubDataDisable();
    return status == HSUCCEED ? close_status : status;
}
```

@tab C++

这里的 `enrolled` 和 `query` 是 `inspire::FaceEmbedding`。实际应用应统一管理进程中的 FeatureHub；这个短示例在搜索后立即关闭。

```cpp
inspire::DatabaseConfiguration config;
config.primary_key_mode = inspire::MANUAL_INPUT;
config.search_mode = inspire::SEARCH_MODE_EXHAUSTIVE;
config.recognition_threshold =
    SIMILARITY_CONVERTER_GET_RECOMMENDED_COSINE_THRESHOLD();
auto hub = INSPIREFACE_FEATURE_HUB;
int status = hub->EnableHub(config);
if (status != 0) throw std::runtime_error("Cannot enable FeatureHub");
try {
    int64_t storedId = -1;
    status = hub->FaceFeatureInsert(enrolled.embedding, int64_t{1001}, storedId);
    if (status != 0) throw std::runtime_error("Cannot insert feature");
    inspire::FaceSearchResult result;
    bool found = false;
    status = hub->SearchFaceFeatureV2(query.embedding, result, found);
    if (status != 0) throw std::runtime_error("Gallery search failed");
    if (found) {
        std::cout << result.id << " " << result.similarity << '\n';
    }
} catch (...) {
    hub->DisableHub();
    throw;
}
if (hub->DisableHub() != 0) throw std::runtime_error("Cannot close FeatureHub");
```

@tab Objective-C

传入两份尚未关闭、已写入特征的 `IFFeatureBuffer`。示例创建内存特征库，并在返回前关闭。实际应用中，整个进程初始化一次 FeatureHub，串行执行相关操作；借用的搜索结果应在同线程下一次搜索前读取完。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL SearchGallery(IFFeatureBuffer *enrolled, IFFeatureBuffer *query,
                          NSError **error) {
    HFFeatureHubConfiguration config = {0};
    config.primaryKeyMode = HF_PK_MANUAL_INPUT;
    config.searchMode = HF_SEARCH_MODE_EXHAUSTIVE;
    if (![IFFeatureBuffer getRecommendedThreshold:&config.searchThreshold error:error]) return NO;
    if (![IFFeatureHub enableWithConfiguration:config error:error]) return NO;
    @try {
        HFFaceFeature feature = enrolled.borrowedFeature;
        HFFaceFeatureIdentity identity = {1001, &feature};
        HFaceId storedID = HF_INVALID_FACE_ID;
        if (![IFFeatureHub insert:identity allocatedID:&storedID error:error]) return NO;
        HFFeatureHubSearchResultV2 result = {0};
        if (![IFFeatureHub search:query.borrowedFeature borrowedResult:&result error:error]) return NO;
        if (result.found) NSLog(@"id=%lld score=%.4f", (long long)result.id, result.confidence);
        else NSLog(@"No gallery entry passed the threshold");
        return YES;
    } @finally {
        [IFFeatureHub disableWithError:NULL];
    }
}
```

@tab Swift

传入两份已写入特征的 `FaceFeatureBuffer`，调用期间保持打开。插入时使用的特征指针只在闭包内有效。`found == 0` 表示正常的未匹配结果；API 调用失败则抛出错误。

```swift
import InspireFaceSwift

func searchGallery(enrolled: FaceFeatureBuffer, query: FaceFeatureBuffer) throws {
    var config = HFFeatureHubConfiguration()
    config.primaryKeyMode = HF_PK_MANUAL_INPUT
    config.searchMode = HF_SEARCH_MODE_EXHAUSTIVE
    try FaceFeatureBuffer.getRecommendedThreshold(&config.searchThreshold)
    try FeatureHub.enable(configuration: config)
    defer { try? FeatureHub.disable() }
    var feature = enrolled.borrowedFeature
    try withUnsafeMutablePointer(to: &feature) { pointer in
        let identity = HFFaceFeatureIdentity(id: 1001, feature: pointer)
        var storedID: Int64 = -1
        try FeatureHub.insert(identity, allocatedID: &storedID)
    }
    var result = HFFeatureHubSearchResultV2()
    try FeatureHub.search(query.borrowedFeature, borrowedResult: &result)
    if result.found != 0 {
        print("id=\(result.id), score=\(result.confidence)")
    } else {
        print("No gallery entry passed the threshold")
    }
}
```

@tab Java

传入上一节分配的两份特征。此方法启用内存图库，插入 ID 1001 后进行检索。应用中应统一管理进程共享的 FeatureHub，初始化一次，待所有使用方结束后再关闭。通过 `found` 判断是否匹配，不能用 ID 是否为零判断。

```java
static void searchGallery(HFFaceFeature enrolled, HFFaceFeature query) {
    float[] threshold = new float[1];
    check(HFGetRecommendedCosineThreshold(threshold));
    HFFeatureHubConfiguration config = new HFFeatureHubConfiguration();
    config.primaryKeyMode = HF_PK_MANUAL_INPUT;
    config.enablePersistence = 0;
    config.persistenceDbPath = "";
    config.searchThreshold = threshold[0];
    config.searchMode = HF_SEARCH_MODE_EXHAUSTIVE;
    check(HFFeatureHubDataEnable(config));
    try {
        HFFaceFeatureIdentity identity = new HFFaceFeatureIdentity();
        identity.id = 1001L;
        identity.feature = enrolled;
        long[] insertedId = new long[1];
        check(HFFeatureHubInsertFeature(identity, insertedId));
        HFFeatureHubSearchResultV2 result = new HFFeatureHubSearchResultV2();
        check(HFFeatureHubFaceSearchV2(query, result));
        if (result.found != 0) {
            System.out.println("id=" + result.id + " score=" + result.confidence);
        } else {
            System.out.println("No match above threshold");
        }
    } finally {
        check(HFFeatureHubDataDisable());
    }
}
```

@tab Android

`enrolled` 和 `query` 是 Java `FaceFeature`。Android 1.2.4.post1 内部使用 V2 搜索，返回 ID 和分数。先检查结果非 null，再通过 `id != -1` 判断匹配成功。查询成功但没有匹配时，返回 `id == -1`、`searchConfidence == -1`、`feature == null`；结果对象本身为 null 才表示调用失败。

```java
FeatureHubConfiguration config = InspireFace.CreateFeatureHubConfiguration()
        .setPrimaryKeyMode(InspireFace.PK_MANUAL_INPUT)
        .setEnablePersistence(false)
        .setPersistenceDbPath("")
        .setSearchThreshold(InspireFace.GetRecommendedCosineThreshold())
        .setSearchMode(InspireFace.SEARCH_MODE_EXHAUSTIVE);
if (!InspireFace.FeatureHubDataEnable(config)) {
    throw new IllegalStateException("Cannot enable FeatureHub");
}
try {
    FaceFeatureIdentity identity = FaceFeatureIdentity.create(1001L, enrolled);
    if (!InspireFace.FeatureHubInsertFeature(identity)) {
        throw new IllegalStateException("Cannot insert feature");
    }
    FaceFeatureIdentity result = InspireFace.FeatureHubFaceSearch(query);
    if (result == null) throw new IllegalStateException("Gallery search failed");
    if (result.id != -1L) {
        System.out.println(result.id + " " + result.searchConfidence);
    } else {
        System.out.println("No gallery entry passed the threshold");
    }
} finally {
    InspireFace.FeatureHubDataDisable();
}
```

@tab HarmonyOS

下面使用两个已提取的 `Float32Array` 特征，创建内存特征库。ID 始终使用 `bigint`，搜索返回值也一样。读取匹配身份前先检查 `found`。

```ts
import { FeatureHub, InspireFace, PrimaryKeyMode, SearchMode }
  from '@hyperinspire/inspireface';

export function searchGallery(enrolled: Float32Array, query: Float32Array): void {
  FeatureHub.enable({
    primaryKeyMode: PrimaryKeyMode.MANUAL_INPUT,
    enablePersistence: false,
    searchMode: SearchMode.EXHAUSTIVE,
    searchThreshold: InspireFace.getRecommendedThreshold()
  });
  try {
    const id = FeatureHub.insert(enrolled, 1001n);
    console.info(`stored=${id.toString()}`);
    const match = FeatureHub.search(query);
    if (match.found) {
      console.info(`id=${match.id.toString()}, score=${match.confidence}`);
    } else {
      console.info('No gallery entry passed the threshold');
    }
    const top = FeatureHub.searchTopK(query, 5);
    for (let i = 0; i < top.ids.length; i++) {
      console.info(`id=${top.ids[i].toString()}, score=${top.confidence[i]}`);
    }
  } finally {
    FeatureHub.disable();
  }
}
```

@tab Python

当前封装使用明确的 `matched` 标志，并将结果特征复制到 Python 自己持有的数组中。

```python
config = isf.FeatureHubConfiguration(
    primary_key_mode=isf.HF_PK_MANUAL_INPUT,
    enable_persistence=False,
    persistence_db_path="",
    search_threshold=isf.get_recommended_cosine_threshold(),
    search_mode=isf.HF_SEARCH_MODE_EXHAUSTIVE,
)
isf.feature_hub_enable(config)
try:
    success, stored_id = isf.feature_hub_face_insert(
        isf.FaceIdentity(enrolled, id=1001)
    )
    if not success:
        raise RuntimeError("Cannot insert feature")
    print("stored", success, stored_id)

    result = isf.feature_hub_face_search(query)
    if result.matched:
        print(result.similar_identity.id, result.confidence)
    else:
        print("No gallery entry passed the threshold")

    for score, identity_id in isf.feature_hub_face_search_top_k(query, 5):
        print(identity_id, score)
finally:
    isf.feature_hub_disable()
```

:::

空库和没有符合条件的记录都是正常结果。使用结果前先检查匹配标志：C/C++、Java JVM、Objective-C、Swift 和 ArkTS 的 `found`、Python 的 `matched`；Android 1.2.4.post1 则检查结果非 null 且 `id != -1`。Top-k 搜索同样应用配置的阈值，因此返回数量可能少于 `k`。

| Option | 行为说明 |
| --- | --- |
| `HF_PK_MANUAL_INPUT` | 由应用提供稳定 ID；`-1` 表示无效身份，不能用于录入。 |
| `HF_PK_AUTO_INCREMENT` | 由 FeatureHub 分配 ID；保存插入操作返回的 ID。 |
| `HF_SEARCH_MODE_EXHAUSTIVE` | 搜索满足阈值的最佳匹配。 |
| `HF_SEARCH_MODE_EAGER` | 返回第一条满足阈值的记录。 |

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/search.webp" alt="一张查询人脸与特征库中的多个人员进行匹配" width="1672" height="941" loading="lazy" />
<figcaption>一次提取、多次检索：查询向量与已录入的向量比较，搜索结果返回 ID 和分数。是否接受匹配由应用的阈值与业务规则决定。</figcaption>
</figure>

## 维护特征库 {#maintain-a-gallery}

下面的操作放在 FeatureHub 启用期间、上例关闭步骤之前执行。最后一步会删除 ID 1001；如果需要保留录入记录，省略该步即可。

::: tabs #api-language

@tab C API

FeatureHub 已启用，且 ID 1001 已存在。`replacement` 和 `query` 是有效的特征；在下一次搜索前读取完 top-k 数组。

```c
static HResult maintain_gallery(HFFaceFeature replacement, HFFaceFeature query) {
    HFFaceFeatureIdentity identity = {1001, &replacement};
    HResult status = HFFeatureHubFaceUpdate(identity);
    if (status != HSUCCEED) return status;
    HFSearchTopKResults top = {0};
    status = HFFeatureHubFaceSearchTopK(query, 5, &top);
    if (status != HSUCCEED) return status;
    for (HInt32 i = 0; i < top.size; ++i) {
        printf("%lld %.4f\n", (long long)top.ids[i], top.confidence[i]);
    }
    HInt32 count = 0;
    status = HFFeatureHubGetFaceCount(&count);
    if (status != HSUCCEED) return status;
    printf("entries=%d\n", count);
    return HFFeatureHubFaceRemove(1001);
}
```

@tab C++

在 FeatureHub 启用期间调用，`replacement` 和 `query` 是 `FaceEmbedding`。

```cpp
auto hub = INSPIREFACE_FEATURE_HUB;
if (hub->FaceFeatureUpdate(replacement.embedding, int64_t{1001}) != 0) {
    throw std::runtime_error("Cannot update feature");
}
std::vector<inspire::FaceSearchResult> top;
if (hub->SearchFaceFeatureTopK(query.embedding, top, 5) != 0) {
    throw std::runtime_error("Top-k search failed");
}
for (const auto& result : top) {
    std::cout << result.id << " " << result.similarity << '\n';
}
int32_t count = 0;
if (hub->GetFaceFeatureCount(count) != 0) throw std::runtime_error("Count failed");
std::cout << "entries=" << count << '\n';
if (hub->FaceFeatureRemove(int64_t{1001}) != 0) {
    throw std::runtime_error("Cannot remove feature");
}
```

@tab Objective-C

在 FeatureHub 已启用、ID 1001 已存在且特征缓冲区仍有效时调用。最后一步会删除该条目。Top-k 数组应在同线程下一次 top-k 搜索前读取完。

```objc
#import <InspireFace/InspireFaceApple.h>

static BOOL MaintainGallery(IFFeatureBuffer *replacement, IFFeatureBuffer *query,
                            NSError **error) {
    HFFaceFeature feature = replacement.borrowedFeature;
    HFFaceFeatureIdentity identity = {1001, &feature};
    if (![IFFeatureHub updateIdentity:identity error:error]) return NO;
    HFSearchTopKResults top = {0};
    if (![IFFeatureHub search:query.borrowedFeature topK:5 borrowedResults:&top error:error]) return NO;
    for (HInt32 i = 0; i < top.size; ++i) {
        NSLog(@"id=%lld score=%.4f", (long long)top.ids[i], top.confidence[i]);
    }
    HInt32 count = 0;
    if (![IFFeatureHub getIdentityCount:&count error:error]) return NO;
    NSLog(@"entries=%d", count);
    return [IFFeatureHub removeIdentityWithID:1001 error:error];
}
```

@tab Swift

在 FeatureHub 关闭前调用，且 ID 1001 已存在。返回的描述符借用原生存储，示例立即读取，最后删除该条目。

```swift
import InspireFaceSwift

func maintainGallery(replacement: FaceFeatureBuffer, query: FaceFeatureBuffer) throws {
    var feature = replacement.borrowedFeature
    try withUnsafeMutablePointer(to: &feature) { pointer in
        try FeatureHub.updateIdentity(HFFaceFeatureIdentity(id: 1001, feature: pointer))
    }
    var top = HFSearchTopKResults()
    try FeatureHub.search(query.borrowedFeature, topK: 5, borrowedResults: &top)
    for i in 0..<Int(top.size) {
        print("id=\(top.ids[i]), score=\(top.confidence[i])")
    }
    var count: Int32 = 0
    try FeatureHub.getIdentityCount(&count)
    print("entries=\(count)")
    try FeatureHub.removeIdentity(id: 1001)
}
```

@tab Java

调用前应已启用 FeatureHub，且 ID 1001 存在。Top-k 分数和 ID 是借用原生内存的 `ByteBuffer`，应在下一次 top-k 检索前读取或复制。字节偏移分别为 `i * Float.BYTES` 和 `i * Long.BYTES`；ID 列表也要在修改图库前读完。

```java
static void maintainGallery(HFFaceFeature replacement, HFFaceFeature query) {
    HFFaceFeatureIdentity stored = new HFFaceFeatureIdentity();
    check(HFFeatureHubGetFaceIdentity(1001L, stored));
    float[] copied = new float[stored.feature.size];
    stored.feature.data.asFloatBuffer().get(copied);
    System.out.println("copied feature length=" + copied.length);
    HFFaceFeatureIdentity identity = new HFFaceFeatureIdentity();
    identity.id = 1001L;
    identity.feature = replacement;
    check(HFFeatureHubFaceUpdate(identity));
    HFSearchTopKResults top = new HFSearchTopKResults();
    check(HFFeatureHubFaceSearchTopK(query, 5, top));
    for (int i = 0; i < top.size; i++) {
        long id = top.ids.getLong(i * Long.BYTES);
        float score = top.confidence.getFloat(i * Float.BYTES);
        System.out.println("id=" + id + " score=" + score);
    }
    int[] count = new int[1];
    check(HFFeatureHubGetFaceCount(count));
    System.out.println("entries=" + count[0]);
    HFFeatureHubExistingIds ids = new HFFeatureHubExistingIds();
    check(HFFeatureHubGetExistingIds(ids));
    for (int i = 0; i < ids.size; i++) {
        System.out.println("stored=" + ids.ids.getLong(i * Long.BYTES));
    }
    check(HFFeatureHubFaceRemove(1001L));
}
```

@tab Android

Android 1.2.4.post1 返回 `SearchTopKResults`；`num` 为 0 是正常结果，返回 null 表示调用失败。`FeatureHubGetExistingIds()` 和 `FeatureHubGetFaceIdentity()` 返回独立的 Java 副本，ID 始终使用 `long`。包括启用、关闭在内的所有人脸库操作，应放到同一个工作线程，或使用同一把应用锁。

```java
if (!InspireFace.FeatureHubFaceUpdate(FaceFeatureIdentity.create(1001L, replacement))) {
    throw new IllegalStateException("Cannot update feature");
}
SearchTopKResults top = InspireFace.FeatureHubFaceSearchTopK(query, 5);
if (top == null) throw new IllegalStateException("Top-k search failed");
for (int i = 0; i < top.num; i++) {
    System.out.println(top.ids[i] + " " + top.confidence[i]);
}
int count = InspireFace.FeatureHubGetFaceCount();
if (count < 0) throw new IllegalStateException("Count failed");
System.out.println("entries=" + count);
long[] ids = InspireFace.FeatureHubGetExistingIds();
if (ids == null) throw new IllegalStateException("Cannot list IDs");
for (long id : ids) {
    FaceFeatureIdentity stored = InspireFace.FeatureHubGetFaceIdentity(id);
    if (stored == null || stored.feature == null) {
        throw new IllegalStateException("Cannot read feature " + id);
    }
    System.out.println("stored=" + id + " dimensions=" + stored.feature.data.length);
}
if (!InspireFace.FeatureHubFaceRemove(1001L)) {
    throw new IllegalStateException("Cannot remove feature");
}
```

@tab HarmonyOS

在 FeatureHub 已启用且 `1001n` 已存在时调用。`get()` 返回复制后的特征数组。最后一步会删除该条记录。

```ts
import { FeatureHub } from '@hyperinspire/inspireface';

export function maintainGallery(replacement: Float32Array): void {
  const id = 1001n;
  FeatureHub.update(id, replacement);
  const feature = FeatureHub.get(id);
  console.info(`feature length=${feature.length}`);
  console.info(`entries=${FeatureHub.getCount()}`);
  for (const storedId of FeatureHub.getIds()) {
    console.info(storedId.toString());
  }
  FeatureHub.remove(id);
}
```

@tab Python

`replacement` 是 ID 1001 的新特征。下面这些操作期间，FeatureHub 应保持启用。

```python
if not isf.feature_hub_face_update(isf.FaceIdentity(replacement, id=1001)):
    raise RuntimeError("Cannot update feature")
for score, identity_id in isf.feature_hub_face_search_top_k(query, 5):
    print(identity_id, score)
print("entries", isf.feature_hub_get_face_count())
print("ids", isf.feature_hub_get_face_id_list())
if not isf.feature_hub_face_remove(1001):
    raise RuntimeError("Cannot remove feature")
```

:::

## 持久化与模型变更 {#persistence-and-model-changes}

ArkTS 使用 `enablePersistence: true`，并将 `persistenceDbPath` 设为应用文件目录中可写的数据库文件路径。

需要持久化时，设置 `enable_persistence=True`，并提供可写的数据库**文件**路径，例如 `/var/lib/my-app/faces.db`。先创建父目录。关闭 FeatureHub 会释放资源，再次打开同一数据库可以恢复已保存的记录。

Apple 接入时，在启用前设置 `HFFeatureHubConfiguration.enablePersistence` 和 `persistenceDbPath`，数据库文件放在应用可写的 Application Support 目录中。Swift 使用 `withCString` 保持路径的 C 字符串有效，直到 `FeatureHub.enable(configuration:)` 返回；启用调用会同步读取路径。

Java JVM 在启用 FeatureHub 前设置 `enablePersistence = 1`，并将 `persistenceDbPath` 设为可写的数据库文件路径。路径使用 Java `String`，JNI 调用会同步读取它。

同一进程中的会话共享 FeatureHub。初始化一次后，在连续帧处理中复用；使用它的工作线程结束后再关闭。

在录入元数据中保存识别模型标识和 SDK 版本，录入向量与查询向量使用同一模型。更换模型时，重新提取录入图像并评估阈值。

## C 特征内存的归属 {#c-feature-ownership}

`HFFaceFeatureExtract` 返回会话内部存储的视图，下一次提取可能覆盖这块内存。需要同时保留两份特征时，分别用 `HFCreateFaceFeature` 分配，通过 `HFFaceFeatureExtractTo` 写入，最后调用 `HFReleaseFaceFeature` 释放。

`HFFeatureHubFaceSearchV2` 通过 `found` 明确报告是否找到匹配。它返回的特征数据是借用的缓存，在同一线程的下一次单人脸搜索前有效；需要长期保留时应复制。当前 Python 封装会将原生特征数组复制到由 Python 持有的内存中。

Apple 的 `IFFeatureBuffer` / `FaceFeatureBuffer` 拥有独立的特征内存，但 `borrowedFeature` 只返回视图，使用期间应保持缓冲区打开。`IFSession` 的特征 getter 和 Swift 的 `withUnsafeFeature(in:token:)` 借用会话提取缓存；录入与查询向量需要同时保留时，使用两份独立的特征缓冲区。ARC 会释放封装对象，但不会让借用指针在下一次提取或显式 `close()` 后继续有效。

Java JVM 绑定沿用这些原生内存的生命周期。`HFFaceFeature.data` 是 direct `ByteBuffer` 视图，不是 Java 自有副本。只有通过 `HFCreateFaceFeature` 初始化的特征可以 `close()` 或释放，而且必须使用分配时的同一个描述对象。`HFFaceFeatureExtract`、图库查询和检索返回的特征都是借用数据；需要跨后续调用保留时，先复制到 Java `float[]` 或应用自己分配的 direct buffer。仅保留 `ByteBuffer` 引用不会延长原生资源的生命。

组合特征提取、检索与异步处理前，可先查看 [C 接口的内存归属表](../using-with/c-cpp.md#image-buffers-and-ownership)。
