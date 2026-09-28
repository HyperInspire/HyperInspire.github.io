# Rockchip NPU {#rockchip-npu}

Rockchip 部署需要板端 CPU ABI 对应的原生 SDK、SoC 对应的 NPU 模型包，以及板端 RK 运行库和内核驱动。模型包与构建脚本的对应关系见下表。

[Rockchip 构建章节](../build/rockchip.md)介绍各板型的工具链、Linux / Android 产物和原生依赖。

检测、跟踪、识别和 FeatureHub 使用常规 SDK 接口。RKNN 负责模型推理，RGA 负责缩放、旋转等图像操作，分别配置。

## 选择目标设备 {#select-the-target}

| Device family | Model pack | Build script |
| --- | --- | --- |
| RV1109 / RV1126 | `Gundam_RV1109` | `build_cross_rv1109rv1126_armhf.sh` |
| RV1106 | `Gundam_RV1106` | `build_cross_rv1106_armhf_uclibc.sh` |
| RK3566 / RK3568 | `Gundam_RK356X` | `build_cross_rk356x_rk3588_aarch64.sh` |
| RK3588 | `Gundam_RK3588` | `build_cross_rk356x_rk3588_aarch64.sh` |

脚本位于 `command/`，从仓库根目录运行。RK356x 与 RK3588 共用 aarch64 构建脚本，模型包按 SoC 分别选择。

## 交叉编译 {#cross-compile}

准备[源码依赖](../build/source.md)，以及兼容板端根文件系统的 Linux 交叉工具链。RK356x/RK3588 示例：

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/absolute/path/to/aarch64-toolchain
bash command/build_cross_rk356x_rk3588_aarch64.sh
bash command/download_models_general.sh Gundam_RK3588
```

工具链目录必须包含脚本使用的编译器名称，例如 `bin/aarch64-linux-gnu-gcc` 和 `bin/aarch64-linux-gnu-g++`。输出汇总到 `build/inspireface-linux-aarch64-rk356x-rk3588/InspireFace`，可选的 `VERSION` 值会添加目录后缀。

RV1106 使用 Rockchip 的 `arm-rockchip830-linux-uclibcgnueabihf` 工具链与脚本中的 uClibc 配置。应用及其依赖均按板端相同的 libc 构建。

设备上将 SDK 和配套 RK 运行库放到应用库目录或系统加载路径。使用板端提供的 `ldd` 定位缺失依赖，并通过板卡系统配置 NPU 驱动和设备访问权限。

## 从静态图片开始 {#start-with-a-still-image}

连接摄像头前，先用 [C 检测示例](./c-cpp.md)和选定的 `Gundam_*` 模型包测试，将 NPU 初始化与摄像头步长、方向和 DMA 问题分开。

模型加载失败时，一并检查 SoC、模型包、RK 运行库版本和内核驱动消息，确认模型为对应的 SoC 与运行时转换。

### 编译并复制设备端示例 {#build-and-copy-a-device-example}

将下面两段代码分别保存为同一目录下的 `detect.c` 和 `CMakeLists.txt`。程序读取图片并打印人脸框。

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

使用构建 SDK 时的同一套 aarch64 工具链，在主机上交叉编译应用：

```bash
cmake -S . -B build-rk \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_SYSTEM_PROCESSOR=aarch64 \
  -DCMAKE_C_COMPILER="$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-gcc" \
  -DINSPIREFACE_ROOT=/absolute/path/to/inspireface-linux-aarch64-rk356x-rk3588/InspireFace
cmake --build build-rk --parallel 4
```

如果板卡 SDK 提供了 CMake toolchain 文件与 sysroot，两次构建都使用这套配置。上面的命令对应仓库 aarch64 脚本所用的编译器目录结构。

将 `build-rk/detect_c`、安装后的 SDK 目录、所选模型包与测试图片复制到设备，整理为：

```text
inspireface-demo/
  detect_c
  sdk/lib/
  models/Gundam_RK3588
  images/face.jpg
```

在 RK3588 设备上进入该目录运行：

```bash
export LD_LIBRARY_PATH="$PWD/sdk/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
./detect_c models/Gundam_RK3588 images/face.jpg
```

RK3566/RK3568 使用 `Gundam_RK356X`。将配套 SDK 与运行库放在应用的 `sdk/lib` 目录，通过上面的路径设置加载。

::: tip 先检查加载器，再检查模型
`Exec format error` 通常指向可执行文件架构；缺少共享库则先查部署路径与运行时依赖。进程能够启动后，再依次检查模型兼容性、NPU 初始化和图像输入。
:::

## 配置 RGA {#configure-rga-deliberately}

aarch64 和 RV1106 脚本在启用 `ISF_ENABLE_RKNN` 的同时启用 `ISF_ENABLE_RGA`。运行时先查询构建支持，并在创建会话前选择图像后端：

```c
HInt32 built_with_rga = 0;
HResult status = HFQueryExpansiveHardwareRGACompileOption(&built_with_rga);
if (status == HSUCCEED && built_with_rga) {
    status = HFSwitchImageProcessingBackend(HF_IMAGE_PROCESSING_RGA);
}
/* Check status; only create the session after configuration succeeds. */
```

检查板端 DMA heap 权限与 RGA 驱动，再启用 RGA 处理一帧。排查预处理问题时，切换到 `HF_IMAGE_PROCESSING_CPU` 对比结果。

查询 DMA heap 路径时，传入输出缓冲区及其大小：

```c
char dma_heap_path[256];
HResult status = HFQueryExpansiveHardwareRockchipDmaHeapPathWithSize(
    dma_heap_path, (HInt32)sizeof(dma_heap_path));
/* Read dma_heap_path only when status == HSUCCEED. */
```

如果板端使用其他 DMA heap 路径，通过 `HFSetExpansiveHardwareRockchipDmaHeapPath` 设置，并为应用配置该设备的访问权限。

`HFSetImageProcessAlignedWidth` 在创建会话前配置内部处理对齐。向 `HFImageData` 传入摄像头数据时，按[图像输入](../guides/image-inputs.md)说明将各行整理成紧密排列的存储。

## 在板端使用 Python {#python-on-the-board}

Python 封装可以加载同一个原生库，显式库路径和环境配置见 [Rockchip 上的 Python](../guides/python-rockchip-device.md)。安装与板端架构和 libc 匹配的 Python、NumPy 包。
