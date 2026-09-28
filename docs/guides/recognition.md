# Recognition and FeatureHub

Recognition starts with a face embedding: a vector extracted from an image and its face token. Compare two vectors for one-to-one verification, or search a gallery for one-to-many identification. Use an application or FeatureHub ID to associate the recognized person with your records.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/feature.webp" alt="Face images represented as feature vectors for comparison" width="1672" height="941" loading="lazy" />
<figcaption>Extract a vector from each face, then compare the vectors. The pictured distances illustrate the embedding space; the APIs below use cosine similarity and a model-specific threshold.</figcaption>
</figure>

## Compare two images

Enable recognition when creating the session. Detect each image, choose the intended face and extract its embedding while that image is still available.

::: tabs #api-language

@tab C API

Create `session` with `HF_ENABLE_FACE_RECOGNITION`. Pass streams for two input images to this helper. Each feature has its own allocation, so detecting the second image cannot overwrite the first feature. The caller owns the session and both streams.

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

After launching the runtime, pass the two image-backed `FrameProcess` objects as `enrollmentFrame` and `queryFrame`. Keep both images alive. Include `<stdexcept>`, `<iostream>` and `<inspireface/inspireface.hpp>`.

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

Create `IFSession` with `HF_ENABLE_FACE_RECOGNITION` and `HF_DETECT_MODE_ALWAYS_DETECT`. This helper requires one face in each input, writes into two separately owned buffers, and closes both buffers. The caller owns the session and image streams; check the returned `BOOL` and `NSError`.

<details>
<summary>Objective-C — Complete example</summary>

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

Create `FaceSession` with `SessionConfiguration(features: [.recognition], maximumFaces: 10, pixelLevel: 320)`. Pass two open streams; the default mode is `.alwaysDetect`. Each feature buffer owns its storage, so extracting the second face does not overwrite the first. All SDK failures throw.

<details>
<summary>Swift — Complete example</summary>

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

@tab Android

Create a session with `InspireFace.CreateCustomParameter().enableRecognition(true)`. The helper receives an open stream and returns an owned Java feature. Read the feature before releasing the stream; release the session when finished.

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

Use a session created with `Feature.FACE_RECOGNITION` and `DetectMode.ALWAYS_DETECT`. Pass two open `ImageStream` objects, each containing one face. The caller closes the streams and session after comparison.

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

This complete example loads `enrollment.jpg` and `query.jpg`. It uses the current context-manager API.

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

The complete script below accepts two image paths and a model path. Save it as `compare.py`, then run:

<details>
<summary>compare.py — complete code</summary>

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

This example accepts exactly one face per image. For a multi-face UI, let the user select a detected face or apply a fixed selection rule, then extract that face’s embedding.

## Choose a threshold

Cosine similarity compares the directions of two embedding vectors, with a score from -1 to 1. Higher values mean more similar vectors. Start with the threshold from the loaded model configuration, and use the raw cosine score for the comparison.

Collect representative pairs from your intended cameras and workflow: same-person pairs with changes in pose and lighting, and different-person pairs. Measure false-match and false-non-match rates at candidate thresholds, then select the threshold for your recognition model. Detection confidence is used earlier to select faces for extraction.

Before enrollment, check image quality, face size and pose. A higher-quality enrollment image often helps more than adjusting the search threshold. [Face capture](./face-capture.md) can select a stable candidate from video.

## Store and search a gallery

FeatureHub stores embeddings with integer IDs. Keep names, account records and other application data in your own database, keyed by that ID.

The following examples assume the SDK is launched and `enrolled` and `query` are embeddings extracted with the corresponding interface. C, C++, Objective-C, Swift, Python and HarmonyOS use the 1.2.4 APIs; Android uses the 1.2.0 Java package.

::: tabs #api-language

@tab C API

`enrolled` and `query` are valid `HFFaceFeature` values. This example uses manual ID 1001 and reads the ID and score from the search result. Include `<stdio.h>` for the output.

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

Here `enrolled` and `query` are `inspire::FaceEmbedding` values. Configure the process-wide hub once for a real application; this short example closes it after the search.

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

Pass two open, populated `IFFeatureBuffer` objects. This example enables an in-memory gallery and closes it on return. In an application, configure the process-wide hub once and serialize its operations. Read borrowed search data before another search on the same thread.

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

Use two populated `FaceFeatureBuffer` objects and keep them open for this call. The pointer to the identity feature is scoped to insertion. `found == 0` is a normal non-match; a failed API call throws.

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

@tab Android

`enrolled` and `query` are Java `FaceFeature` objects. The 1.2.0 Java wrapper returns an identity ID and score. Check for a non-null result, then use `id != -1` to identify a match. A null object indicates an API failure.

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

This example opens an in-memory gallery for two prepared `Float32Array` embeddings. IDs remain `bigint`, including when returned by search. Check `found` before reading a matched identity.

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

The current wrapper returns an explicit `matched` flag and copies result features into Python-owned arrays.

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

An empty gallery or no qualifying entry is a normal search outcome. Check the match indicator before using the identity: `found` in C/C++, Objective-C, Swift and ArkTS, `matched` in Python, and a non-null result with `id != -1` in Java 1.2.0. Top-k search also applies the configured threshold, so it may return fewer than `k` entries.

| Choice | Behavior |
| --- | --- |
| `HF_PK_MANUAL_INPUT` | Supply a stable application ID. `-1` is reserved for an invalid identity. |
| `HF_PK_AUTO_INCREMENT` | Let FeatureHub allocate the ID; save the ID returned by insertion. |
| `HF_SEARCH_MODE_EXHAUSTIVE` | Search for the best qualifying match. |
| `HF_SEARCH_MODE_EAGER` | Return the first entry that passes the threshold. |

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/search.webp" alt="A query face compared against multiple entries in a gallery" width="1672" height="941" loading="lazy" />
<figcaption>Extract once and search the enrolled vectors. Results contain an ID and score; the application applies its threshold and acceptance rules.</figcaption>
</figure>

## Maintain a gallery

Run these operations while FeatureHub is enabled, before the shutdown step in the previous example. The final operation removes ID 1001; omit it when the enrollment should remain.

::: tabs #api-language

@tab C API

The hub is enabled and ID 1001 exists. `replacement` and `query` are valid owned features. Consume the top-k arrays before the next search.

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

Run while the hub is enabled. `replacement` and `query` are `FaceEmbedding` values.

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

Call while the hub is enabled and ID 1001 exists, using open feature buffers. The final call removes that entry. Consume top-k arrays before another top-k search on the same thread.

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

Run before the hub shutdown step, with ID 1001 present. The result descriptors borrow native storage; the loop reads them immediately, and the last call removes the entry.

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

@tab Android

The Java 1.2.0 wrapper returns `SearchTopKResults`. A zero `num` is valid; a null object indicates a failed call.

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
if (!InspireFace.FeatureHubFaceRemove(1001L)) {
    throw new IllegalStateException("Cannot remove feature");
}
```

@tab HarmonyOS

Call this while FeatureHub is enabled and ID `1001n` exists. `get()` returns a copied feature array. The final call removes the entry.

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

Use `replacement` as the new embedding for ID 1001. Keep the hub enabled throughout these operations.

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

## Persistence and model changes

For a persistent gallery, set `enable_persistence=True` and provide a writable database **file** path such as `/var/lib/my-app/faces.db`. In ArkTS, use `enablePersistence: true` and `persistenceDbPath` with a writable file path in the app's files directory. Create its parent directory first. Closing FeatureHub releases its resources; reopening the same database restores stored entries.

On Apple, configure `HFFeatureHubConfiguration.enablePersistence` and `persistenceDbPath` before enabling the hub. Use a database file in the app’s writable Application Support directory. In Swift, keep the path’s C string inside `withCString` until `FeatureHub.enable(configuration:)` returns. The enable call consumes the path synchronously.

Sessions in one process share FeatureHub. Initialize it once, reuse it across frame processing and close it after the workers using it have stopped.

Store the recognition model identity and SDK version with the enrollment metadata. Keep each gallery’s enrollment and query vectors on the same model. When changing models, re-extract the enrollment images and evaluate the threshold again.

## C feature ownership

`HFFaceFeatureExtract` returns a view into session-owned storage. Another extraction can replace that buffer. For two features that must coexist, allocate each with `HFCreateFaceFeature`, fill it with `HFFaceFeatureExtractTo`, then release it with `HFReleaseFaceFeature`.

`HFFeatureHubFaceSearchV2` reports an explicit `found` flag. Its returned feature data is a borrowed cache valid until the next single-face search on the same thread. Copy it if you need to retain it. The current Python wrapper copies native feature arrays into Python-owned memory.

On Apple, `IFFeatureBuffer` / `FaceFeatureBuffer` owns an independent feature allocation. Its `borrowedFeature` property only returns a view; keep the owner open while that view is used. `IFSession` feature getters and Swift `withUnsafeFeature(in:token:)` borrow the session’s extraction cache. Use separate feature buffers for enrollment and query vectors that must coexist. ARC releases wrapper objects, but does not extend the validity of a borrowed pointer after a later extraction or explicit `close()`.

See the [C ownership table](../using-with/c-cpp.md#image-buffers-and-ownership) before combining extraction, search and asynchronous processing.
