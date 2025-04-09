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

### Face Embeding

Get face Embeding is an important step in face recognition, comparison or face swap, which usually needs to be carried out after face detection or tracking:

```cpp
// Get face embedding
inspire::FaceEmbedding feature;
session.FaceFeatureExtract(process, results[0], feature, true);
```

### Face Comparison

Face comparison is the process of comparing two faces to determine if they are the same person.

```cpp
// Get face embedding
float res = -1.0f;
INSPIREFACE_FEATURE_HUB->CosineSimilarity(feature1.data, feature2.data, feature1.size, res);
```

## More

TODO