# Dense Facial Landmark Prediction

We offer the latest **HyperLandmarkV2**, a high-precision facial landmark detection model optimized for mobile devices. It is designed for seamless integration with AR cameras, beauty filters, and skin analysis applications. On mid-range iOS and Android devices, it achieves an average inference speed of **1ms per frame**, delivering real-time performance without compromising accuracy.

![landmark](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/lmk.jpg)

## Usage

::: code-tabs#shell

@tab Python

```python
faces = session.get_face_dense_landmark(image)
for face in faces:
    landmarks = session.face_landmark(face)
```

@tab C

```c
HInt32 numOfLmk;
HFGetNumOfFaceDenseLandmark(&numOfLmk);
HPoint2f* denseLandmarkPoints = (HPoint2f*)malloc(sizeof(HPoint2f) * numOfLmk);
HFGetFaceDenseLandmarkFromFaceToken(multipleFaceData.tokens[index], denseLandmarkPoints, numOfLmk);
```

@tab C++

```cpp
auto dense_landmark = session->GetFaceDenseLandmark(result);
```

@tab Android

```java
Point2f[] lmk = InspireFace.GetFaceDenseLandmarkFromFaceToken(multipleFaceData.tokens[0]);
```

:::

## Landmark Points Order

We provide a set of dense facial landmarks based on a 106-point standard. The following diagram shows the mapping between landmark indices and their corresponding facial regions.

![landmark](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/hpylmkv2-order.jpg)

