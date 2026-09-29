# Features

InspireFace separates the common detection and tracking work from optional models. Start with a session that finds faces, then enable recognition, quality or other analysis only when you use those results.

This page maps each feature to the data it returns. Feature guides provide C API, C++, Java, Android, HarmonyOS, Python, Objective-C and Swift tabs where the wrapper supports the operation. Use the [API index](./guides/api-coverage.md) to find a workflow, or copy a program from [Complete examples](./guides/examples.md).

## Face Tracking

Use detection for unrelated photographs and tracking for a sequence of frames from the same camera. A tracking session keeps history, so reuse it for the sequence and feed frames in order. A new camera or a large discontinuity should start a new tracking history.

Each result includes a box, detection confidence, track ID and track count. Use the track ID to keep an overlay or application state attached to the same face within a video sequence. Use recognition when the application needs to identify someone across sessions.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/track.webp" alt="Several faces tracked with separate IDs and motion paths" width="1672" height="941" loading="lazy" />
<figcaption>Tracking associates boxes and IDs across consecutive frames from one camera.</figcaption>
</figure>

| Mode | Typical input | What changes |
| --- | --- | --- |
| Always detect | Photographs or unrelated frames | Runs detection on each call. |
| Light track | Continuous camera video | Uses temporal tracking between detector passes. |
| Track by detection | Video with detector-based association | Runs detection on every frame, then associates detections into tracks. |

The detector's input level controls the work done on each detection pass; it is independent of the camera resolution. The [tracking guide](./guides/tracking.md) explains detector levels, minimum face size and smoothing.

## Face Embedding

An embedding is a numeric representation extracted from a detected face. It is the input to face comparison and gallery search. The workflow detects the face, aligns it, then extracts the vector used for comparison.

Enable `HF_ENABLE_FACE_RECOGNITION` when creating the session, then extract an embedding from the **same image and face result**. Keep the source pixels available until extraction finishes.

```python
# session has HF_ENABLE_FACE_RECOGNITION enabled; image is a BGR array.
faces = session.face_detection(image)
if len(faces) == 1:
    embedding = session.face_feature_extract(image, faces[0])
```

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/feature.webp" alt="Face images represented as nearby and distant points in an embedding space" width="1672" height="941" loading="lazy" />
<figcaption>An illustration of face embeddings. The SDK compares embeddings with cosine similarity; the drawn positions and numbers are illustrative.</figcaption>
</figure>

Use one recognition model for a gallery. When switching models, re-extract the enrollment images and rebuild the gallery with the new vectors.

## Face Attribute Analysis

Optional models return mask scores, attribute categories and expression categories for each face. Read the score or category index, then map it to the labels used by the application. Clear, well-oriented face images give these models more usable input.

| Output | Session option | Result |
| --- | --- | --- |
| Mask | `HF_ENABLE_MASK_DETECT` | Mask confidence |
| Attributes | `HF_ENABLE_FACE_ATTRIBUTE` | Age bracket and model category indices |
| Expression | `HF_ENABLE_FACE_EMOTION` | Expression category index |

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/face_analysis.webp" alt="Face analysis with mask, expression, quality and pose outputs" width="1536" height="1024" loading="lazy" />
<figcaption>Display the selected analysis results together. Quality returns a score; attributes and expression use the label mappings in the analysis guide.</figcaption>
</figure>

Call the face pipeline after detection. The requested pipeline options must also have been enabled when the session was created. The [analysis guide](./guides/optional-analysis.md#read-analysis-results) shows how to read the outputs in each API, with the matching Android package setup. The [Python reference](./using-with/python.md#optional-analysis) includes the label order.

## Face Recognition

For one-to-one verification, compare two embeddings. For one-to-many identification, search a gallery. Both return a similarity score; your application decides which threshold and handling of uncertain matches fit the input conditions.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/search.webp" alt="A query face matched against a gallery of face images" width="1672" height="941" loading="lazy" />
<figcaption>A query embedding is compared with gallery entries; the chosen threshold determines which matches are returned.</figcaption>
</figure>

Start with the model’s recommended cosine threshold, then evaluate it on matched and unmatched pairs from your cameras. Compare the raw cosine score with that threshold; percentage conversion is for display.

For enrollment, select the intended face and check that the image is usable. For group photographs, let the user choose a face before extracting its embedding. See [recognition and FeatureHub](./guides/recognition.md) for a complete comparison example and gallery lifecycle.

## Face Quality Assessment

Quality assessment helps decide whether a face image is suitable for downstream processing. It is useful when choosing an enrollment image or waiting for a better camera frame. Enable `HF_ENABLE_QUALITY`, run the pipeline, and read the quality score for each face.

See the [analysis examples](./guides/optional-analysis.md#read-analysis-results) for quality, mask, attributes and pose together.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/quality.webp" alt="Clear, occluded and motion-blurred face images" width="1448" height="1086" loading="lazy" />
<figcaption>Compare the usable face area, occlusion and motion blur before choosing a capture for recognition.</figcaption>
</figure>

For capture, combine the quality score with sharpness, brightness, pose, face size, guide position and face count. The [face-capture module](./guides/face-capture.md) combines these checks over time and selects candidates.

## Face Landmark

Landmarks describe facial geometry. The SDK exposes five alignment points and a dense set of points through the detected face result. Typical uses include alignment, drawing an overlay and measuring motion between frames.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/lmk.webp" alt="Dense facial landmarks and an example facial animation" width="1536" height="1024" loading="lazy" />
<figcaption>Landmark coordinates support alignment and overlays. Apply the preview transform before drawing them on screen.</figcaption>
</figure>

Query the dense point count instead of allocating a hard-coded buffer in C. Point order belongs to the selected landmark engine; keep it consistent when a downstream system expects specific indices. Smoothing can reduce visible jitter in video, but adds lag to fast motion. See [landmarks and alignment](./guides/dense-landmark.md).

## Silent Liveness

RGB liveness produces a score from a face image without asking the user to perform an action. Enable `HF_ENABLE_LIVENESS`, run the pipeline on the detected faces, then read the RGB liveness scores.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="A face centered in a mobile RGB liveness capture guide" width="1536" height="1024" loading="lazy" />
<figcaption>RGB liveness starts with a usable face image. The application combines the score with capture quality and its own decision rules.</figcaption>
</figure>

Choose a liveness threshold using the target camera’s live captures, printed-photo presentations and screen replays. Include the expected lighting, face sizes and exposure conditions in that evaluation.

The [liveness guide](./guides/liveness-detection.md#rgb-anti-spoofing) explains the SDK flow and how it differs from action detection.

## Head Pose Estimation

Enable `HF_ENABLE_FACE_POSE` to obtain roll, yaw and pitch along with detection results. Use these angles for camera guidance, frontal-face filtering or an orientation overlay.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/pose.webp" alt="Head pose shown as pitch, yaw and roll in a mobile camera view" width="1448" height="1086" loading="lazy" />
<figcaption>Yaw, pitch and roll describe different axes of head rotation and can drive framing prompts.</figcaption>
</figure>

When drawing on a mirrored front-camera preview, transform the overlay consistently with the preview. Rotation and mirroring are different operations; see [image inputs and coordinates](./guides/image-inputs.md).

## Cooperative Liveness

The interaction module returns eye-state scores and temporal action flags, including blink, jaw opening, head shake and head raise. A guided flow can use these outputs to advance a challenge.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/action_liveness.webp" alt="A mobile camera flow progressing through facial action prompts" width="1536" height="1024" loading="lazy" />
<figcaption>Actions form a sequence: show the next prompt, observe the same track and handle completion or timeout before advancing.</figcaption>
</figure>

Use a tracking session and consecutive frames. The application manages prompts, timeouts and retries, and records action completion separately from the anti-spoofing result. See the [liveness guide](./guides/liveness-detection.md#facial-actions) for the complete interaction flow.

## Embedding Management

FeatureHub stores embeddings with numeric IDs. It supports insertion, update, removal, thresholded search and top-k search, with optional persistence. Keep names and other application records in your own storage and connect them using the returned ID.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/store.webp" alt="Face embeddings stored in a lightweight database and queried by vector similarity" width="1448" height="1086" loading="lazy" />
<figcaption>FeatureHub manages vectors and numeric IDs; application records remain in your own database.</figcaption>
</figure>

FeatureHub is shared by the process. Initialize it once for a gallery, then close it after the workers using it have stopped. Choose exhaustive search when you need the best match; eager search can stop at the first result that passes the threshold. See [the gallery example](./guides/recognition.md#store-and-search-a-gallery).

## Hardware Support

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/deploy.webp" alt="InspireFace deployed on desktop, mobile, embedded and server hardware" width="1536" height="1024" loading="lazy" />
<figcaption>Choose the SDK build and model pack for the target hardware. Supported analysis still depends on the selected pack and backend.</figcaption>
</figure>

Choose a backend supported by the target hardware and pair it with the appropriate model pack. Supported models use that backend; image handling, tracking logic and gallery search can also use the CPU.

| Target | SDK and pack choice | Setup |
| --- | --- | --- |
| Desktop, mobile or embedded CPU | CPU build with a compatible general pack such as Pikachu | [Models and builds](./guides/models-and-builds.md) |
| iOS / macOS CPU | Objective-C and Swift frameworks with a general CPU resource pack | [Apple APIs](./using-with/apple.md) · [iOS](./using-with/ios.md) · [macOS](./using-with/macos.md) |
| Apple CoreML | Apple-extension build and compatible Apple model resources | [iOS / Apple](./using-with/ios.md#apple-acceleration) |
| Rockchip NPU | RKNN build, matching SoC pack and board runtime | [Rockchip](./using-with/rknpu.md) |
| NVIDIA GPU | TensorRT build, compatible TensorRT/CUDA runtime and TRT pack | [CUDA / TensorRT](./using-with/cuda.md) |

## Optional liveness demos

InspireFacePlus adds two guided mobile verification flows: passive RGB capture and screen-light capture. In the Android example, the device handles face positioning and capture, then sends the completed round to the service for a liveness result. Both entries appear under **Anti-fraud** with a **PLUS** badge.

Integrate PLUS through its capture and service protocol. Use `HF_ENABLE_LIVENESS` for local RGB scoring, and run recognition or gallery matching as the identity step when needed.

### Passive Liveness (PLUS)

Passive liveness uses a short RGB sequence while the user looks at the front camera. There are no blink, head-turn or screen-flash prompts. This interaction suits a guided selfie step in enrollment or account verification when the user should only need to position the phone and hold still.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="Passive liveness with a face held inside the capture guide" width="1536" height="1024" loading="lazy" />
<figcaption>Passive capture: face the camera, keep still for the sequence, then wait for one result for the completed round.</figcaption>
</figure>

The Android demo waits for one steady face inside the guide before enabling **Start verification**. It collects **20 consecutive valid frames**, using local face detection and eye landmarks to prepare the inputs. If a short blur or movement breaks continuity, the contiguous segment starts again; face loss, multiple faces or a larger movement stops the round and asks for a new capture.

The completed sequence is submitted once. The service returns a verdict and score, or asks for another capture if it cannot reach a conclusion. The result covers the completed sequence. The local **Silent liveness** page provides a continuously refreshed single-frame score for comparison. See the [passive capture workflow](./guides/liveness-detection.md#passive-rgb-capture).

### Flash Liveness (PLUS)

Flash liveness coordinates front-camera capture with changes in the phone display. The user keeps still while the screen provides **white, red, green and blue** illumination. The service evaluates the captured light sequence; the application does not ask the user to imitate a facial action.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/light_liveness.webp" alt="Screen illumination during a face capture and a printed-photo presentation" width="1536" height="1024" loading="lazy" />
<figcaption>Screen-light capture records the face under controlled illumination. The display colors are synchronized with each capture phase.</figcaption>
</figure>

The demo first lets exposure and white balance settle under white light, locks both settings, and captures each illumination phase after it has settled. The phone screen supplies the illumination. The front camera must provide the exposure, white-balance and timestamp controls needed to keep the images aligned with the displayed colors; unsupported devices show a capability message before capture.

This flow fits a verification step where the application can control the display and camera together and the user can remain still through the light sequence. It needs more device coordination than passive capture, so test the actual target phones as part of integration. See the [flash capture workflow](./guides/liveness-detection.md#flash-capture) for the sequence, interruption handling and result states.

Both demo flows need a network connection. [Try the Android app](./introduction.md#try-the-android-example-app) to compare the interactions. For commercial access, contact [contact@insightface.ai](mailto:contact@insightface.ai) with the target platform and intended use.
