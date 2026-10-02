# Windows {#windows}

Windows 支持通过 C、C++ 和 Python 接口进行 **x64 CPU 推理**。快速体验可使用 Python；桌面应用或服务可以直接接入原生 SDK。两种方式使用相同的模型包和人脸处理功能。

## 安装 Python 包 {#install-the-python-package}

使用 64 位 Python 环境：

```powershell
python -m pip install inspireface opencv-python
```

已发布的 `win_amd64` wheel 包含 CPU DLL，无需安装 Visual Studio，也不用在本机编译 SDK。如果系统尚未安装运行库，请安装 [Microsoft Visual C++ x64 Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)。模型是单独的资源，使用 `inspireface.launch()` 初始化运行时；模型选择和检测流程见[完整 Python 示例](./python.md)。

需要自定义原生库或制作自己的 wheel 时，见 [Python 打包](../build/python.md#windows-wheel)。

## 链接应用 {#link-an-application}

按 [Windows 构建](../build/windows.md)生成配套的 x64 SDK。保留完整的 `InspireFace/include/`、`InspireFace/lib/` 和 CMake 包。动态 SDK 中各文件的用途如下：

<div class="sdk-table">

| File | 用途 |
| --- | --- |
| `libInspireFace.dll` | 运行时动态库，部署时放在应用旁。 |
| `InspireFace.lib` | 链接阶段使用的导入库。 |
| `lib/cmake/InspireFace/` | CMake 安装包，提供头文件路径和 DLL 导入定义。 |

</div>

下面的示例在 C++ 应用中调用 C API。将程序保存为 `detect_windows.cpp`，并在同一目录创建以下 `CMakeLists.txt`：

<details>
<summary>CMakeLists.txt — 完整代码</summary>

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

打开 **x64 Native Tools Command Prompt for VS 2022**，启动 PowerShell，再在应用目录执行。将 `InspireFace_DIR` 改为自己的 SDK 安装路径：

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release `
  "-DInspireFace_DIR=C:/SDKs/InspireFace/lib/cmake/InspireFace"
cmake --build build --parallel 4
.\build\detect_windows.exe C:\models\Pikachu C:\images\face.jpg
```

CMake target 会自动传递动态库需要的导入定义。构建完成后，DLL 会复制到 `detect_windows.exe` 旁；即使 SDK 换了安装目录，也会从新的路径取用。SDK 与应用的架构、Release / Debug 配置和 MSVC 运行库需要一致。

使用[原生 C++ API](./cpp.md)时，也可以链接同一个 target。若程序文件是纯 C，在 CMake 项目中同时启用 `C` 和 `CXX`，并使用 C++ 链接器处理静态 SDK 依赖，见 [C API 示例](./c-cpp.md)。

## 完整检测程序 {#a-complete-detection-program}

程序加载一个模型包，检测 JPEG 或 PNG 中的人脸并输出检测框。图像解码使用 SDK，无需 OpenCV。`wmain` 接收 Windows Unicode 参数，再通过 [`WideCharToMultiByte`](https://learn.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte) 将路径转为 UTF-8 传给 SDK。

<details>
<summary>detect_windows.cpp — 完整代码</summary>

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

下载 CPU 版 [Pikachu 模型包](https://github.com/HyperInspire/InspireFace/releases/download/v1.x/Pikachu)，保存为 `C:\models\Pikachu`，将自己的图像路径作为第二个参数。路径含空格时，在 PowerShell 中用引号括起来。模型是一个文件，不是目录，也不包含在 DLL 中。

示例使用 `ALWAYS_DETECT` 处理独立图像。接入摄像头时，在初始化后复用跟踪 Session，见[会话与跟踪](../guides/tracking.md)。识别、关键点和 Face Pipeline 与其他 CPU 平台使用相同的 C 和 C++ 接口。

## 部署应用 {#deploy-the-application}

动态 Release 应用需要以下运行文件：

```text
application/
  detect_windows.exe
  libInspireFace.dll
  models/
    Pikachu
```

目标机器需安装 [Microsoft Visual C++ x64 Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)。默认 SDK 已将推理依赖链接到 `libInspireFace.dll`，不需要额外复制推理 DLL。自行启用其他动态依赖时，也要带上相应的运行文件。

::: warning Release 与 Debug 运行库
Redistributable 提供 Release 运行库。Debug 依赖 Visual Studio 的调试运行库，适合开发调试。部署测试时，请在 `PATH` 中没有 SDK 构建目录的环境运行 Release 应用。
:::

静态 SDK 也通过安装包的 CMake target 链接，由它传入静态推理库。SDK 静态链接与 MSVC 运行库静态链接是两项独立设置，应用和各库的运行库选项仍需保持一致。

### 加载与路径问题 {#loading-and-path-errors}

<div class="sdk-table">

| Symptom | 检查方法 |
| --- | --- |
| DLL 存在，但加载失败 | 安装 x64 Visual C++ 运行库，并用 `dumpbin /DEPENDENTS` 检查 DLL 依赖。 |
| Error 193 或提示不是有效的 Win32 应用 | 可执行文件、Python 进程和 SDK 都必须使用 x64。 |
| Unresolved external symbols | 通过 `InspireFace::InspireFace` 链接匹配的导入库，不要直接将 DLL 文件用于链接。 |
| 模型或图像打不开 | 传入存在的文件路径，编码使用 UTF-8；使用绝对路径可避免工作目录变化的影响。 |

</div>

`HResult` 对应 C 的 `long`，在 Windows x64 中仍是 32 位；handle 是 64 位指针，`HFaceId` 则是 `int64_t`。编写绑定时保留这些区别，不要将所有 C 类型统一改成 64 位，否则会破坏 ABI。上面的示例先将状态码转换为 `long`，再用 `%ld` 输出。
