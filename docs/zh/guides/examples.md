# 完整示例 {#runnable-examples}

将下面的代码按标注的文件名保存，再运行对应命令。每个程序都读取本地图像或视频，完整代码默认收起，需要时展开即可复制。

按功能查找时，可以从 [API 功能索引](./api-coverage.md)进入跟踪、分析、关键点、识别、活体和抓拍指南，在 tab 中选择 C API、C++、Android、Python、HarmonyOS、Objective-C 或 Swift。[补充 API 示例](./api-recipes.md)介绍对齐图像、分数显示和诊断信息。

## Python {#python}

```bash
python -m pip install inspireface opencv-python
```

| 文件 | 用途 |
| --- | --- |
| [detect.py](#python-detection) | 打印人脸框并保存标注图像。 |
| [compare.py](#python-comparison) | 要求每张图像只有一张人脸，打印相似度和模型阈值。 |
| [capture.py](#python-capture) | 抓拍就绪后保存选中的完整帧。 |
| [benchmark.py](#python-benchmark) | 测量预热后的静态图片检测延迟。 |

抓拍和性能测量示例使用 1.2.4 封装及配套原生库，配置方法见[自定义原生库](../using-with/python.md#use-a-local-native-build)。

检测示例省略 `--model` 时可以下载默认 `Pikachu` 模型包，下面的其他命令使用明确的资源路径。图像无法读取属于错误；图像可读但未检测到人脸，是正常检测结果。

### 检测图像中的人脸 {#python-detection}

程序读取图像，打印每张人脸的位置与检测置信度，并在图像副本上画框保存。将代码保存为 `detect.py`。

<details>
<summary>detect.py — 展开完整代码</summary>

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

### 比对两张人脸 {#python-comparison}

比对程序要求每张图像恰好有一张人脸，无人脸或多人脸时会报错。输出包含余弦相似度和模型推荐阈值。将代码保存为 `compare.py`。

<details>
<summary>compare.py — 展开完整代码</summary>

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

### 从视频中选取抓拍帧 {#python-capture}

抓拍程序按视频时间戳处理连续帧，缓存候选图像，在抓拍就绪后保存选中的完整帧。尚未就绪就结束抓拍，或视频先结束时，程序会报错并停止。将代码保存为 `capture.py`。

<details>
<summary>capture.py — 展开完整代码</summary>

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

### 测量检测延迟 {#python-benchmark}

性能测量程序先预热 session，再对同一张图像重复检测，输出以毫秒为单位的中位数和 P95 延迟。可以用 `--runs` 和 `--warmup` 调整测量与预热次数。将代码保存为 `benchmark.py`。

<details>
<summary>benchmark.py — 展开完整代码</summary>

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

## C 与 C++ {#c-and-c}

将下面的 `detect.c`、`detect.cpp` 和 `CMakeLists.txt` 保存到同一目录。让 CMake 指向包含 `include/` 和 `lib/` 的已安装 SDK 目录：

```bash
cmake -S . -B build \
  -DINSPIREFACE_ROOT=/absolute/path/to/InspireFace \
  -DBUILD_CPP_EXAMPLE=ON
cmake --build build --parallel 4
./build/detect_c /path/to/Pikachu face.jpg
./build/detect_cpp /path/to/Pikachu face.jpg
```

C 示例打印人脸框，C++ 示例还会在当前工作目录生成 `detected-cpp.jpg`。如果 SDK 只包含 C 头文件，保持 `BUILD_CPP_EXAMPLE` 关闭。本文使用动态库；链接自定义静态 SDK 时，可能还需要链接它依赖的其他库。

[C 接入](../using-with/c-cpp.md)和 [C++ 接入](../using-with/cpp.md)介绍具体代码与资源生命周期。编译和运行时，使用同一次 SDK 构建产出的头文件与库。

### C 人脸检测 {#c-detection}

C 程序加载资源包和图像，完成检测后逐一释放句柄，最后关闭运行时。

<details>
<summary>detect.c — 展开完整代码</summary>

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

### C++ 人脸检测 {#cpp-detection}

C++ 程序用 `FrameProcess` 包装输入像素，完成检测后通过 InspireCV 绘制结果。局部对象在离开作用域时释放资源。

<details>
<summary>detect.cpp — 展开完整代码</summary>

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

### 构建配置 {#native-cmake}

这份 CMake 配置默认构建 C 程序，设置 `BUILD_CPP_EXAMPLE=ON` 后会同时构建 C++ 程序。

<details>
<summary>CMakeLists.txt — 展开完整代码</summary>

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

将下面的 `preprocess.cpp` 和对应的 `CMakeLists.txt` 保存到独立目录。安装 InspireCV 后运行：

```bash
cmake -S . -B build -DCMAKE_PREFIX_PATH=/absolute/path/to/inspirecv-install
cmake --build build --parallel 4
./build/preprocess face.jpg
```

程序保存缩放后的图像，并打印 RGB 浮点张量的尺寸和值域，展示图像读写、缩放、通道转换、归一化和 CHW 输出。如何按模型输入格式配置这些步骤，见 [InspireCV 指南](./inspirecv.md)。

### 图像预处理 {#cv-preprocessing}

输入图像会缩放到 224 × 224，从 BGR 转为 RGB，再按 `(value - 127.5) / 127.5` 归一化。输出张量采用 CHW 排列。

<details>
<summary>inspirecv/preprocess.cpp — 展开完整代码</summary>

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

### 构建配置 {#cv-cmake}

将 `CMAKE_PREFIX_PATH` 设为 InspireCV 的安装目录，CMake 就可以找到包配置。

<details>
<summary>inspirecv/CMakeLists.txt — 展开完整代码</summary>

```cmake
cmake_minimum_required(VERSION 3.15)
project(inspirecv_docs_example LANGUAGES CXX)
find_package(InspireCV CONFIG REQUIRED)
add_executable(preprocess preprocess.cpp)
target_compile_features(preprocess PRIVATE cxx_std_14)
target_link_libraries(preprocess PRIVATE InspireCV::inspirecv)
```

</details>

## Apple：Objective-C 与 Swift {#apple-command-line}

下面是两份完整的 macOS 命令行程序：读取一张图片，输出人脸框，并在失败时释放资源。按文件名保存到 `apple/` 目录，使用 1.2.4 CPU Framework 与 `Pikachu` 模型文件。每个程序独占本次执行的运行时；应用中则应在连续帧之间复用运行时和 Session。

::: tabs #api-language

@tab Objective-C

<details>
<summary>apple/detect.m — 展开完整代码</summary>

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
<summary>apple/detect.swift — 展开完整代码</summary>

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

### 编译并运行 {#compile-apple-examples}

将 `APPLE_SDK_DIR` 指向包含两个 Framework 的目录，可以是单架构 SDK 目录，也可以是合并包内的 `Frameworks/macosx/`。下面以 Apple Silicon、macOS 14 为目标，对应 `MACOSX_DEPLOYMENT_TARGET=14.0` 的构建。Intel 请改用 `x86_64`，并按该 SDK 记录的最低 macOS 版本设置 target。应用的部署版本不能低于 Framework 的要求。

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

在 iOS 或 macOS 应用 target 中，[Apple 接入指南](../using-with/apple.md#a-complete-detection-example)提供同一检测流程的函数形式。Xcode、模型资源与相机输入的配置分别见 [iOS](../using-with/ios.md) 和 [macOS](../using-with/macos.md)。

## 平台配置 {#platform-projects}

平台指南包含依赖配置，以及各平台的图像输入和资源管理代码：

- [Android](../using-with/android.md)：Gradle 依赖、图像输入、摄像头帧和 Java 资源管理。
- [iOS](../using-with/ios.md)：真机与模拟器配置、Objective-C / Swift 和相机缓冲区。
- [macOS](../using-with/macos.md)：Framework 嵌入、应用资源和原生库。
- [HarmonyOS](../using-with/harmonyos.md)：ArkTS 配置、图像输入和检测。
- [C](../using-with/c-cpp.md) 与 [C++](../using-with/cpp.md)：SDK 链接和原生资源生命周期。
- [Python](../using-with/python.md)：环境配置、人脸检测和本地原生库配置。

调整代码时，保持模型、封装与原生 SDK 版本配套。
