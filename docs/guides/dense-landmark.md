# Facial landmarks

Landmarks describe positions on a detected face. Use the five-point output for alignment and the dense output for face contours, overlays or region-based image processing. Read both from the face token after detection.

<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/lmk.webp" alt="Facial landmarks used to align an expression overlay" width="1536" height="1024" />

## Read points {#read-points-in-python}

::: tabs #api-language

@tab C API

Read the five alignment points from the detection token. The [dense-point helper below](#read-points-in-c) shows allocation using the queried point count. Both calls use `faces.tokens[i]` from successful tracking.

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

After `FaceDetectAndTrack`, read both sets of points directly from each `FaceTrackWrap`.

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

@tab Android

The 1.2.0 Java package provides dense landmarks through a `DETECT_MODE_LIGHT_TRACK` session. For unrelated still images, create a fresh session for each image. For five-point alignment data, use the C, C++ or Python tab.

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

Use an initialized `Session` and the current frame's `ImageStream`. Both landmark calls return a flat `Float32Array` in `x0, y0, x1, y1, …` order. This helper releases the face result; the caller retains the session and closes the stream after all frame processing.

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

The session is initialized and `image` is the original BGR input.

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

Read all outputs that need the original pixels before drawing on the image, or draw on a copy. In Python, five-point output has shape `(5, 2)`; the current dense engines use 106 points. Query the native point count, then allocate the C array to that size.

## Read points in C

This helper prints the points in one valid detection token and returns the first error. It uses the caller's existing SDK session and detection result.

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

Call this with `faces.tokens[i]` before a later tracking call replaces the session's borrowed results. An owned detection snapshot is another option when processing results after the next frame.

In the native C++ API, use `session.GetFaceDenseLandmark(face)` and `session.GetFaceFiveKeyPoints(face)` with a `FaceTrackWrap`. See [C++ integration](../using-with/cpp.md) for the surrounding detection loop.

## Select a landmark engine

Available landmark engines:

| Engine | Enum |
| --- | --- |
| HyperLandmarkV2 0.25, default | `HF_LANDMARK_HYPLMV2_0_25` |
| HyperLandmarkV2 0.50 | `HF_LANDMARK_HYPLMV2_0_50` |
| InsightFace 2D106 tracking | `HF_LANDMARK_INSIGHTFACE_2D106_TRACK` |

Use `HFSwitchLandmarkEngine` in C, `InspireFace.switchLandmarkEngine` in HarmonyOS or `isf.switch_landmark_engine` in Python **before creating the session**. The selection applies to newly created sessions. Use a resource pack containing the selected model.

Start video integration with the default engine, then compare landmark stability and processing time on representative clips when choosing an engine.

## Point order and coordinates

This diagram shows the HyperLandmarkV2 point order. Keep region indices matched to the selected engine when extracting eye, mouth or contour points.

<figure>
<img class="landmark-map" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/hpylmkv2-order.jpg" alt="HyperLandmarkV2 face diagram with numbered landmark indices" loading="lazy" />
<figcaption>HyperLandmarkV2 index map. For example, its left eye contour uses indices 51–58 and its right eye contour uses 59–66.</figcaption>
</figure>

Point coordinates belong to the input frame. Apply the preview's crop, scale and mirror transform before drawing them on a camera UI. [Image inputs and coordinates](./image-inputs.md#rotation-and-display-coordinates) explains the distinction.

## Smoothing video landmarks

Use a tracking mode for an ordered video sequence and tune the smoothing ratio and cache length through the [tracking settings](./tracking.md#tune-one-setting-at-a-time). More smoothing can reduce jitter but also adds lag during fast movement. Evaluate the setting on a short sequence containing still poses, turns and temporary occlusion.

Use a separate session for each camera so each tracker keeps its own history.

## More landmark model options {#more-landmark-model-options}

HyperLandmark offers multiple landmark models, with versions focused on high accuracy, stable video tracking or low latency. Models also use different point counts and layouts, so you can choose the facial regions and level of detail that fit your application and target device.

For model selection and commercial licensing, contact [contact@insightface.ai](mailto:contact@insightface.ai) with your target platform, landmark requirements and intended use.

<figure>
<img class="landmark-map" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/lmk2.webp" alt="HyperLandmark facial landmarks with the contour, eyebrows, eyes, nose, lips and irises marked in different colors" width="1632" height="1684" loading="lazy" />
</figure>
