# Feature

This system provides a comprehensive set of face recognition features, covering the entire pipeline from basic face detection, facial landmark localization, and feature embedding extraction and comparison, to advanced capabilities such as face attribute analysis, pose estimation, and liveness detection. The table below details the hardware support for each feature across various platforms, including **CPU**, several **Rockchip NPUs (RKNPU)**, **Apple ANE**, and **TensorRT-based** GPUs.


With flexible module composition and broad **cross-platform** support, this system is well-suited for a wide range of face recognition applications, including access control, attendance tracking, identity verification, and security surveillance.

![alt text](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/fbanner.jpg)

## Face Tracking

<div style="display: flex; align-items: flex-start; gap: 20px;">

<div style="flex: 1;">

InspireFace SDK offers **Multi-Scale Face Detection** capabilities with input sizes of 160, 192, 256, 320, and 640, enabling flexible adaptation to a wide range of image resolutions and deployment scenarios. The SDK integrates a high-performance face detection module, a **lightweight tracking algorithm**, and a **tracking-by-detection strategy** to ensure accurate and robust face localization across various conditions. Face tracking is highly optimized, achieving millisecond-level latency, making it well-suited for real-time applications where speed and reliability are critical.

</div>

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/tracking.jpg" alt="tracking" style="max-width:250px;">
</div>

</div>


## Face Embedding


<div style="display: flex; align-items: flex-start; gap: 20px;">

<div style="flex: 1;">

InspireFace SDK integrates multiple state-of-the-art (SOTA) face recognition models, serving as the core technology foundation for applications such as face verification, face identification, and face swapping. The SDK offers a diverse set of models optimized for a wide range of platforms — from embedded systems and mobile devices to high-performance GPU environments — enabling flexible deployment across various use cases and hardware configurations.

</div>

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/embedding.jpg" alt="embedding" style="max-width:350px;">
</div>

</div>


## Face Attribute Analysis


<div style="display: flex; align-items: flex-start; gap: 20px;">

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/attribute.jpg" alt="attribute" style="max-width:200px;">
</div>

<div style="flex: 1;">

InspireFace SDK provides comprehensive facial attribute analysis, including **mask detection**, **ethnicity**, **age**, and **gender classification**. These capabilities enable the extraction of structured, high-level semantic information from faces, supporting advanced filtering, analytics, and decision-making processes in face-related applications.

</div>

</div>

## Face Recognition

<div style="display: flex; align-items: flex-start; gap: 20px;">

<div style="flex: 1;">

Powered by cutting-edge deep learning techniques, InspireFace SDK delivers high-precision face recognition built upon industry-proven models. Drawing on innovations aligned with leading open-source frameworks such as InsightFace — a top-ranked solution in global benchmarks like IJBC, LFW, and MegaFace — our face recognition module ensures robust performance across diverse environments. It serves as a solid foundation for identity verification, face comparison, and large-scale face retrieval applications.

</div>

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/recognition.jpg" alt="recognition" style="max-width:380px;">
</div>

</div>

## Face Quality Assessment


<div style="display: flex; align-items: flex-start; gap: 20px;">

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/quality.jpg" alt="quality" style="max-width:200px;">
</div>

<div style="flex: 1;">

We provide a face image quality assessment algorithm that helps automatically filter out low-quality faces, such as those that are **blurred**, **occluded**, **poorly lit**, or captured at **extreme angles**. This ensures that only high-confidence face samples are used in downstream tasks, significantly improving the accuracy and reliability of face recognition and analysis.

</div>

</div>

## Face Landmark

<div style="display: flex; align-items: flex-start; gap: 20px;">


We offer the latest **HyperLandmark V2**, a high-precision facial landmark detection model optimized for mobile devices. It is designed for seamless integration with AR cameras, beauty filters, and skin analysis applications. On mid-range iOS and Android devices, it achieves an average inference speed of **1ms per frame**, delivering real-time performance without compromising accuracy.

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/landmark.png" alt="landmark" style="max-width:200px;">
</div>

<div style="flex: 1;">

</div>

</div>

## Silent Liveness

Silent Liveness Detection enables robust anti-spoofing capabilities without requiring user interaction. By analyzing subtle facial cues and texture patterns, it can effectively distinguish between real human faces and presentation attacks such as photos, videos, or masks. This passive liveness detection approach enhances user experience by operating seamlessly in the background, making it ideal for secure, frictionless identity verification in scenarios like mobile onboarding, access control, and payment authentication.

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/liveness.jpg" alt="liveness" style="max-width:512px;">
</div>

## Head Pose Estimation

<div style="display: flex; align-items: flex-start; gap: 20px;">


High-precision head pose estimation accurately detects **yaw, pitch, and roll angles of the head**, enhancing face recognition, liveness detection, and AR/VR experiences. It is essential for applications requiring real-time responsiveness, such as driver monitoring, attention tracking, and identity verification.

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/pose.jpg" alt="pose" style="max-width:250px;">
</div>

<div style="flex: 1;">

</div>

</div>

## Cooperative Liveness


<div style="display: flex; align-items: flex-start; gap: 20px;">

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/act.jpg" alt="action" style="max-width:220px;">
</div>

Cooperative Liveness Detection uses sequential frame input to recognize facial expressions and head movements—such as blinking, mouth opening, or head turns—for active liveness verification. By guiding users through simple actions, it effectively resists spoofing attacks while ensuring a smooth and user-friendly experience, making it ideal for secure identity verification in scenarios like digital onboarding and access control.

<div style="flex: 1;">

</div>

</div>



## Embedding Management


<div style="display: flex; align-items: flex-start; gap: 20px;">



We provide a lightweight vector database designed for managing face embeddings, supporting efficient insertion, update, deletion, and fast similarity search. Optimized for performance and low resource consumption, it is well-suited for deployment on embedded systems and mobile devices, enabling reliable face recognition in edge environments.

<div style="flex: 0 0 auto;">
  <img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/db.jpg" alt="action" style="max-width:200px;">
</div>


<div style="flex: 1;">

</div>

</div>

---

## Hardware Support

To maximize performance, the system automatically selects the most efficient compute backend available on the current platform, prioritizing NPU or GPU acceleration where supported. If a hardware accelerator is not available, the system gracefully falls back to CPU computation to ensure functionality remains consistent and reliable.

| Feature | CPU | RKNPU<br/>(RV1109/1126) | RKNPU<br/>(RV1103/1106) | RKNPU<br/>(RK3566/3568/3588) | ANE<br/>(MacOS/iOS) | GPU<br/>(TensorRT) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Face Detection | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Landmark | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Face Embeddings | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Face Comparison | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | - | - | - | - |
| Face Recognition | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Alignment | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | - | - | - | - |
| Tracking | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Mask Detection | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | - |
| Silent Liveness | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | - |
| Face Quality | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Pose Estimation | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Face Attribute | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Cooperative Liveness | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) |
| Embedding Management | [![](https://img.shields.io/badge/%E2%9C%93-green)](#) | - | - | - | - | - |

- Some models and features that do **not support** NPU or GPU will **automatically use CPU** for computation when running the program.