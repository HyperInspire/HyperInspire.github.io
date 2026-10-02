# Windows {#windows}

Windows supports **x64 CPU inference** through the C, C++ and Python APIs. Use Python for a quick test, or integrate the native SDK into a desktop application or service. Both paths use the same model packs and face-processing functions.

## Install the Python package {#install-the-python-package}

Use a 64-bit Python environment:

```powershell
python -m pip install inspireface opencv-python
```

The published `win_amd64` wheel includes the CPU DLL. It does not require Visual Studio or a local SDK build. Install the [Microsoft Visual C++ x64 Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) if it is not already present. Models remain separate resources. Use `inspireface.launch()` to initialize the runtime; the [complete Python example](./python.md) shows model selection and detection.

For a customized native library or a wheel of your own, see [Python packaging](../build/python.md#windows-wheel).

## Link an application {#link-an-application}

Follow [Build for Windows](../build/windows.md) to produce a matching x64 SDK. Keep its complete `InspireFace/include/`, `InspireFace/lib/` and CMake package together. The shared SDK contains:

<div class="sdk-table">

| File | Use |
| --- | --- |
| `libInspireFace.dll` | Runtime library; deploy it beside the application. |
| `InspireFace.lib` | Import library used at link time. |
| `lib/cmake/InspireFace/` | Installed CMake package, including include paths and DLL import definitions. |

</div>

The example below uses the C API from a C++ application. Save it as `detect_windows.cpp`, with this `CMakeLists.txt` alongside it:

<details>
<summary>CMakeLists.txt — Complete code</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_windows_example LANGUAGES CXX)

find_package(InspireFace CONFIG REQUIRED)
add_executable(detect_windows detect_windows.cpp)
target_compile_features(detect_windows PRIVATE cxx_std_14)
target_compile_options(detect_windows PRIVATE /utf-8)
target_link_libraries(detect_windows PRIVATE InspireFace::InspireFace)

get_target_property(ISF_LIBRARY_TYPE InspireFace::InspireFace TYPE)
if(ISF_LIBRARY_TYPE STREQUAL "SHARED_LIBRARY")
    add_custom_command(TARGET detect_windows POST_BUILD
        COMMAND "${CMAKE_COMMAND}" -E copy_if_different
            "$<TARGET_FILE:InspireFace::InspireFace>"
            "$<TARGET_FILE_DIR:detect_windows>"
        VERBATIM)
endif()
```

</details>

Open **x64 Native Tools Command Prompt for VS 2022**, start PowerShell, then run these commands from the application directory. Adjust `InspireFace_DIR` to your installed SDK:

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release `
  "-DInspireFace_DIR=C:/SDKs/InspireFace/lib/cmake/InspireFace"
cmake --build build --parallel 4
.\build\detect_windows.exe C:\models\Pikachu C:\images\face.jpg
```

The CMake target supplies the shared-library import definitions automatically. The post-build step copies the DLL beside `detect_windows.exe`; it also works when the SDK is moved to a new installation directory. Match the SDK and application architecture, Release / Debug configuration and MSVC runtime.

The same target can be linked to an application using the [native C++ API](./cpp.md). For a C-only source file, enable both `C` and `CXX` in the CMake project and use the C++ linker for static SDK dependencies; see the [C API example](./c-cpp.md).

## A complete detection program {#a-complete-detection-program}

This program loads one model pack, detects faces in a JPEG or PNG, and prints their boxes. Image decoding uses the SDK, so OpenCV is not required. `wmain` receives Windows Unicode arguments and converts them to UTF-8 with [`WideCharToMultiByte`](https://learn.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte) before passing paths to the SDK.

<details>
<summary>detect_windows.cpp — Complete code</summary>

```cpp
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <inspireface.h>
#include <cstdio>
#include <exception>
#include <stdexcept>
#include <string>

static std::string utf8_path(const wchar_t* path) {
    int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS,
        path, -1, nullptr, 0, nullptr, nullptr);
    if (size == 0) throw std::runtime_error("Cannot convert path to UTF-8");
    std::string result(static_cast<size_t>(size), '\0');
    if (WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS,
            path, -1, &result[0], size, nullptr, nullptr) == 0) {
        throw std::runtime_error("Cannot convert path to UTF-8");
    }
    result.pop_back();
    return result;
}

static int detect(const char* model, const char* image) {
    HFSession session = nullptr;
    HFImageBitmap bitmap = nullptr;
    HFImageStream stream = nullptr;
    HFMultipleFaceData faces = {};
    HResult status = HFLaunchInspireFace(model);
    int result = 1;
    if (status != HSUCCEED) {
        std::fprintf(stderr, "Launch failed: %ld\n", static_cast<long>(status));
        return result;
    }

    status = HFCreateInspireFaceSessionOptional(
        HF_ENABLE_NONE, HF_DETECT_MODE_ALWAYS_DETECT, 10, -1, -1, &session);
    if (status != HSUCCEED) goto cleanup;
    status = HFCreateImageBitmapFromFilePath(image, 3, &bitmap);
    if (status != HSUCCEED) goto cleanup;
    status = HFCreateImageStreamFromImageBitmap(bitmap, HF_CAMERA_ROTATION_0, &stream);
    if (status != HSUCCEED) goto cleanup;
    status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED) goto cleanup;

    std::printf("Detected %d faces\n", faces.detectedNum);
    for (HInt32 i = 0; i < faces.detectedNum; ++i) {
        const HFaceRect& box = faces.rects[i];
        std::printf("face %d: x=%d y=%d width=%d height=%d confidence=%.3f\n",
            i, box.x, box.y, box.width, box.height, faces.detConfidence[i]);
    }
    result = 0;

cleanup:
    if (status != HSUCCEED) {
        std::fprintf(stderr, "InspireFace error: %ld\n", static_cast<long>(status));
    }
    if (stream) HFReleaseImageStream(stream);
    if (bitmap) HFReleaseImageBitmap(bitmap);
    if (session) HFReleaseInspireFaceSession(session);
    HFTerminateInspireFace();
    return result;
}

int wmain(int argc, wchar_t** argv) {
    if (argc != 3) {
        std::fprintf(stderr, "Usage: detect_windows <resource-pack> <image>\n");
        return 2;
    }
    try {
        const std::string model = utf8_path(argv[1]);
        const std::string image = utf8_path(argv[2]);
        return detect(model.c_str(), image.c_str());
    } catch (const std::exception& error) {
        std::fprintf(stderr, "%s\n", error.what());
        return 1;
    }
}
```

</details>

Download the CPU [Pikachu model pack](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Pikachu), save it as `C:\models\Pikachu`, and supply your image as the second argument. Paths containing spaces must be quoted in PowerShell. The model is a file, not a directory, and stays separate from the DLL.

The example uses `ALWAYS_DETECT` for independent images. For a camera stream, initialize once and reuse a tracking session; see [Sessions and tracking](../guides/tracking.md). Recognition, landmarks and the face pipeline use the same C and C++ interfaces as on the other CPU platforms.

## Deploy the application {#deploy-the-application}

A shared Release application needs these runtime files:

```text
application/
  detect_windows.exe
  libInspireFace.dll
  models/
    Pikachu
```

Install the [Microsoft Visual C++ x64 Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) on the target machine. The default SDK links the inference dependency into `libInspireFace.dll`; there is no separate inference DLL to copy. If your own build enables other shared dependencies, include their runtime files too.

::: warning Release and Debug runtimes
The redistributable supplies the Release runtime. Debug builds depend on Visual Studio's debug runtime and are intended for development. Test the deployed Release app on a machine without your SDK build directories on `PATH`.
:::

For a static SDK, use its installed CMake target so the static inference library is linked too. Static SDK linkage and static MSVC runtime linkage are separate choices; keep the runtime settings consistent across the application and its libraries.

### Loading and path errors {#loading-and-path-errors}

<div class="sdk-table">

| Symptom | Check |
| --- | --- |
| The DLL exists but cannot be loaded | Install the x64 Visual C++ runtime and check the DLL's dependencies with `dumpbin /DEPENDENTS`. |
| Error 193 or an invalid Win32 application | The executable, Python process and SDK must all be x64. |
| Unresolved external symbols | Link the matching import library through `InspireFace::InspireFace`; do not link against a DLL file directly. |
| Model or image fails to open | Pass an existing file path in UTF-8; use an absolute path to avoid working-directory surprises. |

</div>

`HResult` is a C `long`, which is 32 bits on Windows x64. Handles are 64-bit pointers, and `HFaceId` is `int64_t`. Keep these distinctions when writing bindings; changing every C value to 64 bits breaks the ABI. Use `%ld` for a value explicitly cast to `long`, as in the example above.
