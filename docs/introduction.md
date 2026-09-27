# Introduction

**InspireFace** is a powerful, cross-platform face recognition SDK written in C/C++ that enables high-performance facial analysis across a wide range of hardware platforms. Designed for real-world deployment in mobile, embedded, and server-side environments, InspireFace provides a full pipeline for facial processing, from detection to recognition, with support for advanced features such as liveness detection, mask detection, facial attributes, and more.

---
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/banner.webp" alt="InspireFace face analysis, recognition, and liveness detection" width="2172" height="724" style="height: auto;" />

## Quick Start

### Try the Android Example App

Experience InspireFace on your Android device, including **commercial liveness detection demos powered by InspireFacePlus**.

<p>
  <a href="http://fir.tunm.top/pro/pz7b3dgv">
    <img src="/images/inspireface-android-example-app-download.png" alt="Scan the QR code to download the InspireFace Android example app" width="220" />
  </a>
</p>

**Scan the QR code to download the Android example app**, or [download the app directly](http://fir.tunm.top/pro/pz7b3dgv).

::: tip Try commercial liveness detection
Explore **Passive Liveness (PLUS)** and **Flash Liveness (PLUS)** from the app's **Anti-fraud** menu, listed as **Passive-RGB Liveness** and **Color liveness** with a **PLUS** badge. Both demos require an internet connection.

See the [Liveness Detection guide](./guides/liveness-detection.md) for all available approaches. For access to the commercial versions, [contact us](mailto:contact@insightface.ai?subject=InspireFace%20Commercial%20Liveness).
:::

---

## New Features: Real-Time Mobile Liveness Detection Algorithms [Plus]

Designed for **high accuracy** and **low power consumption**, **InspireFacePlus** introduces real-time **Flash Liveness** and **Passive Liveness** detection for **mobile and server-side applications**.

<div style="display: flex; flex-wrap: wrap; gap: 20px;">
  <figure style="flex: 1 1 280px; min-width: 0; margin: 0;">
    <img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/light_liveness.webp" alt="Flash Liveness PLUS using colored screen illumination for face verification" width="1536" height="1024" style="display: block; width: 100%; height: auto;" />
    <figcaption>Flash Liveness (PLUS)</figcaption>
  </figure>
  <figure style="flex: 1 1 280px; min-width: 0; margin: 0;">
    <img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="Passive Liveness PLUS verification while the user faces the camera" width="1536" height="1024" style="display: block; width: 100%; height: auto;" />
    <figcaption>Passive Liveness (PLUS)</figcaption>
  </figure>
</div>

[Explore the PLUS liveness features](./guides/liveness-detection.md#passive-liveness-plus).

---

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

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/blogs_box/o-10.gif" width="200" height="200"> <img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/o-4.gif" width="200" height="200"> <img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/out-8.gif" width="200" height="200">

---

## Flexible Deployment

InspireFace supports deployment across a broad set of hardware and platforms:

- **CPUs**: x86, ARM
- **GPUs**: NVIDIA CUDA & TensorRT
- **NPUs**: Rockchip NPUs (RV1109, RV1106, RK356x, RK3588)
- **ANE**: Apple Neural Engine (CoreML on macOS/iOS)
- **Platforms**: Linux, macOS, iOS, Android

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/deploy.webp" alt="InspireFace deployment across cloud, desktop, mobile, and embedded devices" width="1536" height="1024" style="height: auto;" />

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
