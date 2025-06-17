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

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pipeline.png">

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

![landmark](https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg)

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


### Face Landmark

Face landmark prediction can be used in any detection mode state, but it should be noted that if the detection mode is in **TRACK** state, you will get smoother facial landmark points. This is because the internal face tracking state landmark optimization filtering has been integrated. We provide two solutions: 5 basic key points and denser key points (more than 100 points).


```c
// Set landmark smoothing ratio (only effective in TRACK mode!)
HFSessionSetTrackModeSmoothRatio(session, 0.05);
// Set landmark cache frame count (only effective in TRACK mode!)
HFSessionSetTrackModeNumSmoothCacheFrame(session, 5);

HInt32 ret = HFExecuteFaceTrack(session, imageHandle, &multipleFaceData);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Execute HFExecuteFaceTrack error: %d", ret);
    return ret;
}
// Get the number of detected faces
HInt32 faceNum = multipleFaceData.detectedNum;

for (index = 0; index < faceNum; ++index) {
    HPoint2f* denseLandmarkPoints;
    HPoint2f fiveKeyPoints[5];

    // Get five basic key points
    ret = HFGetFaceFiveKeyPointsFromFaceToken(multipleFaceData.tokens[index], fiveKeyPoints, 5);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "HFGetFaceFiveKeyPointsFromFaceToken error!!");
        return -1;
    }

    /* Get the number of dense landmark points */
    HFGetNumOfFaceDenseLandmark(&numOfLmk);
    denseLandmarkPoints = (HPoint2f*)malloc(sizeof(HPoint2f) * numOfLmk);
    if (denseLandmarkPoints == NULL) {
        HFLogPrint(HF_LOG_ERROR, "Memory allocation failed!");
        return -1;
    }
    ret = HFGetFaceDenseLandmarkFromFaceToken(multipleFaceData.tokens[index], denseLandmarkPoints, numOfLmk);
    if (ret != HSUCCEED) {
        free(denseLandmarkPoints);
        HFLogPrint(HF_LOG_ERROR, "HFGetFaceDenseLandmarkFromFaceToken error!!");
        return -1;
    }
}
```

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/out-8.gif" width="200" height="200">

### Face Embeding

Get face Embeding is an important step in face recognition, comparison or face swap, which usually needs to be carried out after face detection or tracking.

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

// Extract facial features from the first detected face, an interface that uses copy features in a comparison scenario
HFFaceFeature feature;
ret = HFCreateFaceFeature(&feature);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Create face feature error: %d", ret);
    return ret;
}

...

// Not in use need to release
HFReleaseFaceFeature(&feature);
```

### Face Pose Estimation

When you create a session with the **HF_ENABLE_FACE_POSE** option enabled, you can obtain face pose Euler angle values from the returned MultipleFaceData during face detection or tracking:

- **HFFaceEulerAngle**:
    - **roll**: Head rotation around the Z-axis (tilting left/right)
    - **yaw**: Head rotation around the Y-axis (turning left/right)  
    - **pitch**: Head rotation around the X-axis (nodding up/down)

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/pose.jpg" alt="pose" style="max-width:250px;">

If you don't enable the **HF_ENABLE_FACE_POSE** option, you will get invalid values.

```c
for (int index = 0; index < multipleFaceData.detectedNum; ++index) {
    HFloat roll = multipleFaceData.angles.roll[index];
    HFloat yaw = multipleFaceData.angles.yaw[index];
    HFloat pitch = multipleFaceData.angles.pitch[index];
    
    HFLogPrint(HF_LOG_INFO, "face_index: %d, roll: %f, yaw: %f, pitch: %f", index, roll, yaw, pitch);
}
```

## Face Pipeline

If you want to access facial attribute functions such as Anti-Spoofing, mask detection, quality detection, and facial motion recognition, you need to call the Pipeline interface to execute these functions.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pip_bn.png" alt="quality" style="max-height:200px;">

### Execute the Face Pipeline

To execute the Pipeline function, you need to first perform face detection or tracking to obtain MultipleFaceData, select the face you want to execute the pipeline on as input parameters, and configure the corresponding Option for the functions you want to call.

All functions require only one pipeline interface call, which simplifies frequent calling scenarios.

::: warning
Ensure that the Option is included when creating the Session. The executed Option must be a subset of or identical to the Session's Option. If the execution exceeds the configured Session Option functionality scope, it will fail to execute!
:::

```c
/* Run pipeline function */
/* Select the pipeline function that you want to execute, provided that it is already enabled
    * when the session is created! */
pipelineOption = HF_ENABLE_QUALITY | HF_ENABLE_MASK_DETECT | HF_ENABLE_LIVENESS | HF_ENABLE_FACE_EMOTION | HF_ENABLE_INTERACTION;
/* In this pipeline, all faces are processed */
ret = HFMultipleFacePipelineProcessOptional(session, imageHandle, &multipleFaceData, pipelineOption);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Execute Pipeline error: %d", ret);
    return ret;
}
```

### Face RGB Anti-Spoofing

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_LIVENESS**, you can obtain the RGB Anti-Spoofing detection confidence through the following method:

```c
HFRGBLivenessConfidence livenessConfidence;
/* Get RGB liveness detection results from the pipeline cache */
ret = HFGetRGBLivenessConfidence(session, &livenessConfidence);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get RGB liveness result error: %d", ret);
    return -1;
}
```

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/liveness.jpg" alt="liveness" style="max-width:220px;">

### Face Mask Detection

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_MASK_DETECT**, you can obtain the face mask detection confidence through the following method:

```c
HFFaceMaskConfidence maskConfidence;
/* Get mask detection results from the pipeline cache */
ret = HFGetFaceMaskConfidence(session, &maskConfidence);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get mask detection result error: %d", ret);
    return -1;
}
```

### Face Quality Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_QUALITY**, you can obtain face quality through the following method. This is a comprehensive confidence score based on attributes that affect clarity such as blur, occlusion, and lighting:

```c
HFFaceQualityConfidence qualityConfidence;
/* Get face quality results from the pipeline cache */
ret = HFGetFaceQualityConfidence(session, &qualityConfidence);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get face quality result error: %d", ret);
    return -1;
}
```

### Eyes State Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_INTERACTION**, you can obtain the static action state of the current frame through the following method (currently only supports eye state):

- **leftEyeStatusConfidence**: Left eye state: confidence close to 1 means open, close to 0 means closed.
- **rightEyeStatusConfidence**: Right eye state: confidence close to 1 means open, close to 0 means closed.

```c
/* Get the facial interaction status */
HFFaceInteractionState result;
ret = HFGetFaceInteractionStateResult(session, &result);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get face interaction state result error: %d", ret);
    return -1;
}
```

### Face Interactions Action Detection

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_INTERACTION** and are in **TRACK** mode, you can obtain a series of facial actions calculated through consecutive sequence frames through the following method. These are typically used for interactive scenarios such as combining with liveness detection:

- **normal**: Normal state, no special actions
- **shake**: Head shaking action, moving head left and right
- **jawOpen**: Mouth opening action, opening the mouth
- **headRaise**: Head raising action, lifting the head upward
- **blink**: Blinking action, closing and opening the eyes

```c
// Get the interaction results of consecutive frame actions
HFFaceInteractionsActions result;
ret = HFGetFaceInteractionActionsResult(session, &result);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get the interaction results of consecutive frame actions error: %d", ret);
    return -1;
}

// Print the detected various action states
HFLogPrint(HF_LOG_INFO, "Face interactions - Normal: %d, Shake: %d, Jaw Open: %d, Head Raise: %d, Blink: %d",
           result.normal, result.shake, result.jawOpen, result.headRaise, result.blink);
```

### Face Emotion Prediction 

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_FACE_EMOTION**, you can obtain facial expression recognition results through the API:

- **emotion**: Detected facial emotion type, returns corresponding integer values:
  - 0: Neutral
  - 1: Happy
  - 2: Sad
  - 3: Surprise
  - 4: Fear
  - 5: Disgust
  - 6: Anger

```c
HFFaceEmotionResult faceEmotionResult;
ret = HFGetFaceEmotionResult(session, &faceEmotionResult);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get face emotion result error: %d", ret);
    return -1;
}

// Print the number of detected faces and emotion results
HFLogPrint(HF_LOG_INFO, "Number of faces: %d", faceEmotionResult.num);
for (int i = 0; i < faceEmotionResult.num; i++) {
    HFLogPrint(HF_LOG_INFO, "Face %d emotion: %d", i, faceEmotionResult.emotion[i]);
}
```

### Face Attribute Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_FACE_ATTRIBUTE**, you can obtain facial attribute recognition results through the API, including race, gender, and age bracket:

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

```c
HFFaceAttributeResult attributeResult;
ret = HFGetFaceAttributeResult(session, &attributeResult);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Get face attribute result error: %d", ret);
    return -1;
}

// Print the number of detected faces and attribute results
HFLogPrint(HF_LOG_INFO, "Number of faces: %d", attributeResult.num);
for (int i = 0; i < attributeResult.num; i++) {
    HFLogPrint(HF_LOG_INFO, "Face %d - Race: %d, Gender: %d, Age Bracket: %d", 
               i, attributeResult.race[i], attributeResult.gender[i], attributeResult.ageBracket[i]);
}
```

### [Example] Face Pipeline

Provide a complete example of the program including face detection, landmark location and face attribute recognition:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <inspireface.h>

#define NUM_IMAGES 2

int main(int argc, char* argv[]) {
    HResult ret;
    const char* packPath;
    const char* imgPath1;
    const char* imgPath2;
    HOption option;
    HFSession session;
    HFFaceFeature features[NUM_IMAGES];
    const char* imgPaths[NUM_IMAGES];
    int i;
    HFloat similarity;
    HFloat recommended_cosine_threshold;
    HFloat percentage;

    /* Check whether the number of parameters is correct */
    if (argc != 4) {
        HFLogPrint(HF_LOG_ERROR, "Usage: %s <pack_path> <img1_path> <img2_path>", argv[0]);
        return 1;
    }

    packPath = argv[1];
    imgPath1 = argv[2];
    imgPath2 = argv[3];

    /* Initialize features array to NULL */
    memset(features, 0, sizeof(features));

    /* Allocate memory for feature vectors */
    for (i = 0; i < NUM_IMAGES; i++) {
        ret = HFCreateFaceFeature(&features[i]);
        if (ret != HSUCCEED) {
            HFLogPrint(HF_LOG_ERROR, "Create face feature error: %d", ret);
            goto cleanup;
        }
    }

    /* Set the image path array */
    imgPaths[0] = imgPath1;
    imgPaths[1] = imgPath2;

    HFLogPrint(HF_LOG_INFO, "Pack file Path: %s", packPath);
    HFLogPrint(HF_LOG_INFO, "Source file Path 1: %s", imgPath1);
    HFLogPrint(HF_LOG_INFO, "Source file Path 2: %s", imgPath2);

    /* The resource file must be loaded before it can be used */
    ret = HFLaunchInspireFace(packPath);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Load Resource error: %d", ret);
        goto cleanup;
    }

    /* Create a session for face recognition */
    option = HF_ENABLE_FACE_RECOGNITION;
    ret = HFCreateInspireFaceSessionOptional(option, HF_DETECT_MODE_ALWAYS_DETECT, 1, -1, -1, &session);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Create session error: %d", ret);
        goto cleanup;
    }

    /* Process two images */
    for (i = 0; i < NUM_IMAGES; i++) {
        HFImageBitmap imageBitmap = {0};
        HFImageStream stream;
        HFMultipleFaceData multipleFaceData = {0};

        ret = HFCreateImageBitmapFromFilePath(imgPaths[i], 3, &imageBitmap);
        if (ret != HSUCCEED) {
            HFReleaseImageBitmap(imageBitmap);
            HFLogPrint(HF_LOG_ERROR, "Create image bitmap error: %d", ret);
            goto cleanup;
        }

        ret = HFCreateImageStreamFromImageBitmap(imageBitmap, HF_CAMERA_ROTATION_0, &stream);
        if (ret != HSUCCEED) {
            HFReleaseImageStream(stream);
            HFReleaseImageBitmap(imageBitmap);
            HFLogPrint(HF_LOG_ERROR, "Create stream error: %d", ret);
            goto cleanup;
        }

        ret = HFExecuteFaceTrack(session, stream, &multipleFaceData);
        if (ret != HSUCCEED) {
            HFReleaseImageStream(stream);
            HFReleaseImageBitmap(imageBitmap);
            HFLogPrint(HF_LOG_ERROR, "Run face track error: %d", ret);
            goto cleanup;
        }

        if (multipleFaceData.detectedNum == 0) {
            HFReleaseImageStream(stream);
            HFReleaseImageBitmap(imageBitmap);
            HFLogPrint(HF_LOG_ERROR, "No face was detected: %s", imgPaths[i]);
            goto cleanup;
        }

        ret = HFFaceFeatureExtractTo(session, stream, multipleFaceData.tokens[0], features[i]);
        if (ret != HSUCCEED) {
            HFReleaseImageStream(stream);
            HFReleaseImageBitmap(imageBitmap);
            HFLogPrint(HF_LOG_ERROR, "Extract feature error: %d", ret);
            goto cleanup;
        }

        HFReleaseImageStream(stream);
        HFReleaseImageBitmap(imageBitmap);
    }

    HFFaceFeature feature1 = features[0];
    HFFaceFeature feature2 = features[1];

    /* Run comparison */
    ret = HFFaceComparison(feature1, feature2, &similarity);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Feature comparison error: %d", ret);
        goto cleanup;
    }

    ret = HFGetRecommendedCosineThreshold(&recommended_cosine_threshold);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Get recommended cosine threshold error: %d", ret);
        goto cleanup;
    }

    if (similarity > recommended_cosine_threshold) {
        HFLogPrint(HF_LOG_INFO, "%.3f > %.3f ✓ Same face", similarity, recommended_cosine_threshold);
    } else {
        HFLogPrint(HF_LOG_WARN, "%.3f < %.3f ✗ Different face", similarity, recommended_cosine_threshold);
    }
    HFLogPrint(HF_LOG_INFO, "Similarity score: %.3f", similarity);

    ret = HFCosineSimilarityConvertToPercentage(similarity, &percentage);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Convert similarity to percentage error: %d", ret);
        goto cleanup;
    }
    HFLogPrint(HF_LOG_INFO, "Percentage similarity: %f", percentage);

    /* Clean up resources */
    ret = HFReleaseInspireFaceSession(session);
    if (ret != HSUCCEED) {
        HFLogPrint(HF_LOG_ERROR, "Release session error: %d", ret);
    }
    
cleanup:
    /* Release the feature vector memory */
    for (i = 0; i < NUM_IMAGES; i++) {
        if (features[i].data != NULL) {  // Only release features that were successfully created
            HFReleaseFaceFeature(&features[i]);
        }
    }
    
    HFDeBugShowResourceStatistics();
    
    return ret;
}
```


## Face Embedding Database

We provide a lightweight face embedding vector database (**FeatureHub**) storage solution that includes basic functions such as adding, deleting, modifying, and searching, while supporting both **memory** and **persistent** storage modes.

::: tip
Although we provide a lightweight vector storage and retrieval function, it is not necessary. If it cannot meet your performance requirements, we encourage you to manage the face embeddings yourself.
:::

Before starting FeatureHub, you need to be familiar with the following parameters:

- **primaryKeyMode**: Primary key mode, with two modes available. It's recommended to use HF_PK_AUTO_INCREMENT by default
  - HF_PK_AUTO_INCREMENT: Auto-increment mode for primary keys
  - HF_PK_MANUAL_INPUT: Manual input mode for primary keys, requiring users to avoid duplicate primary keys themselves
- **enablePersistence**: Whether to enable persistent database storage mode
  - If true: The database will write to local files for persistent storage during usage
  - If false: High-speed memory management mode, dependent on program lifecycle
- **persistenceDbPath**: Storage path required only for persistent mode, defined by the user. If the input is a folder rather than a file, the system default file naming will be used
- **searchThreshold**: Face search threshold, using floating-point numbers. During search, only embeddings above the threshold are searched. Different models and scenarios require manual threshold settings
- **searchMode**: Search mode, **effective only when searching for top-1 face**, with EAGER and EXHAUSTIVE modes (**this feature is temporarily disabled in the current version**)
  - HF_SEARCH_MODE_EAGER: Complete search immediately upon encountering the first face above the threshold
  - HF_SEARCH_MODE_EXHAUSTIVE: Search all similar faces and return the one with the highest similarity

### Enable/Disable FeatureHub

Using thread-safe singleton pattern design, it has global scope and only needs to be opened once:

```c
// When you need to enable global storage
HFFeatureHubConfiguration configuration;
configuration.primaryKeyMode = HF_PK_AUTO_INCREMENT;	// Recommended to use auto increment
configuration.enablePersistence = 1;		// If the memory mode is set to 0
configuration.persistenceDbPath = db_path;
configuration.searchMode = HF_SEARCH_MODE_EXHAUSTIVE;
configuration.searchThreshold = 0.48f;
ret = HFFeatureHubDataEnable(configuration);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Enable feature hub error: %d", ret);
    return ret;
}

// .....

// You can manually close it when you don't need to use it, or ignore it until the program ends
HFFeatureHubDataDisable();
```

### Insert Face Embedding

Insert a face embedding feature vector into FeatureHub. If in HF_PK_AUTO_INCREMENT mode, the input feature.id will be ignored. If in HF_PK_MANUAL_INPUT mode, the input feature.id is the ID the user expects to insert, and the actual inserted face ID is returned through result_id.

```c
// Insert face feature into the hub
HFFaceFeatureIdentity featureIdentity;
featureIdentity.feature = &feature;
featureIdentity.id = -1;
HFaceId result_id;
ret = HFFeatureHubInsertFeature(featureIdentity, &result_id);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Insert feature error: %d", ret);
    return ret;
}
```

### Search Most Similar Face

Input a face embedding to be queried and search for a face ID from FeatureHub that is above the threshold (Cosine similarity).

```c
// Search face feature
HFFaceFeatureIdentity query_featureIdentity;
query_featureIdentity.feature = &query_feature;
query_featureIdentity.id = -1;
HFloat confidence;
ret = HFFeatureHubFaceSearch(query_feature, &confidence, &query_featureIdentity);

if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Search feature error: %d", ret);
    return ret;
}
```

### Search Top-K Faces

Search for the top K faces with the highest similarity. Note that the data obtained by the `HFFeatureHubFaceSearchTopK` interface is cached data, and you need to retrieve all the result data you need before the next call, otherwise the next call will overwrite the historical data.

```c
// Create HFSearchTopKResults to store search results
HFSearchTopKResults results;
ret = HFFeatureHubFaceSearchTopK(feature, topK, &results);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "The search for the top k vectors failed: %d", ret);
    return ret;
}

// Get all the results
for (int i = 0; i < results.size; i++) {
  	HFloat score = results.confidence[i];
  	HPFaceId id =  results.ids[i];
}
```

### Delete Face Embedding

Specify a face ID to delete that face from FeatureHub.

```c
// Remove face feature
ret = HFFeatureHubFaceRemove(result_id);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Remove feature error: %d", ret);
    return ret;
}
HFLogPrint(HF_LOG_INFO, "Remove feature result: %d", result_id);
```

### Update Face Embedding

```C
// Create HFFaceFeatureIdentity
HFFaceFeatureIdentity updateIdentity;
updateIdentity.id = old_id;	
updateIdentity.feature = &feature;	

// Update feature
ret = HFFeatureHubFaceUpdate(updateIdentity);
if (ret != HSUCCEED) {
    HFLogPrint(HF_LOG_ERROR, "Update feature error: %d", ret);
    return ret;
}
```

### Get Face Embedding from ID

You can quickly obtain FaceFeatureIdentity related information through a face ID.

```c
// Create HFFaceFeatureIdentity
HFFaceFeatureIdentity identity;
auto result = HFFeatureHubGetFaceIdentity(id, &identity);
if (result != HSUCCEED) {
    return nullptr;
}
```

### Dynamic Search Threshold Adjustment

You can dynamically modify FeatureHub's search threshold in different scenarios.

```c
HFFeatureHubFaceSearchThresholdSetting(0.5f);
```

