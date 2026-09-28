# 人脸关键点 {#facial-landmarks}

关键点描述检测到的人脸上的位置。五点输出适合人脸对齐，稠密关键点适合轮廓、贴图和局部图像处理。两者都在检测后通过人脸 token 获取。

<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/lmk.webp" alt="使用人脸关键点对齐表情贴图" width="1536" height="1024" />

## 读取关键点 {#read-points-in-python}

::: tabs #api-language

@tab C API

从检测结果的 token 中读取五点坐标。下方的[密集关键点辅助函数](#read-points-in-c)会先查询点数，再分配数组。两种调用均使用成功检测后得到的 `faces.tokens[i]`。

```c
static HResult print_five_points(HFFaceBasicToken token) {
    HPoint2f points[5];
    HResult status = HFGetFaceFiveKeyPointsFromFaceToken(token, points, 5);
    if (status != HSUCCEED) return status;
    for (HInt32 i = 0; i < 5; ++i) {
        printf("%d: %.2f, %.2f\n", i, points[i].x, points[i].y);
    }
    return HSUCCEED;
}
```

@tab C++

`FaceDetectAndTrack` 成功后，直接从每个 `FaceTrackWrap` 读取两组关键点。

```cpp
for (const auto& face : faces) {
    auto fivePoints = session.GetFaceFiveKeyPoints(face);
    auto densePoints = session.GetFaceDenseLandmark(face);
    std::cout << fivePoints.size() << " " << densePoints.size() << '\n';
    for (const auto& point : densePoints) {
        std::cout << point.GetX() << ", " << point.GetY() << '\n';
    }
}
```

@tab Objective-C

传入当前 `HFMultipleFaceData` 中的 token，并在下一次跟踪前读取；也可以使用尚未关闭的 `IFFaceSnapshot` 中的 token。接口写入调用方提供的数组，通过 `BOOL` 和 `NSError` 检查结果。

```objc
#import <InspireFace/InspireFaceApple.h>
#include <stdlib.h>

static BOOL ReadLandmarks(HFFaceBasicToken token, NSError **error) {
    HInt32 count = 0;
    if (![IFFaceToken getDenseLandmarkCount:&count error:error]) return NO;
    if (count <= 0) return IFCheck(HERR_INVALID_PARAM, error);
    HPoint2f five[5];
    HPoint2f *dense = calloc((size_t)count, sizeof(*dense));
    if (dense == NULL) return IFCheck(HERR_INVALID_PARAM, error);
    BOOL ok = [IFFaceToken getFiveKeyPoints:token into:five capacity:5 error:error] &&
        [IFFaceToken getDenseLandmarks:token into:dense capacity:count error:error];
    if (ok) {
        for (HInt32 i = 0; i < count; ++i) {
            NSLog(@"%d: %.2f, %.2f", i, dense[i].x, dense[i].y);
        }
    }
    free(dense);
    return ok;
}
```

@tab Swift

在 `session.withUnsafeFaces(in:)` 内传入 `faces.tokens[i]`，或保持对应的快照处于打开状态。输出数组独立保存坐标；视频循环中可以先查询点数，再分配一次数组并逐帧复用。

```swift
import InspireFaceSwift

func readLandmarks(token: FaceToken) throws {
    var count: Int32 = 0
    try FaceTokenUtilities.getDenseLandmarkCount(&count)
    guard count > 0 else {
        throw NSError(domain: IFErrorDomain, code: Int(HERR_INVALID_PARAM))
    }
    var five = [HPoint2f](repeating: HPoint2f(), count: 5)
    var dense = [HPoint2f](repeating: HPoint2f(), count: Int(count))
    try five.withUnsafeMutableBufferPointer {
        try FaceTokenUtilities.getFiveKeyPoints(token, into: $0)
    }
    try dense.withUnsafeMutableBufferPointer {
        try FaceTokenUtilities.getDenseLandmarks(token, into: $0)
    }
    for (index, point) in dense.enumerated() {
        print("\(index): \(point.x), \(point.y)")
    }
}
```

@tab Android

1.2.0 Java 包通过 `DETECT_MODE_LIGHT_TRACK` 会话提供密集关键点。处理互不相关的静态图片时，每张图片创建新的会话。五点对齐数据的读取方式见 C、C++ 或 Python 标签页。

```java
// session is a LIGHT_TRACK session; stream is the current image.
MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
if (faces == null) throw new IllegalStateException("Detection failed");
for (int i = 0; i < faces.detectedNum; i++) {
    Point2f[] points = InspireFace.GetFaceDenseLandmarkFromFaceToken(faces.tokens[i]);
    if (points == null || points.length == 0) {
        throw new IllegalStateException("Dense landmarks are unavailable");
    }
    for (Point2f point : points) {
        System.out.println(point.x + ", " + point.y);
    }
}
```

@tab HarmonyOS

传入已初始化的 `Session` 和当前帧的 `ImageStream`。两种关键点接口都返回按 `x0, y0, x1, y1, …` 排列的 `Float32Array`。函数释放检测结果；会话由调用方保留，图像流在该帧所有处理完成后关闭。

```ts
import { ImageStream, InspireFace, Session }
  from '@hyperinspire/inspireface';

function readLandmarks(session: Session, stream: ImageStream): void {
  const result = session.track(stream);
  try {
    for (const face of result.faces) {
      const five = InspireFace.getFiveKeyPoints(face);
      const dense = InspireFace.getDenseLandmarks(face);
      console.info(`five=${five.length / 2} dense=${dense.length / 2}`);
      for (let i = 0; i < dense.length; i += 2) {
        console.info(`${dense[i]}, ${dense[i + 1]}`);
      }
    }
  } finally {
    session.releaseFaceResult(result);
  }
}
```

@tab Python

以下使用已初始化的会话，`image` 是本次检测的 BGR 原始图像。

```python
# session is initialized; image is the BGR frame used for this detection.
faces = session.face_detection(image)
for face in faces:
    five_points = session.get_face_five_key_points(face)
    dense_points = session.get_face_dense_landmark(face)
    print(five_points.shape, dense_points.shape)
    for x, y in dense_points:
        cv2.circle(image, (round(float(x)), round(float(y))), 1, (0, 220, 0), -1)
```

:::

先读取所有需要原始像素的结果，再绘制图像，或者在副本上绘制。Python 五点输出的形状为 `(5, 2)`；当前稠密关键点引擎输出 106 个点。在 C 中先查询原生接口返回的点数，再按这个长度分配数组。

## 在 C 中读取关键点 {#read-points-in-c}

下面的辅助函数打印一个有效检测 token 中的关键点，并返回遇到的第一个错误。它使用调用方已有的 SDK 会话和检测结果。

```c
#include <stdio.h>
#include <stdlib.h>
#include <inspireface.h>

static HResult print_landmarks(HFFaceBasicToken token) {
    HInt32 count = 0;
    HResult status = HFGetNumOfFaceDenseLandmark(&count);
    if (status != HSUCCEED) return status;
    if (count <= 0) return HERR_INVALID_PARAM;
    HPoint2f *points = (HPoint2f *)malloc((size_t)count * sizeof(*points));
    if (points == NULL) return HERR_INVALID_PARAM;
    status = HFGetFaceDenseLandmarkFromFaceToken(token, points, count);
    if (status == HSUCCEED) {
        for (HInt32 i = 0; i < count; ++i) {
            printf("%d: %.2f, %.2f\n", i, points[i].x, points[i].y);
        }
    }
    free(points);
    return status;
}
```

使用 `faces.tokens[i]` 调用时，应在下一次跟踪覆盖会话借用的结果之前完成。若要在处理下一帧后继续使用结果，也可以创建具有独立生命周期的检测快照。

原生 C++ 接口通过 `session.GetFaceDenseLandmark(face)` 和 `session.GetFaceFiveKeyPoints(face)` 读取 `FaceTrackWrap` 中的关键点。完整检测循环见 [C++ 接入](../using-with/cpp.md)。

## 选择关键点引擎 {#select-a-landmark-engine}

可选的关键点引擎：

| Engine | Enum |
| --- | --- |
| HyperLandmarkV2 0.25 (default) | `HF_LANDMARK_HYPLMV2_0_25` |
| HyperLandmarkV2 0.50 | `HF_LANDMARK_HYPLMV2_0_50` |
| InsightFace 2D106 tracking | `HF_LANDMARK_INSIGHTFACE_2D106_TRACK` |

在**创建会话前**选择引擎：C 使用 `HFSwitchLandmarkEngine`，Objective-C 使用 `[IFRuntime setLandmarkEngine:HF_LANDMARK_HYPLMV2_0_25 error:&error]`，Swift 使用 `try InspireFaceRuntime.setLandmarkEngine(.hyperLandmark025)`，HarmonyOS 使用 `InspireFace.switchLandmarkEngine`，Python 使用 `isf.switch_landmark_engine`。选择结果对新创建的会话生效，模型包需要包含对应模型。

视频接入可以先使用默认引擎，再用典型视频片段比较点位稳定性和耗时，选择合适的引擎。

## 点位顺序与坐标 {#point-order-and-coordinates}

下图展示 HyperLandmarkV2 的点位顺序。提取眼部、嘴部或轮廓点时，使用所选引擎对应的索引。

<figure>
<img class="landmark-map" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/hpylmkv2-order.jpg" alt="标有索引编号的 HyperLandmarkV2 人脸关键点分布图" loading="lazy" />
<figcaption>HyperLandmarkV2 索引图。例如，左眼轮廓对应 51–58，右眼轮廓对应 59–66。</figcaption>
</figure>

关键点坐标属于输入帧。绘制到摄像头界面前，还需应用预览的裁剪、缩放和镜像变换。详见[图像输入与坐标](./image-inputs.md#rotation-and-display-coordinates)。

## 平滑视频关键点 {#smoothing-video-landmarks}

按顺序处理视频时使用跟踪模式，通过[跟踪参数](./tracking.md#tune-one-setting-at-a-time)调整平滑比例与缓存长度。增强平滑能减少抖动，也会在快速运动时增加延迟。可以用包含静止、转头和短暂遮挡的视频片段评估设置。

每路摄像头使用独立会话，分别保存各自的跟踪历史。

## 更多类型的关键点模型 {#more-landmark-model-options}

HyperLandmark 提供多个版本的关键点模型，包括侧重高精度、高稳定度或低延时的版本，也有不同的特征点数量与分布方案。可以根据关注的人脸区域、所需的细节程度、视频跟踪需求和设备性能，选择合适的模型。

如需了解模型选择或申请商用授权，请联系 [contact@insightface.ai](mailto:contact@insightface.ai)，并说明目标平台、点位需求和使用场景。

<figure>
<img class="landmark-map" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/lmk2.webp" alt="HyperLandmark 人脸关键点示例，用不同颜色标记脸部轮廓、眉毛、眼睛、鼻子、嘴唇与虹膜" width="1632" height="1684" loading="lazy" />
</figure>
