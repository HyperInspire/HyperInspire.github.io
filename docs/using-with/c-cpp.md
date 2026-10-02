# C API

The C API provides detection, tracking, recognition and analysis for native applications and language bindings, including C++. Check the status when creating a handle, and release each handle once after its final use.

SDK versions, downloads and platform build instructions are listed in [Get and build the SDK](../build/README.md).

For an iOS or macOS app written in Objective-C or Swift, see the [Apple API guide](./apple.md). The native C/C++ integration below remains available with the headers and libraries from the same build.

## Link the SDK

Download the matching SDK from [Release 1.2.4](https://github.com/HyperInspire/InspireFace/releases/tag/v1.2.4), or [build it yourself](../build/source.md). Locate the SDK directory containing `include/` and `lib/`. Linux uses `libInspireFace.so`, macOS uses `libInspireFace.dylib`, and Windows uses `libInspireFace.dll` with a separate import library. For Windows setup, see [Windows](./windows.md).

Save the [detection program below](#a-complete-detection-program) as `detect.c`, and save this configuration as `CMakeLists.txt` in the same directory.

<details>
<summary>CMakeLists.txt — Complete code</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_detection LANGUAGES C CXX)

set(INSPIREFACE_ROOT "" CACHE PATH "SDK directory containing include/ and lib/")
if(WIN32)
    find_package(InspireFace CONFIG REQUIRED
        PATHS "${INSPIREFACE_ROOT}/lib/cmake/InspireFace" NO_DEFAULT_PATH)
    add_library(InspireFaceSDK ALIAS InspireFace::InspireFace)
else()
    find_path(ISF_INCLUDE_DIR inspireface.h PATHS "${INSPIREFACE_ROOT}/include" NO_DEFAULT_PATH REQUIRED)
    find_library(ISF_LIBRARY NAMES InspireFace PATHS "${INSPIREFACE_ROOT}/lib" NO_DEFAULT_PATH REQUIRED)
    add_library(InspireFaceSDK UNKNOWN IMPORTED)
    set_target_properties(InspireFaceSDK PROPERTIES
        IMPORTED_LOCATION "${ISF_LIBRARY}"
        INTERFACE_INCLUDE_DIRECTORIES "${ISF_INCLUDE_DIR}")
endif()

add_executable(detect_c detect.c)
target_compile_features(detect_c PRIVATE c_std_99)
set_target_properties(detect_c PROPERTIES LINKER_LANGUAGE CXX)
target_link_libraries(detect_c PRIVATE InspireFaceSDK)

if(WIN32)
    get_target_property(ISF_LIBRARY_TYPE InspireFaceSDK TYPE)
    if(ISF_LIBRARY_TYPE STREQUAL "SHARED_LIBRARY")
        add_custom_command(TARGET detect_c POST_BUILD
            COMMAND "${CMAKE_COMMAND}" -E copy_if_different
                "$<TARGET_FILE:InspireFaceSDK>" "$<TARGET_FILE_DIR:detect_c>"
            VERBATIM)
    endif()
endif()
```

</details>

Run from that directory:

```bash
cmake -S . -B build -DINSPIREFACE_ROOT=/path/to/InspireFace
cmake --build build --parallel
./build/detect_c /path/to/Pikachu /path/to/face.jpg
```

On Windows, open **x64 Native Tools Command Prompt for VS 2022**, then start PowerShell. With a Release x64 SDK, use the same files:

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release `
  "-DINSPIREFACE_ROOT=C:/SDKs/InspireFace"
cmake --build build --parallel 4
.\build\detect_c.exe C:\models\Pikachu C:\images\face.jpg
```

The Windows branch uses the SDK's installed CMake package. Its target supplies DLL import definitions and static dependencies, and the example copies a shared SDK's DLL beside the executable. Keep the SDK and application on the same architecture, build configuration and MSVC runtime. See [Windows deployment](./windows.md) for runtime installation. For paths with Chinese or other non-ASCII characters, use the [complete Windows example](./windows.md#a-complete-detection-program), which converts UTF-16 command-line arguments to UTF-8 before calling the SDK.

This CMake configuration imports the SDK as a library target. For deployment, put its runtime libraries on the operating system's library search path. See [library loading](../guides/troubleshooting.md#library-import-or-loading-fails).

### Keep headers and runtime together

A minimal working directory looks like this:

```text
example/
  CMakeLists.txt
  detect.c
  sdk/
    include/inspireface.h
    include/herror.h
    include/intypedef.h
    lib/libInspireFace.so
  models/Pikachu
  images/face.jpg
```

Set `INSPIREFACE_ROOT` to the `sdk` directory above. On macOS the library is `libInspireFace.dylib`. For Windows, keep `libInspireFace.dll`, its `.lib` import library and `lib/cmake/InspireFace/` together. Keep the complete `include/` and `lib/` directories from the same SDK package.

Configure the executable's runtime search path to load the packaged SDK libraries. The model stays in a separate file; pass its path when launching the runtime.

::: tip Use a shared-library SDK for the first example
Start with a shared SDK. The Windows CMake package also carries the dependencies of a static SDK; use it instead of linking the `.lib` file alone. For a static build on other platforms, include the inference, threading and platform dependencies in the application's final link step.
:::

## A complete detection program

This program reads an image through the SDK's bitmap API, so it does not require OpenCV. It can be compiled as C99.

<details>
<summary>detect.c — Complete code</summary>

```c
/* Build as C99. Usage: detect_c <resource-pack> <image> */
#include <stdio.h>
#include <inspireface.h>

int main(int argc, char **argv) {
    HFSession session = NULL;
    HFImageBitmap bitmap = NULL;
    HFImageStream stream = NULL;
    HFMultipleFaceData faces = {0};
    HResult status;
    int exit_code = 1;

    if (argc != 3) {
        fprintf(stderr, "Usage: %s <resource-pack> <image>\n", argv[0]);
        return 2;
    }
    status = HFLaunchInspireFace(argv[1]);
    if (status != HSUCCEED) {
        fprintf(stderr, "Launch failed: %ld\n", (long)status);
        return 1;
    }
    status = HFCreateInspireFaceSessionOptional(
        HF_ENABLE_NONE, HF_DETECT_MODE_ALWAYS_DETECT, 10, 320, -1, &session);
    if (status != HSUCCEED) goto cleanup;
    status = HFCreateImageBitmapFromFilePath(argv[2], 3, &bitmap);
    if (status != HSUCCEED) goto cleanup;
    status = HFCreateImageStreamFromImageBitmap(bitmap, HF_CAMERA_ROTATION_0, &stream);
    if (status != HSUCCEED) goto cleanup;
    status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED) goto cleanup;

    printf("Detected %d faces\n", faces.detectedNum);
    for (HInt32 i = 0; i < faces.detectedNum; ++i) {
        HFaceRect box = faces.rects[i];
        printf("face %d: x=%d y=%d width=%d height=%d confidence=%.3f\n",
               i, box.x, box.y, box.width, box.height, faces.detConfidence[i]);
    }
    exit_code = 0;

cleanup:
    if (exit_code != 0) fprintf(stderr, "InspireFace error: %ld\n", (long)status);
    /* Release each handle once, after its final use. */
    if (stream != NULL) HFReleaseImageStream(stream);
    if (bitmap != NULL) HFReleaseImageBitmap(bitmap);
    if (session != NULL) HFReleaseInspireFaceSession(session);
    HFTerminateInspireFace();
    return exit_code;
}
```

</details>

Print `HResult` with `%ld` after casting it to `long`. Success is `HSUCCEED`; use the status code for error handling and include it in diagnostic logs.

<figure>
  <a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg"><img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg" alt="Multiple faces with boxes and dense landmark overlays" loading="lazy" style="display: block; width: min(100%, 640px); height: auto; margin: 0 auto;"></a>
  <figcaption>Detection and landmark visualization from the original example. The program above prints boxes; use the landmark getters and your drawing layer to add a point overlay.</figcaption>
</figure>

## Session configuration

Detection and tracking are available with `HF_ENABLE_NONE`. Optional models are selected when the session is created:

| Option | Enables |
| --- | --- |
| `HF_ENABLE_FACE_RECOGNITION` | Embedding extraction |
| `HF_ENABLE_QUALITY` | Face quality assessment |
| `HF_ENABLE_LIVENESS` | RGB liveness scores |
| `HF_ENABLE_MASK_DETECT` | Mask scores |
| `HF_ENABLE_INTERACTION` | Eye state and temporal actions |
| `HF_ENABLE_FACE_POSE` | Pose angles in detection results |
| `HF_ENABLE_FACE_ATTRIBUTE` | Attribute category outputs |
| `HF_ENABLE_FACE_EMOTION` | Expression category outputs |

Combine options with `|` and select the models included in your resource pack. Dense landmarks are available from the face result after detection.

Use `-1` for the pack's default detector level, or query supported levels with `HFQuerySupportedPixelLevelsForFaceDetection` after launch. [Tracking](../guides/tracking.md) explains how the detector level differs from source resolution and tracking preview size.

| Parameter | How to choose it |
| --- | --- |
| `detectMode` | `HF_DETECT_MODE_ALWAYS_DETECT` for independent photos; a tracking mode for an ordered video sequence. |
| `maxDetectFaceNum` | Maximum number of faces to detect and track. |
| `detectPixelLevel` | A detector level supported by the loaded pack; independent of the original image dimensions. |
| `trackByDetectModeFPS` | The frame-rate setting for tracking-by-detection; `-1` keeps the default. |

::: tip Configure once, process many frames
Launch the resource pack at application startup, create one session for each independent stream, and create or update an image stream for each frame. Recreating the session for every image adds startup cost and prevents temporal tracking state from accumulating.
:::

### Versioned configuration

C API level 2 adds `HFSessionConfigV2`. It is useful for bindings that need a fixed-layout configuration structure. The earlier creation functions remain available.

```c
HFSessionConfigV2 config = {0};
config.structSize = sizeof(config);
config.structVersion = HF_SESSION_CONFIG_V2_VERSION;
config.featureMask = HF_ENABLE_FACE_RECOGNITION | HF_ENABLE_QUALITY;
config.detectMode = HF_DETECT_MODE_ALWAYS_DETECT;
config.maxDetectFaceNum = 10;
config.detectPixelLevel = 320;
config.trackByDetectModeFPS = -1;
HFSession session = NULL;
HFStatus status = HFCreateInspireFaceSessionV2(&config, &session);
/* Check status, use session, then release it. */
```

Keep reserved fields zero and use API-level-2 headers with an API-level-2 native library.

## Image buffers and ownership

| Object or result | Owner and lifetime |
| --- | --- |
| Stream created with `HFCreateImageStream` | Borrows your raw bytes; keep them alive and unchanged until the stream is released or its buffer is replaced. |
| `HFImageBitmap` | Owns its pixel storage; release with `HFReleaseImageBitmap`. |
| Stream created from a bitmap | Owns a copy of the bitmap pixels. Release with `HFReleaseImageStream`. |
| `HFMultipleFaceData` from `HFExecuteFaceTrack` | Session-owned arrays and tokens. Consume or copy them before the session's next tracking call. Do not free the pointers. |
| `HFFaceResultSnapshot` | Independently owned result data; release with `HFReleaseFaceResultSnapshot`. It does not retain the input image. |
| Pipeline result getters | Borrow session result buffers. Consume them before another pipeline call. |

::: warning Snapshots and borrowed results
Snapshots copy detection results, giving them an explicit lifetime that is easier to manage when keeping results or processing them later. This reduces lifetime mistakes but adds copying work and latency; source pixels still need to be retained separately.

For a single video stream processed in order, read the borrowed `HFMultipleFaceData` returned by `HFExecuteFaceTrack` before the next tracking call to avoid copying the detection result. Subsequent calls may overwrite its arrays and tokens. Do not retain these pointers across frames or reuse them between interleaved calls.
:::

For buffer layouts and deferred processing, see [image inputs](../guides/image-inputs.md) and [architecture and lifetime](../guides/arch.md).

<figure>
  <a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pipeline.png"><img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pipeline.png" alt="C API call sequence from model launch through session and stream cleanup" loading="lazy" style="display: block; width: min(100%, 560px); height: auto; margin: 0 auto;"></a>
  <figcaption>Native call sequence. For video, repeat image preparation, detection, optional pipeline and result reading; keep the runtime and session open between frames. Click the diagram to view it at full size.</figcaption>
</figure>

::: tip One session per worker
Give each worker its own session and process its calls in order. Before sending results to another worker, copy the required data while the current tracking or pipeline result is still valid.
:::

## Face Pipeline

Detect first, then run optional analysis on those faces. The following block assumes `session`, `stream` and `faces` are still valid and the session was created with `HF_ENABLE_QUALITY`:

```c
HResult status = HFMultipleFacePipelineProcessOptional(
    session, stream, &faces, HF_ENABLE_QUALITY);
if (status == HSUCCEED) {
    HFFaceQualityConfidence quality = {0};
    status = HFGetFaceQualityConfidence(session, &quality);
    if (status == HSUCCEED) {
        for (HInt32 i = 0; i < quality.num; ++i) {
            printf("face %d quality=%.3f\n", i, quality.confidence[i]);
        }
    }
}
```

The pipeline request must be a subset of the session's enabled options. Result indices correspond to the supplied face list. Check the getter's status and count before indexing the output.

| Analysis | Result getter |
| --- | --- |
| RGB liveness | `HFGetRGBLivenessConfidence` |
| Mask | `HFGetFaceMaskConfidence` |
| Quality | `HFGetFaceQualityConfidence` |
| Eye state | `HFGetFaceInteractionStateResult` |
| Actions | `HFGetFaceInteractionActionsResult` |
| Attributes | `HFGetFaceAttributeResult` |
| Expression | `HFGetFaceEmotionResult` |

Full examples for quality, mask, pose, attributes and expression are in [Optional analysis](../guides/optional-analysis.md), with C, C++, Java, Python and Android tabs, among others.

## Extract an owned embedding

`HFFaceFeatureExtract` exposes a session cache; a later extraction can replace its contents. Use `HFCreateFaceFeature` and `HFFaceFeatureExtractTo` when the vector must survive another call:

```c
/* session has recognition enabled; faces came from this stream. */
HFFaceFeature feature = {0};
HResult status = HFCreateFaceFeature(&feature);
if (status == HSUCCEED) {
    if (faces.detectedNum == 1) {
        status = HFFaceFeatureExtractTo(session, stream, faces.tokens[0], feature);
        /* Compare, insert into a gallery, or copy feature.data here. */
    }
    HFReleaseFaceFeature(&feature);
}
```

Release features allocated by `HFCreateFaceFeature` with `HFReleaseFaceFeature`. The session and FeatureHub manage the storage of borrowed result vectors.

Compare two owned features with `HFFaceComparison`. Use `HFGetRecommendedCosineThreshold` for the model's starting threshold. The [recognition guide](../guides/recognition.md) covers enrollment, search modes and persistence.

## More API details

- [Dense landmarks](../guides/dense-landmark.md): query the point count and read alignment points.
- [Liveness](../guides/liveness-detection.md): RGB scores and action signals.
- [Face capture](../guides/face-capture.md): snapshots and frame selection in API level 2.
- [Troubleshooting](../guides/troubleshooting.md): errors, resource packs and runtime diagnostics.

The complete declarations and struct fields are in [`inspireface.h`](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/c_api/inspireface.h). Treat the header shipped with your SDK as the reference for that binary.
