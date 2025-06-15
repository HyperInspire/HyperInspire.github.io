# Using InspireFace in Android

InspireFace's Android SDK is based on dynamic library +CAPI and provides JNI interface for users to use.

## Installation and Setup

### Dependent Release version

We released InspireFace's Android SDK on JitPack, which you can incorporate into your android projects in the following ways.

- Step 1. Add the JitPack repository to your build file add it in your root **build.gradle** at the end of repositories:

```gradle
allprojects {
    repositories {
       ...
       maven { url 'https://jitpack.io' }
    }
}
```

- Step 2. Add the dependency to your app's **build.gradle** file:

```gradle
dependencies {
    implementation 'com.github.HyperInspire:inspireface-android-sdk:1.2.2'
}
```

### Compile from source code

TODO

## Initialization

Global initialization of InspireFace is necessary. You only need to perform it once when the program starts. The initialization includes functions such as configuration reading and model loading.
::: code-tabs#shell

@tab Java

```java
// Launch InspireFace, only need to call once
boolean launchStatus = InspireFace.GlobalLaunch(this, InspireFace.PIKACHU);
if (!launchStatus) {
    Log.e(TAG, "Failed to launch InspireFace");
}

// .... 

// Global release
InspireFace.GlobalRelease();
```

@tab Kotlin

```kotlin
TODO
```

:::

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

::: code-tabs#shell

@tab Java

```java
boolean launchStatus = InspireFace.GlobalLaunch(this, InspireFace.PIKACHU);
Log.d(TAG, "Launch status: " + launchStatus);
if (!launchStatus) {
    Log.e(TAG, "Failed to launch InspireFace");
    return;
}
CustomParameter parameter = InspireFace.CreateCustomParameter()
        .enableRecognition(true)           // Enable face recognition
        .enableFaceQuality(true)           // Enable face quality detection
        .enableFaceAttribute(true)         // Enable face attribute detection
        .enableInteractionLiveness(true)   // Enable interaction liveness detection
        .enableLiveness(true)              // Enable liveness detection
        .enableMaskDetect(true);           // Enable mask detection
// Face detection level, 160/320/640
int detectLevel = 320;
// Supports the maximum number of faces detected
int maxFaces = 1;
// Create session
Session session = InspireFace.CreateSession(
    parameter, InspireFace.DETECT_MODE_ALWAYS_DETECT, maxFaces, detectLevel, -1);
// Configure some face detection parameters
InspireFace.SetTrackPreviewSize(session, 320);
InspireFace.SetFaceDetectThreshold(session, 0.5f);
InspireFace.SetFilterMinimumFacePixelSize(session, 0);
....

// Destroy session, when you don't need it
InspireFace.DestroySession(session);
```

@tab Kotlin

```kotlin
TODO
```

:::

### Image Stream

Image stream is a data structure that stores image data, which is used to pass image data between the SDK and the user.

- **Create Image Stream**: Create an image stream from a bitmap

::: code-tabs#shell

@tab Java

```java
Bitmap img = SDKUtils.getImageFromAssetsFile(this, "inspireface/kun.jpg");
ImageStream stream = InspireFace.CreateImageStreamFromBitmap(img, InspireFace.CAMERA_ROTATION_0);
```

@tab Kotlin

```kotlin
TODO
```

:::

- **Create Image Stream from File**: Create an image stream from buffer

::: code-tabs#shell

@tab Java

```java
byte[] buffer = ...; // buffer of image/video/frame...
int height = 640;
int width = 480;
int format = InspireFace.STREAM_YUV_NV21;
int rotation = InspireFace.CAMERA_ROTATION_0;
ImageStream stream = InspireFace.CreateImageStreamFromByteBuffer(buffer, width, height, format, rotation);
```

@tab Kotlin

```kotlin
TODO
```

:::

- **Destroy Image Stream**: Destroy an image stream

When you don't need an image stream, you can destroy it:

::: code-tabs#shell

@tab Java

```java
InspireFace.ReleaseImageStream(stream);
```

@tab Kotlin

```kotlin
TODO
```

:::

### Face Detection

Face detection is the first step in the analysis of faces, which requires the input of an image or frame:

::: code-tabs#shell

@tab Java

```java
MultipleFaceData multipleFaceData = InspireFace.ExecuteFaceTrack(session, stream);
for (int i = 0; i < multipleFaceData.detectedNum; i++) {
    // continue to processing
    // ...
}
```

@tab Kotlin

```kotlin
TODO
```

:::

### Get Face Embedding

Get face Embeding is an important step in face recognition, comparison or face swap, which usually needs to be carried out after face detection or tracking:


::: code-tabs#shell

@tab Java

```java
int selectIndex = 0;    // Select an index
FaceFeature feature = InspireFace.ExtractFaceFeature(session, stream, multipleFaceData.tokens[selectIndex]);
```

@tab Kotlin

```kotlin
TODO
```

:::

## Feature Hub

FeatureHub is a globally scoped database that manages face features with full support for create, read, update, and delete operations. It supports both in-memory and persistent storage modes and only needs to be configured once globally upon initialization.

::: warning
Please be mindful when selecting the storage mode. If you choose the persistent mode, make sure to securely store the database file to prevent data loss.
:::

### Initialization and configuration

This operation is performed once to initialize FeatureHub, and need to select the storage mode to work.

- **enablePersistence**: Enable persistence mode, If not enabled, it will only be stored in the current memory.
- **persistenceDbPath**: After this function is enabled, you need to specify the path for saving the DB file.

::: code-tabs#shell

@tab Java

```java
FeatureHubConfiguration configuration = InspireFace.CreateFeatureHubConfiguration()
        .setEnablePersistence(true)
        .setPersistenceDbPath(dbPath)
        .setSearchThreshold(0.42f)
        .setSearchMode(InspireFace.SEARCH_MODE_EXHAUSTIVE)
        .setPrimaryKeyMode(InspireFace.PK_AUTO_INCREMENT);

boolean enableStatus = InspireFace.FeatureHubDataEnable(configuration);
Log.d(TAG, "Enable feature hub data status: " + enableStatus);
```

@tab Kotlin

```kotlin
TODO
```

:::

### Insert face

Insert a face into the database

::: code-tabs#shell

@tab Java

```java
boolean succ = InspireFace.FeatureHubInsertFeature(identity);
// After successful insertion, you can save the id to your system
if (succ) {
    Log.i(TAG, "Allocation ID: " + identity.id);
}
```

@tab Kotlin

```kotlin
TODO
```

:::

### Search face

Using the face embedding feature to search for similar faces.

- Search for the most similar faces

::: code-tabs#shell

@tab Java

```java
FaceFeatureIdentity searched = InspireFace.FeatureHubFaceSearch(feature);
Log.i(TAG, "Searched id: " + searched.id + ", Confidence: " + searched.searchConfidence);
```

@tab Kotlin

```kotlin
TODO
```

:::

- Search for the most similar k faces

::: code-tabs#shell

@tab Java

```java
SearchTopKResults topKResults = InspireFace.FeatureHubFaceSearchTopK(feature, 10);
for (int i = 0; i < topKResults.num; i++) {
    Log.i(TAG, "TopK id: " + topKResults.ids[i] + ", Confidence: " + topKResults.confidence[i]);
}
```

@tab Kotlin

```kotlin
TODO
```

:::

### Update face

Specify an id to update face features.

::: code-tabs#shell

@tab Java

```java
int updateId = 8;
newFeature.data = new float[InspireFace.GetFeatureLength()];
FaceFeatureIdentity identity = FaceFeatureIdentity.create(updateId, newFeature);
boolean updateSucc = InspireFace.FeatureHubFaceUpdate(identity);
if (updateSucc) {
    Log.i(TAG, "Update feature success: " + updateId);
}
```

@tab Kotlin

```kotlin
TODO
```

:::

### Remove face

Specify an id to remove a face from the database.

::: code-tabs#shell

@tab Java

```java
int removeId = 4;
boolean removeSucc = InspireFace.FeatureHubFaceRemove(removeId);
if (removeSucc) {
    Log.i(TAG, "Remove feature success: " + removeId);
}
```

@tab Kotlin

```kotlin
TODO
```

:::

### Get face embedding

Gets the embedding of a face by id.

::: code-tabs#shell

@tab Java

```java
int id = 4;
FaceFeatureIdentity identity = InspireFace.FeatureHubGetFaceIdentity(id);
```

@tab Kotlin

```kotlin
TODO
```

:::

