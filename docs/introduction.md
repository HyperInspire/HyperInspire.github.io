# Introduction

**InspireFace** is a powerful, cross-platform face recognition SDK written in C/C++ that enables high-performance facial analysis across a wide range of hardware platforms. Designed for real-world deployment in mobile, embedded, and server-side environments, InspireFace provides a full pipeline for facial processing, from detection to recognition, with support for advanced features such as liveness detection, mask detection, facial attributes, and more.

---
![alt text](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/banner-side%20%282%29.png)


## Core Features

- **Face Detection** — Fast and accurate face localization in images and video streams.
- **Facial Landmarks** — High-precision alignment for downstream tasks.
- **Face Embeddings & Recognition** — Compact feature extraction and identity comparison.
- **Face Tracking** — Smooth tracking of faces across video frames.
- **Mask Detection & Liveness Check** — Identify whether a face is masked or spoofed.
- **Pose Estimation** — Euler angle (roll, pitch, yaw) calculation for each face.
- **Face Attribute Analysis** — Age, gender, and expression inference.
- **Expression & Action Detection** — Blink, nod, and head-shake detection for interactive apps.
- **Quality Assessment** — Image quality metrics to ensure robust inference.

<img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/blogs_box/o-10.gif" width="200" height="200"> <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/o-4.gif" width="200" height="200"> <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/out-8.gif" width="200" height="200">

---

## Flexible Deployment

InspireFace supports deployment across a broad set of hardware and platforms:

- **CPUs**: x86, ARM
- **GPUs**: NVIDIA CUDA & TensorRT
- **NPUs**: Rockchip NPUs (RV1109, RV1106, RK356x, RK3588)
- **ANE**: Apple Neural Engine (CoreML on macOS/iOS)
- **Platforms**: Linux, macOS, iOS, Android

---

## Ready-to-Use SDKs

- Python package via PyPI: `pip install inspireface`
- Android SDK via JitPack
- Precompiled C/C++ libraries
- Docker-based multi-platform builds
- React Native module via JSI/Nitro Modules

---

##  Performance

On Apple devices using ANE (e.g., iPhone 13), the full pipeline of **Face Detection + Alignment + Feature Extraction** completes in **<2ms**, making InspireFace ideal for real-time applications.

---

## Easy Integration

InspireFace is developer-friendly with bindings for:

- ✅ C/C++ (CAPI and C++ header interface)
- ✅ Python (ctypes interface and examples)
- ✅ Java / Android (JNI bindings)
- ✅ React Native (via `react-native-nitro-inspire-face`)

### Quick Python Example:

```python
import cv2
import inspireface as isf

session = isf.InspireFaceSession(isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_ALWAYS_DETECT)
image = cv2.imread("face.jpg")
faces = session.face_detection(image)
print(f"Detected {len(faces)} faces")

```

## Commercial Support

Need help integrating InspireFace into your product? Looking for high-accuracy models or custom deployment support?

📧 Contact: [contact@insightface.ai](mailto:contact@insightface.ai?subject=InspireFace)
