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
    implementation 'com.github.HyperInspire:inspireface-android-sdk:1.2.0'
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
// Create session
Session session = InspireFace.CreateSession(
    parameter, InspireFace.DETECT_MODE_ALWAYS_DETECT, 10, -1, -1);

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

## Face Detection

Face detection is the first step in the analysis of faces, which requires the input of an image or frame:

::: code-tabs#shell

@tab Java

```java
TODO
```

@tab Kotlin

```kotlin
TODO
```

:::
