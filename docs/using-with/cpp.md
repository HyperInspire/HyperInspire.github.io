# C++

C++ applications can use either the [C API](./c-cpp.md) or the `inspire::Session` interface. Use the C API when you want an explicit ABI boundary. The C++ interface works directly with InspireCV image and geometry types; keep its headers, compiler ABI and native library matched.

Download the matching **1.2.4** SDK from [SDK downloads](../build/README.md#prebuilt-sdks). For a custom build, see [source preparation and options](../build/source.md), then choose [Windows](../build/windows.md), [Linux](../build/linux.md) or [macOS](../build/macos.md). This page covers linking and using the C++ API.

For an iOS or macOS app written in Objective-C or Swift, see the [Apple API guide](./apple.md). The native C/C++ integration below remains available with the headers and libraries from the same build.

## Build the example

The SDK must include `include/inspireface/` and `include/inspirecv/`. Source builds install these when `ISF_INSTALL_CPP_HEADER=ON`.

Save the [detection program below](#detection-with-automatic-cleanup) as `detect.cpp`, and save this configuration as `CMakeLists.txt` in the same directory.

<details>
<summary>CMakeLists.txt — Complete code</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_detection LANGUAGES CXX)

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

add_executable(detect_cpp detect.cpp)
target_compile_features(detect_cpp PRIVATE cxx_std_14)
target_link_libraries(detect_cpp PRIVATE InspireFaceSDK)

if(WIN32)
    get_target_property(ISF_LIBRARY_TYPE InspireFaceSDK TYPE)
    if(ISF_LIBRARY_TYPE STREQUAL "SHARED_LIBRARY")
        add_custom_command(TARGET detect_cpp POST_BUILD
            COMMAND "${CMAKE_COMMAND}" -E copy_if_different
                "$<TARGET_FILE:InspireFaceSDK>" "$<TARGET_FILE_DIR:detect_cpp>"
            VERBATIM)
    endif()
endif()
```

</details>

Run from that directory:

```bash
cmake -S . -B build \
  -DINSPIREFACE_ROOT=/path/to/InspireFace
cmake --build build --parallel
./build/detect_cpp /path/to/Pikachu /path/to/face.jpg
```

On Windows, open **x64 Native Tools Command Prompt for VS 2022**, then start PowerShell. With a Release x64 SDK, use the same files:

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release `
  "-DINSPIREFACE_ROOT=C:/SDKs/InspireFace"
cmake --build build --parallel 4
.\build\detect_cpp.exe C:\models\Pikachu C:\images\face.jpg
```

The Windows branch uses the SDK's installed CMake package. Its target supplies DLL import definitions and static dependencies, and the example copies a shared SDK's DLL beside the executable. Keep the SDK and application on the same architecture, build configuration and MSVC runtime. See [Windows deployment](./windows.md) for runtime installation. For paths with Chinese or other non-ASCII characters, use the [complete Windows example](./windows.md#a-complete-detection-program), which converts UTF-16 command-line arguments to UTF-8 before calling the SDK.

The program writes `detected-cpp.jpg`. The imported SDK target supplies the include directory and library path; no separate OpenCV dependency is needed.

### Build an SDK with C++ headers

The Windows build installs C++ headers by default; follow [Windows build](../build/windows.md) when using that platform. If another package only contains the C headers, build a matching SDK with C++ header installation enabled. After preparing the [source dependencies](../build/source.md), run from the InspireFace root:

```bash
cmake -S . -B build/cpp-sdk \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_INSTALL_CPP_HEADER=ON \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF
cmake --build build/cpp-sdk --parallel 4
cmake --install build/cpp-sdk
```

Use `build/cpp-sdk/install/InspireFace` as `INSPIREFACE_ROOT` in the example command. The application uses C++14 or newer. Keep the installed InspireFace and InspireCV headers from this build together: the SDK's C++ types are part of its ABI.

::: warning Match the C++ toolchain
Use compatible compiler, standard-library and architecture settings for the SDK and application. Undefined C++ symbols after a header upgrade often indicate mismatched binaries. The C interface is a useful integration boundary when different language runtimes or toolchains are involved.
:::

## Detection with automatic cleanup

<details>
<summary>detect.cpp — Complete code</summary>

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

`Session` is movable and non-copyable. The value returned by `Create` owns its implementation and releases it at the end of its scope. Check the return status of each processing call and handle configuration errors there.

## Image input with FrameProcess {#frameprocess-belongs-to-inspireface}

`inspirecv::FrameProcess` is declared in the InspireFace headers and wraps image input for the face SDK. For standalone image processing with InspireCV, use `Image` and `task::Pipeline`.

`FrameProcess::Create` takes **height before width** and borrows the input bytes. Its format enum is different from the C API and from `task::PixelFormat`; use the named enum from the interface you are calling.

Use `ROTATION_0` for normal file input or camera pixels already rotated upright. For unrotated camera input, set the rotation flag for the frame's orientation. See [image inputs](../guides/image-inputs.md).

## Enable optional analysis

Set the options when creating the session, then request the same or a smaller set during processing:

```cpp
inspire::CustomPipelineParameter options;
options.enable_face_quality = true;
options.enable_mask_detect = true;
auto session = inspire::Session::Create(
    inspire::DETECT_MODE_ALWAYS_DETECT, 10, options, 320);
std::vector<inspire::FaceTrackWrap> faces;
int status = session.FaceDetectAndTrack(frame, faces);
if (status == 0 && !faces.empty()) {
    status = session.MultipleFacePipelineProcess(frame, options, faces);
    if (status == 0) {
        auto quality = session.GetFaceQualityConfidence();
        auto masks = session.GetFaceMaskConfidence();
        // Consume quality and masks in the same order as faces.
    }
}
```

This block assumes a valid `frame` and a launched runtime. Other getters include `GetRGBLivenessConfidence`, `GetFaceInteractionState`, `GetFaceInteractionAction`, `GetFaceAttributeResult` and `GetFaceEmotionResult`.

See [Optional analysis](../guides/optional-analysis.md) for per-feature configuration and result handling across the supported APIs.

## CPU power mode {#cpu-power-mode}

Set the CPU inference policy through `Launch` before creating sessions. The default is `CPU_ENGINE_POWER_NORMAL`; `CPU_ENGINE_POWER_HIGH` and `CPU_ENGINE_POWER_LOW` are also available:

```cpp
#include <inspireface/launch.h>
#include <stdexcept>

void configureCpuEngine() {
    auto runtime = inspire::Launch::GetInstance();
    int status = runtime->SetGlobalCPUEnginePowerMode(
        inspire::Launch::CPU_ENGINE_POWER_NORMAL);
    if (status != 0) throw std::runtime_error("Cannot set CPU policy");
    auto selected = runtime->GetGlobalCPUEnginePowerMode();
    (void)selected;
}
```

Only subsequently initialized CPU runtimes use the new policy; existing runtimes, thread counts and precision stay unchanged. `Load`, `Reload` and `Unload` preserve the setting. Serialize configuration with session/model initialization. Use headers and a native build containing these CPU controls. See [CPU policy](./arm.md#cpu-power-mode) for what to measure when comparing modes.

## Extract features and landmarks

```cpp
// Recognition was enabled at session creation; frame matches faces.
if (faces.size() == 1) {
    auto landmarks = session.GetFaceDenseLandmark(faces[0]);
    auto alignment_points = session.GetFaceFiveKeyPoints(faces[0]);
    inspire::FaceEmbedding feature;
    int status = session.FaceFeatureExtract(frame, faces[0], feature);
    if (status == 0) {
        std::cout << feature.embedding.size() << " elements\n";
    }
}
```

The result wrapper stores face geometry by value. Retain the matching image for feature extraction. Use a separate session for each video sequence and process its frames on one worker.

Use the [recognition guide](../guides/recognition.md) for thresholds and gallery behavior. The [C API](./c-cpp.md) also provides FeatureHub, owned snapshots and face capture.

::: tip Scope the runtime outside all sessions
In the complete example, `RuntimeScope` is constructed before `session`, so the session is destroyed first. Use the same shutdown order in an application: stop frame workers, destroy sessions, then unload the runtime. Keep the image pixels alive for every operation that uses their frame.
:::

<figure>
  <a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg"><img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg" alt="Face boxes and landmarks drawn over a multi-face image" loading="lazy" style="display: block; width: min(100%, 640px); height: auto; margin: 0 auto;"></a>
  <figcaption>The detection program draws face boxes. Add the points returned by the landmark methods to draw the overlay shown here.</figcaption>
</figure>

## More examples {#explore-the-source-examples}

The [recognition guide](../guides/recognition.md) includes comparison and FeatureHub examples. [API recipes](../guides/api-recipes.md) covers alignment and diagnostics, and [InspireCV](../guides/inspirecv.md) includes image transformations. Expand the code on each page to copy it.

The public API headers are under `cpp/inspireface/include/inspireface`; use the headers installed with your SDK build.
