# C++ {#c}

C++ 应用可以使用 [C API](./c-cpp.md) 或 `inspire::Session` 接口。需要明确的 ABI 边界时可使用 C API；C++ 接口直接使用 InspireCV 的图像和几何类型，需要保证头文件、编译器 ABI 和原生库配套。

先在 [SDK 下载](../build/README.md#prebuilt-sdks)中选择匹配的 **1.2.4** 包。需要自定义构建时，从[源码准备与通用选项](../build/source.md)开始，再选择 [Linux](../build/linux.md) 或 [macOS](../build/macos.md)。本页介绍应用链接和 C++ API 用法。

使用 Objective-C 或 Swift 开发 iOS、macOS 应用时，可以从 [Apple API 指南](./apple.md)开始。下面的 C/C++ 接入方式仍可使用，头文件与库需来自同一构建。

## 构建示例 {#build-the-example}

SDK 需要包含 `include/inspireface/` 和 `include/inspirecv/`。源码构建设置 `ISF_INSTALL_CPP_HEADER=ON` 时会安装这些头文件。

将[下方检测程序](#detection-with-automatic-cleanup)保存为 `detect.cpp`，再将下面的配置保存为同一目录下的 `CMakeLists.txt`。

<details>
<summary>CMakeLists.txt — 完整代码</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_detection LANGUAGES CXX)

set(INSPIREFACE_ROOT "" CACHE PATH "SDK directory containing include/ and lib/")
find_path(ISF_INCLUDE_DIR inspireface/inspireface.hpp PATHS "${INSPIREFACE_ROOT}/include" NO_DEFAULT_PATH REQUIRED)
find_library(ISF_LIBRARY NAMES InspireFace PATHS "${INSPIREFACE_ROOT}/lib" NO_DEFAULT_PATH REQUIRED)
add_library(InspireFaceSDK UNKNOWN IMPORTED)
set_target_properties(InspireFaceSDK PROPERTIES
    IMPORTED_LOCATION "${ISF_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${ISF_INCLUDE_DIR}")

add_executable(detect_cpp detect.cpp)
target_compile_features(detect_cpp PRIVATE cxx_std_14)
target_link_libraries(detect_cpp PRIVATE InspireFaceSDK)
```

</details>

在该目录运行：

```bash
cmake -S . -B build \
  -DINSPIREFACE_ROOT=/path/to/InspireFace
cmake --build build --parallel
./build/detect_cpp /path/to/Pikachu /path/to/face.jpg
```

程序生成 `detected-cpp.jpg`。导入的 SDK target 提供头文件目录和库路径，不需要单独依赖 OpenCV。

### 构建包含 C++ 头文件的 SDK {#build-an-sdk-with-c-headers}

如果下载包只有 C 头文件，可以启用 C++ 头文件安装后构建配套 SDK。[准备源码依赖](../build/source.md)后，在 InspireFace 根目录运行：

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

示例命令中的 `INSPIREFACE_ROOT` 指向 `build/cpp-sdk/install/InspireFace`。应用使用 C++14 或更高版本，并保留同一构建输出的 InspireFace 与 InspireCV 头文件；SDK 的 C++ 类型属于其 ABI 的一部分。

::: warning 保持 C++ 工具链兼容
SDK 与应用的编译器、标准库和架构设置需要兼容。更新头文件后出现未定义的 C++ 符号，常见原因是二进制不匹配。涉及不同语言运行环境或工具链时，可以通过 C 接口建立集成边界。
:::

## 自动清理资源的检测程序 {#detection-with-automatic-cleanup}

<details>
<summary>detect.cpp — 完整代码</summary>

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

`Session` 支持移动，不支持复制。`Create` 返回的值对象管理内部实现，并在作用域结束时释放资源。检查每次处理调用的返回状态，在此处理配置或运行错误。

## 使用 FrameProcess 输入图像 {#frameprocess-belongs-to-inspireface}

`inspirecv::FrameProcess` 声明在 InspireFace 头文件中，用来包装人脸 SDK 的图像输入。单独使用 InspireCV 进行图像处理时，使用 `Image` 和 `task::Pipeline`。

`FrameProcess::Create` 的参数顺序是**先高后宽**，并借用输入字节。其格式枚举与 C API、`task::PixelFormat` 不同，应使用当前接口对应的具名枚举。

普通文件或已经转正的摄像头像素使用 `ROTATION_0`。直接传入原始摄像头帧时，根据帧方向设置旋转标志。详见[图像输入](../guides/image-inputs.md)。

## 启用可选分析 {#enable-optional-analysis}

创建会话时设置选项，处理时请求相同或更少的选项：

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

代码假设 `frame` 有效，运行环境已启动。其他 getter 包括 `GetRGBLivenessConfidence`、`GetFaceInteractionState`、`GetFaceInteractionAction`、`GetFaceAttributeResult` 和 `GetFaceEmotionResult`。

各项分析的配置与结果读取方式见[可选分析](../guides/optional-analysis.md)，其中提供不同 API 的对照示例。

## CPU 运行策略 {#cpu-power-mode}

在创建 Session 前，通过 `Launch` 设置 CPU 推理策略。默认是 `CPU_ENGINE_POWER_NORMAL`，也可选择 `CPU_ENGINE_POWER_HIGH` 或 `CPU_ENGINE_POWER_LOW`：

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

配置只影响随后初始化的 CPU 运行时，已有运行时、线程数与数值精度保持不变。`Load`、`Reload` 和 `Unload` 不重置该设置；不要与会话或模型初始化并发修改。该接口需要包含最新 CPU 配置方法的头文件与原生库。如何对比不同模式见 [CPU 运行策略](./arm.md#cpu-power-mode)。

## 提取特征与关键点 {#extract-features-and-landmarks}

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

结果对象按值保存人脸几何信息，提取特征时保留对应图像。每个视频序列使用独立会话，并由一个工作线程按顺序处理。

阈值与特征库行为见[识别指南](../guides/recognition.md)。[C API](./c-cpp.md)也提供 FeatureHub、独立管理生命周期的检测快照和抓拍接口，可以按应用需要选择。

::: tip 先销毁会话，再卸载运行环境
完整示例先创建 `RuntimeScope`，再创建 `session`，退出作用域时会先销毁会话。应用按同样的顺序退出：停止帧处理线程、销毁会话，最后卸载运行环境。使用 frame 的所有操作结束后，再释放其借用的图像像素。
:::

<figure>
  <a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg"><img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg" alt="将人脸框和关键点绘制在多人图像上的示例" loading="lazy" style="display: block; width: min(100%, 640px); height: auto; margin: 0 auto;"></a>
  <figcaption>检测程序绘制人脸框。再将关键点接口返回的点位叠加到图像上，即可绘制图示的关键点。</figcaption>
</figure>

## 更多示例 {#explore-the-source-examples}

[识别指南](../guides/recognition.md)提供比对与 FeatureHub 示例，[API 实用示例](../guides/api-recipes.md)介绍人脸对齐和诊断，[InspireCV](../guides/inspirecv.md)包含图像变换示例。各页代码可直接展开、复制。

公开 API 头文件位于 `cpp/inspireface/include/inspireface`，接入时使用 SDK 构建安装的配套头文件。
