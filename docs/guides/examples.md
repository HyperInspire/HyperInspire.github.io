# Complete examples {#runnable-examples}

Copy the code below into files with the names shown, then run the matching command. Each program reads local images or video. The full source is in a collapsed panel so you can open and copy the file you need.

For individual features, the [API index](./api-coverage.md) links to tabbed C API, C++, Android, Python, HarmonyOS, Objective-C and Swift examples for tracking, analysis, landmarks, recognition, liveness and capture. [Additional recipes](./api-recipes.md) cover alignment, score formatting and diagnostics.

## Python {#python}

```bash
python -m pip install inspireface opencv-python
```

| File | Purpose |
| --- | --- |
| [detect.py](#python-detection) | Print face boxes and save an annotated image. |
| [compare.py](#python-comparison) | Require one face in each image; print similarity and the model threshold. |
| [capture.py](#python-capture) | Save a selected full frame after capture is ready. |
| [benchmark.py](#python-benchmark) | Report warmed still-image detection latency. |

Capture and benchmark examples use the 1.2.4 wrapper with a matching native library; see [custom library setup](../using-with/python.md#use-a-local-native-build).

Detection can download the default `Pikachu` pack if `--model` is omitted. The other commands below use an explicit resource path. A missing image is an error; a readable image with no detected faces is a normal detection result.

### Detect faces in an image {#python-detection}

This program loads an image, prints each detected face box and confidence, and saves the boxes on a copy of the image. Save it as `detect.py`.

<details>
<summary>detect.py — Expand complete code</summary>

```python
"""Detect faces in one image and save an annotated copy."""
import argparse
from pathlib import Path

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("--model", type=Path, help="Path to an unpacked resource pack")
    parser.add_argument("--output", type=Path, default=Path("detected.jpg"))
    args = parser.parse_args()

    image = cv2.imread(str(args.image))
    if image is None:
        parser.error(f"Cannot read image: {args.image}")
    if args.model is None:
        isf.launch("Pikachu")  # Downloads the model on first use.
    else:
        isf.launch(resource_path=str(args.model))

    session = None
    try:
        session = isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320,
        )
        faces = session.face_detection(image)
        print(f"Detected {len(faces)} faces")
        output = image.copy()
        for face in faces:
            x1, y1, x2, y2 = face.location
            cv2.rectangle(output, (x1, y1), (x2, y2), (60, 170, 80), 2)
            print(face.location, face.detection_confidence)
        if not cv2.imwrite(str(args.output), output):
            raise RuntimeError(f"Cannot write image: {args.output}")
        print(f"Saved {args.output}")
    finally:
        if session is not None:
            session.release()
        isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python detect.py face.jpg --model /path/to/Pikachu --output detected.jpg
```

### Compare two faces {#python-comparison}

The comparison program requires exactly one face per image and reports an error for zero or multiple faces. It prints the cosine similarity alongside the model's recommended threshold. Save it as `compare.py`.

<details>
<summary>compare.py — Expand complete code</summary>

```python
"""Compare two images that each contain exactly one face."""
import argparse
import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first")
    parser.add_argument("second")
    parser.add_argument("--model", required=True)
    args = parser.parse_args()
    images = [cv2.imread(path) for path in (args.first, args.second)]
    if any(image is None for image in images):
        parser.error("Both image paths must be readable")

    isf.launch(resource_path=args.model)
    session = None
    try:
        session = isf.InspireFaceSession(
            isf.HF_ENABLE_FACE_RECOGNITION, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320,
        )
        features = []
        for image in images:
            faces = session.face_detection(image)
            if len(faces) != 1:
                raise ValueError(f"Expected exactly one face; found {len(faces)}")
            features.append(session.face_feature_extract(image, faces[0]))
        similarity = isf.feature_comparison(features[0], features[1])
        threshold = isf.get_recommended_cosine_threshold()
        print(f"Cosine similarity: {similarity:.4f}")
        print(f"Model threshold: {threshold:.4f}")
        print(f"Above threshold: {similarity >= threshold}")
    finally:
        if session is not None:
            session.release()
        isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python compare.py a.jpg b.jpg --model /path/to/Pikachu
```

### Select a frame from video {#python-capture}

Capture uses video timestamps to follow the face across frames. It keeps the selected candidate images until capture is ready, then saves the chosen full frame. The program stops with an error if capture finishes before becoming ready or the clip ends first. Save it as `capture.py`.

<details>
<summary>capture.py — Expand complete code</summary>

```python
"""Select a stable face frame from a video using InspireFace 1.2.4."""
import argparse
import math
from pathlib import Path

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video")
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", default="captured.jpg")
    args = parser.parse_args()
    video = cv2.VideoCapture(args.video)
    if not video.isOpened():
        parser.error("Cannot open the input video")
    fps = video.get(cv2.CAP_PROP_FPS)
    if not math.isfinite(fps) or not 0 < fps <= 1000:
        video.release()
        parser.error("This example needs a video with a valid frame rate")

    launched = False
    try:
        isf.launch(resource_path=args.model)
        launched = True
        with isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_LIGHT_TRACK,
            max_detect_num=5, detect_pixel_level=320, auto_launch=False,
        ) as session:
            config = isf.FaceCaptureConfig.defaults()
            with session.create_face_capture(config) as capture:
                candidates = {}
                frame_id = 0
                while True:
                    ok, frame = video.read()
                    if not ok:
                        break
                    # Use video time, not the speed of this offline processing loop.
                    timestamp_ms = round(frame_id * 1000 / fps)
                    progress = capture.update(frame, frame_id, timestamp_ms)
                    results = capture.results()
                    kept_ids = {result.frame_id for result in results}
                    if frame_id in kept_ids:
                        candidates[frame_id] = frame.copy()
                    candidates = {key: value for key, value in candidates.items()
                                  if key in kept_ids}
                    print(frame_id, progress.state.name, int(progress.reject_reasons))
                    frame_id += 1
                    if progress.state == isf.FaceCaptureState.READY:
                        capture.finish()
                        selected = capture.results()[0]
                        output = Path(args.output)
                        output.parent.mkdir(parents=True, exist_ok=True)
                        if not cv2.imwrite(str(output), candidates[selected.frame_id]):
                            raise RuntimeError(f"Cannot write {output}")
                        print(f"Saved frame {selected.frame_id} to {output}")
                        return
                    if progress.state == isf.FaceCaptureState.FINISHED:
                        raise RuntimeError("Capture finished before becoming ready; start a new round")
                raise RuntimeError("Video ended before capture was ready")
    finally:
        video.release()
        if launched:
            isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python capture.py clip.mp4 --model /path/to/Pikachu --output captured.jpg
```

### Measure detection latency {#python-benchmark}

The benchmark warms up the session, repeats detection on one image, and prints the median and P95 latency in milliseconds. Use `--runs` and `--warmup` to change the iteration counts. Save it as `benchmark.py`.

<details>
<summary>benchmark.py — Expand complete code</summary>

```python
"""Measure synchronous still-image detection latency (not camera FPS)."""
import argparse
import math
import statistics
import time

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("--model", required=True)
    parser.add_argument("--runs", type=int, default=100)
    parser.add_argument("--warmup", type=int, default=20)
    args = parser.parse_args()
    if args.runs < 1 or args.warmup < 0:
        parser.error("runs must be positive and warmup must be non-negative")
    image = cv2.imread(args.image)
    if image is None:
        parser.error("Cannot read the input image")
    isf.launch(resource_path=args.model)
    try:
        with isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320, auto_launch=False,
        ) as session:
            with isf.ImageStream.load_from_cv_image(image) as stream:
                for _ in range(args.warmup):
                    session.face_detection(stream)
                elapsed = []
                counts = set()
                for _ in range(args.runs):
                    start = time.perf_counter_ns()
                    faces = session.face_detection(stream)
                    elapsed.append((time.perf_counter_ns() - start) / 1_000_000)
                    counts.add(len(faces))
        ordered = sorted(elapsed)
        p95 = ordered[math.ceil(0.95 * len(ordered)) - 1]
        print(f"native={isf.version()}, image={image.shape}, face_counts={sorted(counts)}")
        print(f"ALWAYS_DETECT, level=320, max_faces=10, runs={args.runs}")
        print(f"median={statistics.median(elapsed):.3f} ms, p95={p95:.3f} ms")
    finally:
        isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

```bash
python benchmark.py face.jpg --model /path/to/Pikachu
```

## C and C++ {#c-and-c}

Save `detect.c`, `detect.cpp` and `CMakeLists.txt` below in one folder. Point CMake at an installed SDK directory containing `include/` and `lib/`:

```bash
cmake -S . -B build \
  -DINSPIREFACE_ROOT=/absolute/path/to/InspireFace \
  -DBUILD_CPP_EXAMPLE=ON
cmake --build build --parallel 4
./build/detect_c /path/to/Pikachu face.jpg
./build/detect_cpp /path/to/Pikachu face.jpg
```

The C example prints bounding boxes. The C++ example also writes `detected-cpp.jpg` in the working directory. If your SDK contains only C headers, leave `BUILD_CPP_EXAMPLE` off. A custom static SDK may require additional transitive libraries; these instructions use a shared SDK.

The [C](../using-with/c-cpp.md) and [C++](../using-with/cpp.md) pages explain the code and resource lifetime. Compile and run with headers and libraries from the same SDK build.

### C detection {#c-detection}

The C program loads the resource pack and image, runs detection, then releases every handle before shutting down the runtime.

<details>
<summary>detect.c — Expand complete code</summary>

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

### C++ detection {#cpp-detection}

The C++ program wraps the input pixels in a `FrameProcess`, detects faces, and draws the results with InspireCV. Local objects release their resources when they leave scope.

<details>
<summary>detect.cpp — Expand complete code</summary>

```cpp
// Usage: detect_cpp <resource-pack> <image>
#include <iostream>
#include <vector>
#include <inspirecv/inspirecv.h>
#include <inspireface/inspireface.hpp>

struct RuntimeScope {
    ~RuntimeScope() { INSPIREFACE_CONTEXT->Unload(); }
};

int main(int argc, char** argv) {
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <resource-pack> <image>\n";
        return 2;
    }
    int status = INSPIREFACE_CONTEXT->Load(argv[1]);
    if (status != 0) {
        std::cerr << "Launch failed: " << status << '\n';
        return 1;
    }
    RuntimeScope runtime;
    auto image = inspirecv::Image::Create(argv[2], 3);
    if (image.Empty()) {
        std::cerr << "Cannot read image\n";
        return 1;
    }
    // FrameProcess takes height before width and borrows the pixel buffer.
    auto frame = inspirecv::FrameProcess::Create(
        image.Data(), image.Height(), image.Width(),
        inspirecv::BGR, inspirecv::ROTATION_0);
    inspire::CustomPipelineParameter options;
    auto session = inspire::Session::Create(
        inspire::DETECT_MODE_ALWAYS_DETECT, 10, options, 320);
    std::vector<inspire::FaceTrackWrap> faces;
    status = session.FaceDetectAndTrack(frame, faces);
    if (status != 0) {
        std::cerr << "Detection failed: " << status << '\n';
        return 1;
    }
    std::cout << "Detected " << faces.size() << " faces\n";
    auto output = image.Clone();
    for (const auto& face : faces) {
        output.DrawRect(session.GetFaceBoundingBox(face), inspirecv::Color::Green, 2);
    }
    return output.Write("detected-cpp.jpg") ? 0 : 1;
}
```

</details>

### Build configuration {#native-cmake}

This CMake file builds the C program by default. `BUILD_CPP_EXAMPLE=ON` adds the C++ target.

<details>
<summary>CMakeLists.txt — Expand complete code</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_examples LANGUAGES C CXX)

set(INSPIREFACE_ROOT "" CACHE PATH "SDK directory containing include/ and lib/")
find_path(ISF_INCLUDE_DIR inspireface.h PATHS "${INSPIREFACE_ROOT}/include" NO_DEFAULT_PATH REQUIRED)
find_library(ISF_LIBRARY NAMES InspireFace PATHS "${INSPIREFACE_ROOT}/lib" NO_DEFAULT_PATH REQUIRED)
add_library(InspireFaceSDK UNKNOWN IMPORTED)
set_target_properties(InspireFaceSDK PROPERTIES
    IMPORTED_LOCATION "${ISF_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${ISF_INCLUDE_DIR}")

add_executable(detect_c detect.c)
target_compile_features(detect_c PRIVATE c_std_99)
target_link_libraries(detect_c PRIVATE InspireFaceSDK)

option(BUILD_CPP_EXAMPLE "Build the C++ wrapper example (requires its headers)" OFF)
if(BUILD_CPP_EXAMPLE)
    add_executable(detect_cpp detect.cpp)
    target_compile_features(detect_cpp PRIVATE cxx_std_14)
    target_link_libraries(detect_cpp PRIVATE InspireFaceSDK)
endif()
```

</details>

## InspireCV {#inspirecv}

Save `preprocess.cpp` and its `CMakeLists.txt` below in a separate folder. After installing InspireCV, run:

```bash
cmake -S . -B build -DCMAKE_PREFIX_PATH=/absolute/path/to/inspirecv-install
cmake --build build --parallel 4
./build/preprocess face.jpg
```

The program writes a resized image and prints the dimensions and value range of an RGB float tensor. It demonstrates Image I/O, resize, channel conversion, normalization and CHW output. [The InspireCV guide](./inspirecv.md) explains how to configure these steps for a model's input format.

### Image preprocessing {#cv-preprocessing}

The input image is resized to 224 × 224, converted from BGR to RGB, and normalized with `(value - 127.5) / 127.5`. The output tensor uses CHW order.

<details>
<summary>inspirecv/preprocess.cpp — Expand complete code</summary>

```cpp
#include <inspirecv/inspirecv.h>
#include <inspirecv/task/pipeline.h>
#include <algorithm>
#include <iostream>
#include <vector>

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "Usage: preprocess IMAGE\n";
        return 1;
    }
    auto image = inspirecv::Image::Create(argv[1], 3);
    if (image.Empty()) {
        std::cerr << "Cannot read image\n";
        return 2;
    }
    // This example stretches to a square; use the transform your model expects.
    auto resized = image.Resize(224, 224);
    if (!resized.Write("resized.jpg")) {
        std::cerr << "Cannot write resized.jpg\n";
        return 3;
    }
    namespace task = inspirecv::task;
    task::PipelineOptions options;
    options.input_format = task::PixelFormat::kBgr;
    options.output_format = task::PixelFormat::kRgb;
    options.mean = {{127.5f, 127.5f, 127.5f, 0.0f}};
    options.scale = {{1.0f / 127.5f, 1.0f / 127.5f, 1.0f / 127.5f, 1.0f}};
    task::Pipeline pipeline(options);
    if (pipeline.ConfigurationStatus() != task::Status::kOk) return 4;

    std::vector<float> values(3 * 224 * 224);
    task::TensorBuffer tensor;
    tensor.data = values.data();
    tensor.width = 224;
    tensor.height = 224;
    tensor.channels = 3;
    tensor.element_type = task::ElementType::kFloat32;
    tensor.order = task::TensorOrder::kChw;
    const auto status = pipeline.Run(resized, tensor);
    if (status != task::Status::kOk) {
        std::cerr << task::StatusMessage(status) << '\n';
        return 5;
    }
    const auto range = std::minmax_element(values.begin(), values.end());
    std::cout << "RGB float tensor: 3 x 224 x 224, range ["
              << *range.first << ", " << *range.second << "]\n";
    return 0;
}
```

</details>

### Build configuration {#cv-cmake}

Set `CMAKE_PREFIX_PATH` to the InspireCV installation directory so CMake can find its package configuration.

<details>
<summary>inspirecv/CMakeLists.txt — Expand complete code</summary>

```cmake
cmake_minimum_required(VERSION 3.15)
project(inspirecv_docs_example LANGUAGES CXX)
find_package(InspireCV CONFIG REQUIRED)
add_executable(preprocess preprocess.cpp)
target_compile_features(preprocess PRIVATE cxx_std_14)
target_link_libraries(preprocess PRIVATE InspireCV::inspirecv)
```

</details>

## Apple: Objective-C and Swift {#apple-command-line}

These complete macOS command-line programs load one image, print its face boxes, and clean up on failure. Save them under `apple/` using the filenames below. Use a 1.2.4 CPU framework build and a `Pikachu` model file. Each program owns the runtime for its entire execution; an app instead keeps its runtime and session alive across frames.

::: tabs #api-language

@tab Objective-C

<details>
<summary>apple/detect.m — Expand complete code</summary>

```objectivec
#import <InspireFace/InspireFaceApple.h>

BOOL DetectFile(NSString *modelPath, NSString *imagePath,
                HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    if (![IFRuntime launchAtPath:modelPath error:error]) return NO;
    IFSession *session = nil;
    IFImageBitmap *bitmap = nil;
    IFImageStream *stream = nil;
    BOOL success = NO;
    do {
        session = [[IFSession alloc] initWithOptions:0
                                               mode:HF_DETECT_MODE_ALWAYS_DETECT
                                       maximumFaces:10
                                         pixelLevel:320
                                    framesPerSecond:-1
                                              error:error];
        if (!session) break;
        bitmap = [[IFImageBitmap alloc] initWithContentsOfFile:imagePath
                                                     channels:3 error:error];
        if (!bitmap) break;
        HFImageBitmapData pixels = {0};
        if (![bitmap getBorrowedData:&pixels error:error]) break;
        HFImageData input = {pixels.data, pixels.width, pixels.height,
                             HF_STREAM_BGR, HF_CAMERA_ROTATION_0};
        stream = [[IFImageStream alloc] initWithBorrowedData:input error:error];
        if (!stream) break;
        HFMultipleFaceData faces = {0};
        if (![session trackStream:stream borrowedResult:&faces error:error]) break;
        for (HInt32 i = 0; i < faces.detectedNum; ++i) {
            HFaceRect rect = faces.rects[i];
            NSLog(@"face %d: x=%d y=%d width=%d height=%d", i,
                  rect.x, rect.y, rect.width, rect.height);
        }
        *faceCount = faces.detectedNum;
        success = YES;
    } while (NO);
    [stream closeWithError:NULL];
    [bitmap closeWithError:NULL];
    [session closeWithError:NULL];
    [IFRuntime terminateWithError:NULL];
    return success;
}

#include <stdio.h>
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) { fprintf(stderr, "Usage: detect MODEL IMAGE\n"); return 2; }
        NSError *error = nil;
        HInt32 count = 0;
        if (!DetectFile([NSString stringWithUTF8String:argv[1]],
                        [NSString stringWithUTF8String:argv[2]], &count, &error)) {
            NSLog(@"%@ (%ld): %@", error.domain, (long)error.code, error.localizedDescription);
            return 1;
        }
        printf("Detected %d faces\n", count);
        return 0;
    }
}
```

</details>

@tab Swift

<details>
<summary>apple/detect.swift — Expand complete code</summary>

```swift
import Foundation
import InspireFaceSwift

func detectFile(modelPath: String, imagePath: String) throws -> Int {
    try InspireFaceRuntime.launch(path: modelPath)
    defer { try? InspireFaceRuntime.terminate() }
    let session = try FaceSession(configuration: SessionConfiguration(
        detectionMode: .alwaysDetect, maximumFaces: 10, pixelLevel: 320))
    defer { try? session.close() }
    let bitmap = try ImageBitmap(contentsOfFile: imagePath, channels: 3)
    defer { try? bitmap.close() }
    return try bitmap.withUnsafeMutablePixels { bytes, pixels in
        try ImageStream.withBorrowedBytes(
            bytes, width: pixels.width, height: pixels.height, format: .bgr
        ) { stream in
            try session.withUnsafeFaces(in: stream) { faces in
                for (index, rect) in faces.rectangles.enumerated() {
                    print("face \(index): x=\(rect.x) y=\(rect.y) " +
                          "width=\(rect.width) height=\(rect.height)")
                }
                return faces.count
            }
        }
    }
}

guard CommandLine.arguments.count == 3 else {
    print("Usage: detect MODEL IMAGE")
    exit(2)
}
do {
    let count = try detectFile(modelPath: CommandLine.arguments[1], imagePath: CommandLine.arguments[2])
    print("Detected \(count) faces")
} catch {
    let failure = error as NSError
    print("\(failure.domain) (\(failure.code)): \(failure.localizedDescription)")
    exit(1)
}
```

</details>

:::

### Compile and run {#compile-apple-examples}

Point `APPLE_SDK_DIR` to the directory containing both frameworks, either a single-architecture SDK directory or `Frameworks/macosx/` in the combined package. This example targets Apple Silicon and macOS 14, matching a build made with `MACOSX_DEPLOYMENT_TARGET=14.0`. For Intel, select `x86_64` and the minimum macOS version recorded for that SDK. The application target must be at least as new as the frameworks’ deployment target.

```bash
APPLE_SDK_DIR="/absolute/path/to/inspireface-apple-1.2.4/Frameworks/macosx"
APPLE_TARGET="arm64-apple-macosx14.0"
xcrun clang -target "$APPLE_TARGET" -fobjc-arc -fmodules apple/detect.m \
  -F "$APPLE_SDK_DIR" -framework InspireFace -framework Foundation \
  -framework CoreVideo -lc++ -Wl,-ObjC \
  -Wl,-rpath,"$APPLE_SDK_DIR" -o detect-objc
xcrun swiftc -target "$APPLE_TARGET" apple/detect.swift \
  -F "$APPLE_SDK_DIR" -framework InspireFace -framework InspireFaceSwift \
  -Xlinker -ObjC -Xlinker -rpath -Xlinker "$APPLE_SDK_DIR" \
  -o detect-swift
./detect-objc /path/to/Pikachu face.jpg
./detect-swift /path/to/Pikachu face.jpg
```

For an iOS or macOS application target, the [shared Apple guide](../using-with/apple.md#a-complete-detection-example) presents the same detection path as a function. Use the [iOS](../using-with/ios.md) or [macOS](../using-with/macos.md) guide to configure Xcode, model resources and camera input.

## Platform setup {#platform-projects}

The platform guides include dependency setup and code for their own input and resource handling:

- [Android](../using-with/android.md): Gradle dependencies, image input, camera frames and Java resource management.
- [iOS](../using-with/ios.md): device / simulator setup, Objective-C / Swift and camera buffers.
- [macOS](../using-with/macos.md): framework embedding, application resources and native libraries.
- [HarmonyOS](../using-with/harmonyos.md): ArkTS setup, image input and detection.
- [C](../using-with/c-cpp.md) and [C++](../using-with/cpp.md): SDK linking and native resource lifetime.
- [Python](../using-with/python.md): environment setup, detection and a local native build.

Use matching model, wrapper and native SDK versions when adapting the code.
