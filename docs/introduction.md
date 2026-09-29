# Introduction

InspireFace is a C/C++ SDK for processing faces in images and video. It detects faces, follows them between frames, extracts landmarks and embeddings, and runs optional analysis such as pose, quality and RGB liveness. Your application supplies the images, manages the camera and UI, and uses the returned results.

The same processing flow is available through C, C++, Python, Java, Android, HarmonyOS ArkTS, Objective-C and Swift. The Apple interfaces cover iOS and macOS, including image buffers, tracking, analysis, recognition and capture.

<figure>
<img class="doc-banner" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/banner.webp" alt="InspireFace detection, landmarks, recognition, liveness and deployment overview" width="2048" height="683" />
</figure>

## What a typical application does

1. Load a resource pack once when the application starts.
2. Create a session with the detection mode and optional features you need.
3. Submit an image or camera frame and receive a list of faces.
4. Use those faces to read landmarks, extract embeddings or run extra analysis.
5. Release frame resources, then release the session when the worker stops.

A face's **track ID** connects detections within a video session. To compare people across images or sessions, extract embeddings and compare them or search a gallery.

| Task | What you get | Read next |
| --- | --- | --- |
| Detection and tracking | Boxes, confidence, track IDs and track counts | [Sessions and tracking](./guides/tracking.md) |
| Landmarks and pose | Facial points and optional roll, yaw and pitch | [Landmarks](./guides/dense-landmark.md) |
| Recognition | An embedding and a comparison score | [Recognition](./guides/recognition.md) |
| Frame selection | Quality checks and a bounded set of capture candidates | [Face capture](./guides/face-capture.md) |
| Liveness and actions | RGB liveness scores, eye state and action flags | [Liveness detection](./guides/liveness-detection.md) |

<div class="doc-image-grid">
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/blogs_box/o-10.gif" alt="Head movement" width="200" height="200" loading="lazy" />
</figure>
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/o-4.gif" alt="Partial hand occlusion" width="240" height="240" loading="lazy" />
</figure>
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/out-8.gif" alt="Expression changes" width="200" height="200" loading="lazy" />
</figure>
</div>

## Quick Start

### Try the Android Example App

The Android app lets you try detection, tracking, recognition and liveness with a camera before integrating the SDK.

<div class="demo-download">
  <a class="no-external-link-icon" href="http://fir.tunm.top/pro/pz7b3dgv">
    <img src="/images/inspireface-android-example-app-download.png" alt="QR code for the InspireFace Android example app" width="176" height="176" />
  </a>
  <div>
    <p><a href="http://fir.tunm.top/pro/pz7b3dgv">Install the Android demo app</a>, or scan the QR code on your phone.</p>
    <p>Start with a well-lit face and follow the camera guide. The app's <strong>Anti-fraud</strong> menu includes silent and action-based liveness demos.</p>
    <p>The optional <strong>PLUS</strong> passive and flash demos use an online service and require an internet connection. See the <a href="./guides/liveness-detection.html#optional-plus-demos">liveness guide</a> for details.</p>
  </div>
</div>

For code, start with [a single-image Python example](./get-started.md) or the [complete C example](./using-with/c-cpp.md). Both run on local image files.

## New: mobile real-time liveness [Plus] {#new-mobile-real-time-liveness-plus}

Plus adds passive and flash liveness for real-time mobile capture and server-side verification, designed for high accuracy and low power use on mobile devices. Both use an ordinary RGB camera: passive capture asks the user to hold a frontal pose, while flash capture displays a sequence of screen colors.

<div class="doc-image-grid two-column">
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="Illustration of passive liveness capture with a phone" width="1536" height="1024" loading="lazy" />
<figcaption><strong>Passive Liveness [Plus]</strong>: collect consecutive valid frames without blink or head-turn prompts. <a href="./feature.html#passive-liveness-plus">Explore the feature</a>.</figcaption>
</figure>
<figure>
<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/light_liveness.webp" alt="Illustration of flash liveness capturing a face under changing screen colors" width="1536" height="1024" loading="lazy" />
<figcaption><strong>Flash Liveness [Plus]</strong>: coordinate screen colors with front-camera capture to record the face under changing illumination. <a href="./feature.html#flash-liveness-plus">Explore the feature</a>.</figcaption>
</figure>
</div>

The Android demos above currently use an online service for verification. Try them to see capture, waiting and result feedback together. The [Plus liveness guide](./guides/liveness-detection.md#optional-plus-demos) explains the capture sequence, device requirements and retry handling.

## Choose a language

| Interface | When to use it |
| --- | --- |
| [C API](./using-with/c-cpp.md) | Native applications, FFI bindings and integrations that need explicit ownership. It also works from C++. |
| [Python](./using-with/python.md) | Prototyping, scripts and services. NumPy arrays can be passed directly. |
| [C++](./using-with/cpp.md) | Applications that want `Session`, `Image` and `FrameProcess` objects. Build headers and libraries from the same version. |
| [Java](./using-with/java.md) | Desktop applications and services on a regular JVM, using a JAR and matching native libraries. |
| [Android](./using-with/android.md) | Java or Kotlin applications using the JNI wrapper. |
| [Objective-C / Swift](./using-with/apple.md) | Native Apple interfaces with NSError / throws, scoped buffer access and explicit cleanup. |
| [iOS](./using-with/ios.md) | Xcode integration, device and simulator builds, camera pixel buffers. |
| [macOS](./using-with/macos.md) | Intel and Apple Silicon apps, dynamic frameworks and native tools. |
| [HarmonyOS](./using-with/harmonyos.md) | ArkTS applications using the Node-API adapter in the source tree. |

## SDK, models and backends

An SDK library contains the runtime. A **resource pack** contains the models and their configuration. Both are needed. Start with a CPU build and the `Pikachu` pack unless you already have a target-specific deployment.

For hardware acceleration, use the SDK build and resource pack for your target backend, and install its runtime dependencies. The [model pack guide](./guides/models-and-builds.md) explains how to match them.

InspireCV handles image operations and preprocessing. Its standalone [Image and Task APIs](./guides/inspirecv.md) are useful even when an application does not need face recognition.

Prebuilt **1.2.4** SDKs are available for Linux, Android, Apple and HarmonyOS; see [Overview and downloads](./build/README.md) for the packages and integration paths. To compile your own SDK, choose a [platform build guide](./build/README.md#choose-a-build-guide); replacing Python’s `.so`/`.dylib` and creating a wheel have a [dedicated chapter](./build/python.md).

## About these examples

The native and Java examples use InspireFace **1.2.4**; image-processing examples use InspireCV **1.0.2**. Python examples use the **1.2.4.post1 PyPI package**, which includes the 1.2.4 native SDK and supports snapshots, capture and diagnostics. Android examples use **1.2.4.post1**, including capture, snapshots and the complete Java API. When using a custom native build, keep its wrappers and headers matched to the library.

Check the [SDK releases](https://github.com/HyperInspire/InspireFace/releases) and [Python package files](https://pypi.org/project/inspireface/#files) for your platform. The [troubleshooting guide](./guides/troubleshooting.md#identify-the-loaded-sdk) shows how to inspect the version actually loaded by your application.

## Documentation version {#documentation-version}

<script setup>
const docsRelease = __DOCS_RELEASE__
</script>

Current documentation: **{{ docsRelease.version }}** — SDK **{{ docsRelease.sdkVersion }}**, documentation revision **{{ docsRelease.revision }}**.

The version beside the site name follows `SDK version.dN`. The SDK part comes from the development source covered by these guides; `dN` counts documentation releases for that SDK version. Each documentation update increments the count by one. When the guides move to a new SDK version, the count starts again at `d1`.

Prebuilt SDKs and Python packages have their own release versions. Check [Overview and downloads](./build/README.md) when choosing a package.
