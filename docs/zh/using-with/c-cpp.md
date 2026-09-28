# C API {#c-api}

C API 为原生应用和语言绑定提供检测、跟踪、识别与分析功能，也可以在 C++ 中使用。创建句柄后检查返回状态，在最后一次使用后释放一次。

SDK 版本、下载链接和各平台编译方法见[获取和编译](../build/README.md)。

## 链接 SDK {#link-the-sdk}

从[发布页](https://github.com/HyperInspire/InspireFace/releases)下载匹配的 SDK，或[自行构建](../build/source.md)。找到包含 `include/inspireface.h` 和 `lib/libInspireFace.so` 的目录，macOS 对应 `.dylib`。

将[下方检测程序](#a-complete-detection-program)保存为 `detect.c`，再将下面的配置保存为同一目录下的 `CMakeLists.txt`。

<details>
<summary>CMakeLists.txt — 完整代码</summary>

```cmake
cmake_minimum_required(VERSION 3.20)
project(inspireface_detection LANGUAGES C)

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
```

</details>

在该目录运行：

```bash
cmake -S . -B build -DINSPIREFACE_ROOT=/path/to/InspireFace
cmake --build build --parallel
./build/detect_c /path/to/Pikachu /path/to/face.jpg
```

这份 CMake 配置将 SDK 导入为库目标。部署时，将运行库放到操作系统的库搜索路径中，配置方法见[库加载](../guides/troubleshooting.md#library-import-or-loading-fails)。

### 头文件与运行库保持配套 {#keep-headers-and-runtime-together}

可以按下面的结构整理工作目录：

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

将 `INSPIREFACE_ROOT` 指向这里的 `sdk` 目录。macOS 库名为 `libInspireFace.dylib`。保留同一 SDK 包中完整的 `include/` 和 `lib/` 目录。

配置可执行文件的运行时搜索路径，让它加载随应用打包的 SDK 库。模型作为独立文件保留，在启动运行环境时传入路径。

::: tip 先使用动态库 SDK 跑通示例
上面的 CMake 配置链接一个动态 SDK 库。使用静态构建时，在应用最终链接阶段一并提供该构建所需的推理库、线程库和平台依赖。
:::

## 完整的检测程序 {#a-complete-detection-program}

下面通过 SDK 的位图接口读取图像，不需要 OpenCV，可以按 C99 编译。

<details>
<summary>detect.c — 完整代码</summary>

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

输出 `HResult` 时，先转换为 `long`，再使用 `%ld`。成功状态为 `HSUCCEED`；根据状态码处理错误，并在诊断日志中保留它。

<figure>
  <a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg"><img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg" alt="原示例中多张人脸的检测框与稠密关键点叠加结果" loading="lazy" style="display: block; width: min(100%, 640px); height: auto; margin: 0 auto;"></a>
  <figcaption>原示例中的检测与关键点可视化。上面的程序打印检测框；需要显示点位时，再读取关键点并通过自己的绘制层叠加。</figcaption>
</figure>

## 会话配置 {#session-configuration}

`HF_ENABLE_NONE` 即可使用检测与跟踪。附加模型在创建会话时选择：

| Option | 启用后可获得的结果 |
| --- | --- |
| `HF_ENABLE_FACE_RECOGNITION` | 提取人脸特征向量，用于比对和检索。 |
| `HF_ENABLE_QUALITY` | 评估人脸图像质量。 |
| `HF_ENABLE_LIVENESS` | 获取 RGB 活体分数。 |
| `HF_ENABLE_MASK_DETECT` | 获取佩戴口罩的置信度。 |
| `HF_ENABLE_INTERACTION` | 获取睁闭眼状态和连续帧中的动作事件。 |
| `HF_ENABLE_FACE_POSE` | 在检测结果中读取人脸姿态角。 |
| `HF_ENABLE_FACE_ATTRIBUTE` | 获取属性类别索引。 |
| `HF_ENABLE_FACE_EMOTION` | 获取表情类别索引。 |

使用 `|` 组合选项，并按资源包包含的模型选择功能。检测后，可以从人脸结果读取稠密关键点。

检测级别设为 `-1` 可使用模型包默认值，或在启动后调用 `HFQuerySupportedPixelLevelsForFaceDetection` 查询支持的级别。[会话与跟踪](../guides/tracking.md)解释检测级别、原始分辨率和跟踪预览尺寸之间的区别。

| Parameter | 选择方式 |
| --- | --- |
| `detectMode` | 独立照片使用 `HF_DETECT_MODE_ALWAYS_DETECT`；连续视频使用跟踪模式并保持帧顺序。 |
| `maxDetectFaceNum` | 检测和跟踪的人脸数量上限。 |
| `detectPixelLevel` | 选择模型包支持的检测级别，与原始图像尺寸是两项设置。 |
| `trackByDetectModeFPS` | Tracking-by-detection 使用的帧率设置；`-1` 保留默认值。 |

::: tip 配置一次，连续处理
应用启动时加载资源包，每个独立视频流创建一个会话，然后逐帧创建或更新图像流。每帧重建会话会增加启动开销，也无法积累时序跟踪状态。
:::

### V2 配置结构体 {#versioned-configuration}

C API level 2 增加了 `HFSessionConfigV2`，适合需要固定布局结构体的语言绑定。早期创建函数仍可使用。

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

保留字段保持为零，头文件和原生库均使用 API level 2 版本。

## 图像缓冲区与内存归属 {#image-buffers-and-ownership}

| Object / result | 生命周期与释放方式 |
| --- | --- |
| Raw image stream | 通过 `HFCreateImageStream` 创建，直接引用输入缓冲区；释放流或替换缓冲区前，保持内存有效且内容不变。 |
| `HFImageBitmap` | 持有像素存储，通过 `HFReleaseImageBitmap` 释放。 |
| Bitmap image stream | 从位图创建时复制像素，使用后通过 `HFReleaseImageStream` 释放。 |
| `HFMultipleFaceData` | 由 `HFExecuteFaceTrack` 返回，数组与 token 由会话管理；需在下一次跟踪前读取或复制，不能自行释放指针。 |
| `HFFaceResultSnapshot` | 独立持有结果，通过 `HFReleaseFaceResultSnapshot` 释放；不保留输入图像。 |
| Pipeline result getters | 返回会话中的结果缓冲区，需在下一次分析调用前读取。 |

::: warning 快照与借用结果
快照会复制检测结果，生命周期更清晰，保留结果或延后处理时更容易管理，也能减少生命周期处理出错的风险，但会增加复制开销和延时。原始像素仍需单独保留。

单路视频按顺序跟踪时，可以在下一次跟踪前读完 `HFExecuteFaceTrack` 返回的借用结果 `HFMultipleFaceData`，省去检测结果的复制。后续调用可能覆盖其中的数组和 token，不适合跨帧保留或交叉复用这些指针。
:::

缓冲区布局与延后处理方式，详见[图像输入](../guides/image-inputs.md)和[架构与生命周期](../guides/arch.md)。

<figure>
  <a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pipeline.png"><img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pipeline.png" alt="C API 从模型启动到会话和图像流释放的调用时序" loading="lazy" style="display: block; width: min(100%, 560px); height: auto; margin: 0 auto;"></a>
  <figcaption>原生接口调用顺序。视频处理只重复图像准备、检测、可选 Pipeline 和结果读取，帧间保留运行环境与会话。点击图片可查看原尺寸。</figcaption>
</figure>

::: tip 每个工作线程使用独立会话
为每个工作线程创建自己的会话，并按顺序执行调用。向其他线程传递结果前，先在本次跟踪或 Pipeline 结果有效时复制所需数据。
:::

## 人脸分析流水线 {#face-pipeline}

先检测，再对这些人脸执行可选分析。下面假设 `session`、`stream` 和 `faces` 仍然有效，并且创建会话时已启用 `HF_ENABLE_QUALITY`：

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

分析请求必须是会话已启用选项的子集。结果索引对应传入的人脸列表，访问数组前检查 getter 的状态和数量。

| Analysis | Result getter |
| --- | --- |
| RGB liveness | `HFGetRGBLivenessConfidence` |
| Mask | `HFGetFaceMaskConfidence` |
| Quality | `HFGetFaceQualityConfidence` |
| Eye state | `HFGetFaceInteractionStateResult` |
| Actions | `HFGetFaceInteractionActionsResult` |
| Attributes | `HFGetFaceAttributeResult` |
| Expression | `HFGetFaceEmotionResult` |

质量、口罩、姿态、属性与表情的完整写法见[可选分析](../guides/optional-analysis.md)，可以切换 C、C++、Python 和 Android 示例。

## 提取独立持有的特征 {#extract-an-owned-embedding}

`HFFaceFeatureExtract` 返回会话缓存，后续提取可能覆盖其内容。如果向量需要跨越后续调用保留，使用 `HFCreateFaceFeature` 和 `HFFaceFeatureExtractTo`：

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

通过 `HFCreateFaceFeature` 分配的特征使用 `HFReleaseFaceFeature` 释放。借用的结果向量由会话或 FeatureHub 管理其存储。

使用 `HFFaceComparison` 比较两份特征，通过 `HFGetRecommendedCosineThreshold` 获取模型的推荐阈值，再根据实际样本调整。[识别指南](../guides/recognition.md)介绍录入、检索模式和持久化。

## 更多接口说明 {#more-api-details}

- [稠密关键点](../guides/dense-landmark.md)：查询点数和读取对齐关键点。
- [活体检测](../guides/liveness-detection.md)：RGB 评分和动作信号。
- [人脸抓拍](../guides/face-capture.md)：API level 2 中的快照与帧选择。
- [常见问题](../guides/troubleshooting.md)：错误、模型包和运行诊断。

完整声明与结构体字段见 [`inspireface.h`](https://github.com/HyperInspire/InspireFace/blob/master/cpp/inspireface/c_api/inspireface.h)。接入某个 SDK 二进制时，以随包提供的头文件为准。
