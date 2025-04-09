# Using InspireFace in C/C++

Whether it is C or C++, we recommend the use of a single CAPI header file + lib, because CAPI long-term maintenance is relatively stable, of course, there are C++ interfaces, specific reference to C++ header files.

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

```c
// Import header file
#include <inspireface.h>

// Initialization at the beginning of the program
std::string resourcePath = "test_res/pack/Pikachu";
HResult ret = HFReloadInspireFace(resourcePath.c_str());
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Failed to launch InspireFace: %d", ret);
    return 1;
}

...

// When you don't need it (you can ignore it)
HFTerminateInspireFace();
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

```c
// Enable the functions: face recognition, mask detection, live detection, and face quality
// detection
HOption option = HF_ENABLE_FACE_RECOGNITION | HF_ENABLE_QUALITY | HF_ENABLE_MASK_DETECT | HF_ENABLE_LIVENESS | HF_ENABLE_DETECT_MODE_LANDMARK;
// Non-video or frame sequence mode uses IMAGE-MODE, which is always face detection without
// tracking
HFDetectMode detMode = HF_DETECT_MODE_ALWAYS_DETECT;
// Maximum number of faces detected
HInt32 maxDetectNum = 20;
// Face detection image input level
HInt32 detectPixelLevel = 160;
// Handle of the current face SDK algorithm context
HFSession session = {0};
ret = HFCreateInspireFaceSessionOptional(option, detMode, maxDetectNum, detectPixelLevel, -1, &session);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Create FaceContext error: %d", ret);
    return ret;
}
```

⚠️Note: When you do not need to use the session, it is **important** to destroy it, otherwise it will cause memory leaks:

```c
// The memory must be freed at the end of the program
ret = HFReleaseInspireFaceSession(session);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Release session error: %d", ret);
    return ret;
}
```

### Face Detection

Face detection is the first step in the analysis of faces, which requires the input of an image or frame:

```c
// Load a image
HFImageBitmap image;
ret = HFCreateImageBitmapFromFilePath(sourcePath, 3, &image);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "The source entered is not a picture or read error.");
    return ret;
}
// Prepare an image parameter structure for configuration
HFImageStream imageHandle = {0};
ret = HFCreateImageStreamFromImageBitmap(image, HF_CAMERA_ROTATION_0, &imageHandle);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Create ImageStream error: %d", ret);
    return ret;
}

// Execute HF_FaceContextRunFaceTrack captures face information in an image
HFMultipleFaceData multipleFaceData = {0};
ret = HFExecuteFaceTrack(session, imageHandle, &multipleFaceData);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Execute HFExecuteFaceTrack error: %d", ret);
    return ret;
}

// Print the number of faces detected
auto faceNum = multipleFaceData.detectedNum;
HFLogPrint(HF_LOG_INFO, "Num of face: %d", faceNum);

// Copy a new image to draw
HFImageBitmap drawImage = {0};
ret = HFImageBitmapCopy(image, &drawImage);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Copy ImageBitmap error: %d", ret);
    return ret;
}
HFImageBitmapData data;
ret = HFImageBitmapGetData(drawImage, &data);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get ImageBitmap data error: %d", ret);
    return ret;
}
for (int index = 0; index < faceNum; ++index) {
    HFImageBitmapDrawRect(drawImage, multipleFaceData.rects[index], {0, 100, 255}, 4);
    // Print FaceID, In IMAGE-MODE it is changing, in VIDEO-MODE it is fixed, but it may be lost
    HFLogPrint(HF_LOG_INFO, "FaceID: %d", multipleFaceData.trackIds[index]);
    // Print Head euler angle, It can often be used to judge the quality of a face by the Angle
    // of the head
    HFLogPrint(HF_LOG_INFO, "Roll: %f, Yaw: %f, Pitch: %f", multipleFaceData.angles.roll[index], multipleFaceData.angles.yaw[index],
                multipleFaceData.angles.pitch[index]);
}
HFImageBitmapWriteToFile(drawImage, "draw_detected.jpg");
HFLogPrint(HF_LOG_WARN, "Write to file success: %s", "draw_detected.jpg");

ret = HFReleaseImageStream(imageHandle);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Release image stream error: %d", ret);
}
// The memory must be freed at the end of the program
ret = HFReleaseInspireFaceSession(session);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Release session error: %d", ret);
    return ret;
}

ret = HFReleaseImageBitmap(image);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Release image bitmap error: %d", ret);
    return ret;
}

ret = HFReleaseImageBitmap(drawImage);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Release draw image bitmap error: %d", ret);
    return ret;
}
```

### Face Embeding

Get face Embeding is an important step in face recognition, comparison or face swap, which usually needs to be carried out after face detection or tracking:

```c
// Execute face tracking on the image
HFMultipleFaceData multipleFaceData = {0};
ret = HFExecuteFaceTrack(session, stream, &multipleFaceData);  // Track faces in the image
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Run face track error: %d", ret);
    return ret;
}
if (multipleFaceData.detectedNum == 0) {  // Check if any faces were detected
    HFLogPrint(HF_LOG_ERROR, "No face was detected");
    return ret;
}

float embedding[512];
// Extract facial features from the first detected face, an interface that uses copy features in a comparison scenario
ret = HFFaceFeatureExtractCpy(session, stream, multipleFaceData.tokens[0], embedding);  // Extract features
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Extract feature error: %d", ret);
    return ret;
}
```

## Face Feature Management

TODO

## Other Feature

TODO

## [Example] Face Pipeline

Provide a complete example of the program including face detection, landmark location and face attribute recognition:

```c
#include <iostream>
#include <inspireface.h>

int main(int argc, char* argv[]) {
    // Check whether the number of parameters is correct
    if (argc < 3 || argc > 4) {
        HFLogPrint(HF_LOG_ERROR, "Usage: %s <pack_path> <source_path> [rotation]", argv[0]);
        return 1;
    }

    auto packPath = argv[1];
    auto sourcePath = argv[2];
    int rotation = 0;

    // If rotation is provided, check and set the value
    if (argc == 4) {
        rotation = std::atoi(argv[3]);
        if (rotation != 0 && rotation != 90 && rotation != 180 && rotation != 270) {
            HFLogPrint(HF_LOG_ERROR, "Invalid rotation value. Allowed values are 0, 90, 180, 270.");
            return 1;
        }
    }
    HFRotation rotation_enum;
    // Set rotation based on input parameter
    switch (rotation) {
        case 90:
            rotation_enum = HF_CAMERA_ROTATION_90;
            break;
        case 180:
            rotation_enum = HF_CAMERA_ROTATION_180;
            break;
        case 270:
            rotation_enum = HF_CAMERA_ROTATION_270;
            break;
        case 0:
        default:
            rotation_enum = HF_CAMERA_ROTATION_0;
            break;
    }

    HFLogPrint(HF_LOG_INFO, "Pack file Path: %s", packPath);
    HFLogPrint(HF_LOG_INFO, "Source file Path: %s", sourcePath);
    HFLogPrint(HF_LOG_INFO, "Rotation: %d", rotation);

    HFSetLogLevel(HF_LOG_INFO);

    HResult ret;
    // The resource file must be loaded before it can be used
    ret = HFLaunchInspireFace(packPath);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Load Resource error: %d", ret);
        return ret;
    }

    // Enable the functions in the pipeline: mask detection, live detection, and face quality
    // detection
    HOption option = HF_ENABLE_QUALITY | HF_ENABLE_MASK_DETECT | HF_ENABLE_LIVENESS | HF_ENABLE_DETECT_MODE_LANDMARK;
    // Non-video or frame sequence mode uses IMAGE-MODE, which is always face detection without
    // tracking
    HFDetectMode detMode = HF_DETECT_MODE_ALWAYS_DETECT;
    // Maximum number of faces detected
    HInt32 maxDetectNum = 20;
    // Face detection image input level
    HInt32 detectPixelLevel = 160;
    // Handle of the current face SDK algorithm context
    HFSession session = {0};
    ret = HFCreateInspireFaceSessionOptional(option, detMode, maxDetectNum, detectPixelLevel, -1, &session);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Create FaceContext error: %d", ret);
        return ret;
    }

    HFSessionSetTrackPreviewSize(session, detectPixelLevel);
    HFSessionSetFilterMinimumFacePixelSize(session, 4);

    // Load a image
    HFImageBitmap image;
    ret = HFCreateImageBitmapFromFilePath(sourcePath, 3, &image);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "The source entered is not a picture or read error.");
        return ret;
    }
    // Prepare an image parameter structure for configuration
    HFImageStream imageHandle = {0};
    ret = HFCreateImageStreamFromImageBitmap(image, rotation_enum, &imageHandle);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Create ImageStream error: %d", ret);
        return ret;
    }

    // Execute HF_FaceContextRunFaceTrack captures face information in an image
    HFMultipleFaceData multipleFaceData = {0};
    ret = HFExecuteFaceTrack(session, imageHandle, &multipleFaceData);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Execute HFExecuteFaceTrack error: %d", ret);
        return ret;
    }

    // Print the number of faces detected
    auto faceNum = multipleFaceData.detectedNum;
    HFLogPrint(HF_LOG_INFO, "Num of face: %d", faceNum);

    // Copy a new image to draw
    HFImageBitmap drawImage = {0};
    ret = HFImageBitmapCopy(image, &drawImage);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Copy ImageBitmap error: %d", ret);
        return ret;
    }
    HFImageBitmapData data;
    ret = HFImageBitmapGetData(drawImage, &data);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Get ImageBitmap data error: %d", ret);
        return ret;
    }
    for (int index = 0; index < faceNum; ++index) {
        HFLogPrint(HF_LOG_INFO, "========================================");
        HFLogPrint(HF_LOG_INFO, "Token size: %d", multipleFaceData.tokens[index].size);
        HFLogPrint(HF_LOG_INFO, "Process face index: %d", index);
        HFLogPrint(HF_LOG_INFO, "DetConfidence: %f", multipleFaceData.detConfidence[index]);
        HFImageBitmapDrawRect(drawImage, multipleFaceData.rects[index], {0, 100, 255}, 4);

        // Print FaceID, In IMAGE-MODE it is changing, in VIDEO-MODE it is fixed, but it may be lost
        HFLogPrint(HF_LOG_INFO, "FaceID: %d", multipleFaceData.trackIds[index]);

        // Print Head euler angle, It can often be used to judge the quality of a face by the Angle
        // of the head
        HFLogPrint(HF_LOG_INFO, "Roll: %f, Yaw: %f, Pitch: %f", multipleFaceData.angles.roll[index], multipleFaceData.angles.yaw[index],
                   multipleFaceData.angles.pitch[index]);

        HInt32 numOfLmk;
        HFGetNumOfFaceDenseLandmark(&numOfLmk);
        HPoint2f denseLandmarkPoints[numOfLmk];
        ret = HFGetFaceDenseLandmarkFromFaceToken(multipleFaceData.tokens[index], denseLandmarkPoints, numOfLmk);
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "HFGetFaceDenseLandmarkFromFaceToken error!!");
            return -1;
        }
        for (size_t i = 0; i < numOfLmk; i++) {
            HFImageBitmapDrawCircleF(drawImage, {denseLandmarkPoints[i].x, denseLandmarkPoints[i].y}, 0, {100, 100, 0}, 2);
        }
        auto& rt = multipleFaceData.rects[index];
        float area = ((float)(rt.height * rt.width)) / (data.width * data.height);
        HFLogPrint(HF_LOG_INFO, "area: %f", area);

        HPoint2f fiveKeyPoints[5];
        ret = HFGetFaceFiveKeyPointsFromFaceToken(multipleFaceData.tokens[index], fiveKeyPoints, 5);
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "HFGetFaceFiveKeyPointsFromFaceToken error!!");
            return -1;
        }
        for (size_t i = 0; i < 5; i++) {
            HFImageBitmapDrawCircleF(drawImage, {fiveKeyPoints[i].x, fiveKeyPoints[i].y}, 0, {0, 0, 232}, 2);
        }
    }
    HFImageBitmapWriteToFile(drawImage, "draw_detected.jpg");
    HFLogPrint(HF_LOG_WARN, "Write to file success: %s", "draw_detected.jpg");

    // Run pipeline function
    // Select the pipeline function that you want to execute, provided that it is already enabled
    // when FaceContext is created!
    auto pipelineOption = HF_ENABLE_QUALITY | HF_ENABLE_MASK_DETECT | HF_ENABLE_LIVENESS;
    // In this loop, all faces are processed
    ret = HFMultipleFacePipelineProcessOptional(session, imageHandle, &multipleFaceData, pipelineOption);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Execute Pipeline error: %d", ret);
        return ret;
    }

    // Get mask detection results from the pipeline cache
    HFFaceMaskConfidence maskConfidence = {0};
    ret = HFGetFaceMaskConfidence(session, &maskConfidence);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Get mask detect result error: %d", ret);
        return -1;
    }

    // Get face quality results from the pipeline cache
    HFFaceQualityConfidence qualityConfidence = {0};
    ret = HFGetFaceQualityConfidence(session, &qualityConfidence);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Get face quality result error: %d", ret);
        return -1;
    }

    for (int index = 0; index < faceNum; ++index) {
        HFLogPrint(HF_LOG_INFO, "========================================");
        HFLogPrint(HF_LOG_INFO, "Process face index from pipeline: %d", index);
        HFLogPrint(HF_LOG_INFO, "Mask detect result: %f", maskConfidence.confidence[index]);
        HFLogPrint(HF_LOG_INFO, "Quality predict result: %f", qualityConfidence.confidence[index]);
        // We set the threshold of wearing a mask as 0.85. If it exceeds the threshold, it will be
        // judged as wearing a mask. The threshold can be adjusted according to the scene
        if (maskConfidence.confidence[index] > 0.85) {
            HFLogPrint(HF_LOG_INFO, "Mask");
        } else {
            HFLogPrint(HF_LOG_INFO, "Non Mask");
        }
    }

    ret = HFReleaseImageStream(imageHandle);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Release image stream error: %d", ret);
    }
    // The memory must be freed at the end of the program
    ret = HFReleaseInspireFaceSession(session);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Release session error: %d", ret);
        return ret;
    }

    ret = HFReleaseImageBitmap(image);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Release image bitmap error: %d", ret);
        return ret;
    }

    ret = HFReleaseImageBitmap(drawImage);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Release draw image bitmap error: %d", ret);
        return ret;
    }

    return 0;
}

```

## [Example] Face Comparison

Provide a complete example of a program that includes a 1:1 face comparison:

```c
#include <iostream>
#include <vector>
#include <inspireface.h>

int main(int argc, char* argv[]) {
    // Check whether the number of parameters is correct
    if (argc != 4) {
        HFLogPrint(HF_LOG_ERROR, "Usage: %s <pack_path> <img1_path> <img2_path>", argv[0]);
        return 1;
    }

    auto packPath = argv[1];
    auto imgPath1 = argv[2];
    auto imgPath2 = argv[3];

    HFLogPrint(HF_LOG_INFO, "Pack file Path: %s", packPath);
    HFLogPrint(HF_LOG_INFO, "Source file Path 1: %s", imgPath1);
    HFLogPrint(HF_LOG_INFO, "Source file Path 2: %s", imgPath2);

    HResult ret;
    // The resource file must be loaded before it can be used
    ret = HFLaunchInspireFace(packPath);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Load Resource error: %d", ret);
        return ret;
    }

    // Create a session for face recognition
    HOption option = HF_ENABLE_FACE_RECOGNITION;
    HFSession session;
    ret = HFCreateInspireFaceSessionOptional(option, HF_DETECT_MODE_ALWAYS_DETECT, 1, -1, -1, &session);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Create session error: %d", ret);
        return ret;
    }

    std::vector<char*> twoImg = {imgPath1, imgPath2};
    std::vector<std::vector<float>> vec(2, std::vector<float>(512));
    for (int i = 0; i < twoImg.size(); ++i) {
        HFImageBitmap imageBitmap = {0};
        ret = HFCreateImageBitmapFromFilePath(twoImg[i], 3, &imageBitmap);
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Create image bitmap error: %d", ret);
            return ret;
        }
        // Prepare image data for processing

        HFImageStream stream;
        ret = HFCreateImageStreamFromImageBitmap(imageBitmap, HF_CAMERA_ROTATION_0, &stream);  // Create an image stream for processing
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Create stream error: %d", ret);
            return ret;
        }

        // Execute face tracking on the image
        HFMultipleFaceData multipleFaceData = {0};
        ret = HFExecuteFaceTrack(session, stream, &multipleFaceData);  // Track faces in the image
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Run face track error: %d", ret);
            return ret;
        }
        if (multipleFaceData.detectedNum == 0) {  // Check if any faces were detected
            HFLogPrint(HF_LOG_ERROR, "No face was detected: %s", twoImg[i]);
            return ret;
        }

        // Extract facial features from the first detected face, an interface that uses copy features in a comparison scenario
        ret = HFFaceFeatureExtractCpy(session, stream, multipleFaceData.tokens[0], vec[i].data());  // Extract features
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Extract feature error: %d", ret);
            return ret;
        }

        ret = HFReleaseImageStream(stream);
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Release image stream error: %d", ret);
        }
        ret = HFReleaseImageBitmap(imageBitmap);
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Release image bitmap error: %d", ret);
            return ret;
        }
    }

    // Make feature1
    HFFaceFeature feature1 = {0};
    feature1.data = vec[0].data();
    feature1.size = vec[0].size();

    // Make feature2
    HFFaceFeature feature2 = {0};
    feature2.data = vec[1].data();
    feature2.size = vec[1].size();

    // Run comparison
    HFloat similarity;
    ret = HFFaceComparison(feature1, feature2, &similarity);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Feature comparison error: %d", ret);
        return ret;
    }

    HFloat recommended_cosine_threshold;
    ret = HFGetRecommendedCosineThreshold(&recommended_cosine_threshold);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Get recommended cosine threshold error: %d", ret);
        return ret;
    }

    if (similarity > recommended_cosine_threshold) {
        HFLogPrint(HF_LOG_INFO, "%.3f > %.3f ✓ Same face", similarity, recommended_cosine_threshold);
    } else {
        HFLogPrint(HF_LOG_WARN, "%.3f < %.3f ✗ Different face", similarity, recommended_cosine_threshold);
    }
    HFLogPrint(HF_LOG_INFO, "Similarity score: %.3f", similarity);

    // Convert cosine similarity to percentage similarity.
    // Note: conversion parameters are not optimal and should be adjusted based on your specific use case.
    HFloat percentage;
    ret = HFCosineSimilarityConvertToPercentage(similarity, &percentage);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Convert similarity to percentage error: %d", ret);
        return ret;
    }
    HFLogPrint(HF_LOG_INFO, "Percentage similarity: %f", percentage);

    // The memory must be freed at the end of the program
    ret = HFReleaseInspireFaceSession(session);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Release session error: %d", ret);
        return ret;
    }
}
```

## More

TODO