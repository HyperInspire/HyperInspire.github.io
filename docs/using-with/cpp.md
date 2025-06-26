# Using InspireFace in C++

We provide C++ header files as interfaces, and the C++ API provides faster and easier interface operations than CAPI.

::: tip
In the case of **InspireFace>=1.2.1**, the C++ API was only available in the release precompile library.
:::

## Installation and Setup

You can download the precompiled inspireface library from the [release page](https://github.com/HyperInspire/InspireFace/releases), which includes the dynamic library +CAPI header by default. You need to link and include them in your project, using cmake as an example:

```cmake
# Prepare your inspireface-sdk directory in advance
set(INSPIREFACE_DIR your_dir/InspireFace)
include_directories(${INSPIREFACE_DIR}/include)
link_directories(${INSPIREFACE_DIR}/lib)

# Link to your project
target_link_libraries(YourProject InspireFace)
```

## Initialization

Global initialization of InspireFace is necessary. You only need to perform it once when the program starts. The initialization includes functions such as configuration reading and model loading.

```cpp
#include <inspireface/inspireface.hpp>

// Global initialization is call only once
INSPIREFACE_CONTEXT->Load("test_res/pack/Pikachu");
```

## Face Algorithm Session

InspireFace's facial analysis algorithms are all concentrated in the session. You can use the session instance to perform **face recognition**, **face embedding extraction**, **face detection**, **face tracking**, **landmark localization**, **liveness detection**, **head pose estimation**, **attribute recognition**, and other functions. 

Since the session contains some cache, **we recommend** using one session within a thread, and **we don't recommend** cross-using internal data from multiple sessions in tracking mode, as this can easily cause confusion. Sessions can be freely created and destroyed anywhere.


### Create Session

When creating a session, there are some important parameters that need to be specified: 

- **Option**: Features that need to be turned on, such as face recognition, mask detection, face attributes. This step will increase the memory used by the session
- **Detect Mode**:
    - **Always Detection**: Face detection is performed each time, usually for image input or scenes where faces do not need to be tracked
    - **Light Tracking**: Lightweight face tracking algorithm, support input frame sequence tracking face, tracking speed is extremely fast
    - **Tracking by Detection**: With detector-dependent tracking, detection is performed every frame, with low speed and high precision
- **Max Faces**: Limit the maximum number of faces to detect, if the number of faces is too large, the algorithm will be slow
- **Detect Pixel Level**: Face detector level, the higher the more accurate, but also affect the execution speed, usually 160, 192, 256, 320, 640

::: warning
When creating a session, it will use device memory, and as more options are enabled, the memory usage increases. Appropriately disabling some unnecessary features can save memory.
:::

```cpp
// Turn on some features
inspire::CustomPipelineParameter param;
param.enable_recognition = true;
param.enable_liveness = true;
param.enable_mask_detect = true;
param.enable_face_attribute = true;
param.enable_face_quality = true;

// Create a session
inspire::Session session = inspire::Session::Create(
    inspire::DetectModuleMode::DETECT_MODE_ALWAYS_DETECT, 1, param);

// or 

// Creates a pointer to a session
std::shared_ptr<inspire::Session> session(inspire::Session::CreatePtr(
    inspire::DetectModuleMode::DETECT_MODE_ALWAYS_DETECT, 1, param));
```

### Face Detection

Face detection is the first step in the analysis of faces, which requires the input of an image or frame:

```cpp
// Read an image locally as bitmap(BGR888)
inspirecv::Image image = inspirecv::Image::Create(image_path);
// Create a FrameProcess for processing image formats and rotating data
inspirecv::FrameProcess process =
    inspirecv::FrameProcess::Create(image.Data(), image.Height(), image.Width(), inspirecv::BGR, inspirecv::ROTATION_0);

// Create an object to store the result
std::vector<inspire::FaceTrackWrap> results;
int32_t ret;
// Execute face detection algorithm
ret = session.FaceDetectAndTrack(process, results);
if (ret != 0) {
    std::cerr << "FaceDetectAndTrack failed" << std::endl;
    return ret;
}
for (auto& result : results) {
    std::cout << "result: " << result.trackId << std::endl;
    std::cout << "quality: " << result.quality[0] << ", " << result.quality[1] << ", " << result.quality[2] << ", " << result.quality[3] << ", "
                << result.quality[4] << std::endl;
    inspirecv::Rect2i rect = inspirecv::Rect2i::Create(result.rect.x, result.rect.y, result.rect.width, result.rect.height);
    image.DrawRect(rect, inspirecv::Color::Red);
}
// Plot result
image.Write("result.jpg");
```

### Face Landmark

Face landmark prediction can be used in any detection mode state, but it should be noted that if the detection mode is in **TRACK** state, you will get smoother facial landmark points. This is because the internal face tracking state landmark optimization filtering has been integrated. We provide two solutions: 5 basic key points and denser key points (more than 100 points).

```c
inspire::FaceTrackWrap result = results[0];
std::vector<inspirecv::Point2f> landmark = session->GetFaceDenseLandmark(result);
```

### Face Embeding

Get face Embeding is an important step in face recognition, comparison or face swap, which usually needs to be carried out after face detection or tracking:

```cpp
// Get face embedding
inspire::FaceEmbedding feature;
session.FaceFeatureExtract(process, results[0], feature, true);
```

### Face Pose Estimation

When you create a session with the **enable_face_pose** option enabled, you can obtain face pose Euler angle values from the returned MultipleFaceData during face detection or tracking:

- **HFFaceEulerAngle**:
    - **roll**: Head rotation around the Z-axis (tilting left/right)
    - **yaw**: Head rotation around the Y-axis (turning left/right)  
    - **pitch**: Head rotation around the X-axis (nodding up/down)

```c
std::cout << "yaw: " << result.face3DAngle.yaw << ", pitch: " << result.face3DAngle.pitch << ", roll: " << result.face3DAngle.roll << std::endl;
```

### Face Comparison

Face comparison is the process of comparing two faces to determine if they are the same person.

```cpp
// Get face embedding
float res = -1.0f;
INSPIREFACE_FEATURE_HUB->CosineSimilarity(feature1.data, feature2.data, feature1.size, res);
```

## Face Pipeline

If you want to access facial attribute functions such as Anti-Spoofing, mask detection, quality detection, and facial motion recognition, you need to call the Pipeline interface to execute these functions.

### Execute the Face Pipeline

To execute the Pipeline function, you need to first perform face detection or tracking to obtain **FaceTrackWrap**, select the face you want to execute the pipeline on as input parameters, and configure the corresponding Option for the functions you want to call.

All functions require only one pipeline interface call, which simplifies frequent calling scenarios.

::: warning
Ensure that the Option is included when creating the Session. The executed Option must be a subset of or identical to the Session's Option. If the execution exceeds the configured Session Option functionality scope, it will fail to execute!
:::

```cpp
ret = session->MultipleFacePipelineProcess(process, param, results);
INSPIREFACE_CHECK_MSG(ret == 0, "MultipleFacePipelineProcess failed");
```

### Face RGB Anti-Spoofing

When you configure and execute a Pipeline with the Option containing **enable_liveness**, you can obtain the RGB Anti-Spoofing detection confidence through the following method:

```cpp
std::vector<float> confidence = session->GetRGBLivenessConfidence();
```

### Face Mask Detection

When you configure and execute a Pipeline with the Option containing **enable_mask_detect**, you can obtain the face mask detection confidence through the following method:

```cpp
std::vector<float> confidence = session->GetFaceMaskConfidence();
```

### Face Quality Prediction

When you configure and execute a Pipeline with the Option containing **enable_face_quality**, you can obtain face quality through the following method. This is a comprehensive confidence score based on attributes that affect clarity such as blur, occlusion, and lighting:

```cpp
std::vector<float> confidence = session->GetFaceQualityConfidence();
```

### Eyes State Prediction

When you configure and execute a Pipeline with the Option containing **enable_interaction_liveness**, you can obtain the static action state of the current frame through the following method (currently only supports eye state):

- **left_eye_status_confidence**: Left eye state: confidence close to 1 means open, close to 0 means closed.
- **right_eye_status_confidence**: Right eye state: confidence close to 1 means open, close to 0 means closed.

```cpp
std::vector<FaceInteractionState> states = session->GetFaceInteractionState();
```

### Face Interactions Action Detection

When you configure and execute a Pipeline with the Option containing **enable_interaction_liveness** and are in **TRACK** mode, you can obtain a series of facial actions calculated through consecutive sequence frames through the following method. These are typically used for interactive scenarios such as combining with liveness detection:

- **normal**: Normal state, no special actions
- **shake**: Head shaking action, moving head left and right
- **jawOpen**: Mouth opening action, opening the mouth
- **headRaise**: Head raising action, lifting the head upward
- **blink**: Blinking action, closing and opening the eyes

```cpp
std::vector<FaceInteractionAction> results = session->GetFaceInteractionAction();
```

### Face Emotion Prediction 

When you configure and execute a Pipeline with the Option containing **enable_face_emotion**, you can obtain facial expression recognition results through the API:

- **emotion**: Detected facial emotion type, returns corresponding integer values:
  - 0: Neutral
  - 1: Happy
  - 2: Sad
  - 3: Surprise
  - 4: Fear
  - 5: Disgust
  - 6: Anger

```cpp
std::vector<FaceEmotionResult> results = session->GetFaceEmotionResult();
```

### Face Attribute Prediction

When you configure and execute a Pipeline with the Option containing **enable_face_attribute**, you can obtain facial attribute recognition results through the API, including race, gender, and age bracket:

- **race**: Detected facial race type, returns corresponding integer values:
  - 0: Black
  - 1: Asian
  - 2: Latino/Hispanic
  - 3: Middle Eastern
  - 4: White

- **gender**: Detected facial gender, returns corresponding integer values:
  - 0: Female
  - 1: Male

- **ageBracket**: Detected facial age bracket, returns corresponding integer values:
  - 0: 0-2 years old
  - 1: 3-9 years old
  - 2: 10-19 years old
  - 3: 20-29 years old
  - 4: 30-39 years old
  - 5: 40-49 years old
  - 6: 50-59 years old
  - 7: 60-69 years old
  - 8: More than 70 years old

```cpp
std::vector<FaceAttributeResult> results = session->GetFaceAttributeResult();
```

## Face Embedding Database

We provide a lightweight face embedding vector database (**FeatureHub**) storage solution that includes basic functions such as adding, deleting, modifying, and searching, while supporting both **memory** and **persistent** storage modes.

::: tip
Although we provide a lightweight vector storage and retrieval function, it is not necessary. If it cannot meet your performance requirements, we encourage you to manage the face embeddings yourself.
:::

Before starting FeatureHub, you need to be familiar with the following parameters:

- **primary_key_mode**: Primary key mode, with two modes available. It's recommended to use HF_PK_AUTO_INCREMENT by default
  - HF_PK_AUTO_INCREMENT: Auto-increment mode for primary keys
  - HF_PK_MANUAL_INPUT: Manual input mode for primary keys, requiring users to avoid duplicate primary keys themselves
- **enable_persistence**: Whether to enable persistent database storage mode
  - If true: The database will write to local files for persistent storage during usage
  - If false: High-speed memory management mode, dependent on program lifecycle
- **persistence_db_path**: Storage path required only for persistent mode, defined by the user. If the input is a folder rather than a file, the system default file naming will be used
- **recognition_threshold**: Face search threshold, using floating-point numbers. During search, only embeddings above the threshold are searched. Different models and scenarios require manual threshold settings
- **search_mode**: Search mode, **effective only when searching for top-1 face**, with EAGER and EXHAUSTIVE modes (**this feature is temporarily disabled in the current version**)
  - HF_SEARCH_MODE_EAGER: Complete search immediately upon encountering the first face above the threshold
  - HF_SEARCH_MODE_EXHAUSTIVE: Search all similar faces and return the one with the highest similarity


### Enable/Disable FeatureHub

Using thread-safe singleton pattern design, it has global scope and only needs to be opened once:

### Search Most Similar Face

Input a face embedding to be queried and search for a face ID from FeatureHub that is above the threshold (Cosine similarity).

### Search Top-K Faces

Search for the top K faces with the highest similarity. Note that the data obtained by the `SearchFaceFeatureTopK` interface is cached data, and you need to retrieve all the result data you need before the next call, otherwise the next call will overwrite the historical data.

### Delete Face Embedding

Specify a face ID to delete that face from FeatureHub.

### Update Face Embedding

You can replace the existing feature vectors in the database through the update interface.

### Get Face Embedding from ID

You can quickly obtain FaceFeatureIdentity related information through a face ID.
