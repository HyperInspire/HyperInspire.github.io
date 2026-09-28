# Rockchip NPU

A Rockchip deployment needs a native SDK built for the board's CPU ABI, an NPU model pack for its SoC, and the board's RK runtime and kernel driver. The table below pairs the model packs with the build scripts.

The [Rockchip build chapter](../build/rockchip.md) covers each board toolchain, Linux/Android outputs and native dependencies.

Detection, tracking, recognition and FeatureHub use the usual SDK APIs. RKNN runs model inference; RGA handles image operations such as resize and rotation and is configured separately.

## Select the target

| Device family | Model pack | Source build script |
| --- | --- | --- |
| RV1109 / RV1126 | `Gundam_RV1109` | `build_cross_rv1109rv1126_armhf.sh` |
| RV1106 | `Gundam_RV1106` | `build_cross_rv1106_armhf_uclibc.sh` |
| RK3566 / RK3568 | `Gundam_RK356X` | `build_cross_rk356x_rk3588_aarch64.sh` |
| RK3588 | `Gundam_RK3588` | `build_cross_rk356x_rk3588_aarch64.sh` |

Run the scripts in `command/` from the repository root. RK356x and RK3588 share the aarch64 build script; select their model packs by SoC.

## Cross-compile

Prepare the [source dependencies](../build/source.md) and a Linux cross toolchain compatible with the board's root filesystem. For an RK356x/RK3588 target:

```bash
export ARM_CROSS_COMPILE_TOOLCHAIN=/absolute/path/to/aarch64-toolchain
bash command/build_cross_rk356x_rk3588_aarch64.sh
bash command/download_models_general.sh Gundam_RK3588
```

The toolchain directory must contain the compiler names used by the script, such as `bin/aarch64-linux-gnu-gcc` and `bin/aarch64-linux-gnu-g++`. The output is collected under `build/inspireface-linux-aarch64-rk356x-rk3588/InspireFace`. An optional `VERSION` value adds a directory suffix.

For RV1106, use the Rockchip `arm-rockchip830-linux-uclibcgnueabihf` toolchain and the script's uClibc configuration. Build the application and its dependencies for the same board libc.

On the device, place the SDK and matching RK runtime libraries in an application library directory or the board's loader path. Use `ldd` to locate missing dependencies where available, and enable the NPU driver and device permissions through the board image.

## Start with a still image

Use the [C detection example](./c-cpp.md) with the selected `Gundam_*` pack before connecting a camera. This separates NPU initialization from camera stride, orientation and DMA issues.

If model loading fails, check the SoC, model pack, RK runtime version and kernel-driver messages together. Confirm that the pack was converted for that SoC and runtime.

### Build and copy a device example

Save the two code blocks below as `detect.c` and `CMakeLists.txt` in the same directory. The program reads an image and prints the detected face boxes.

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

<details>
<summary>CMakeLists.txt — Complete code</summary>

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

With the same aarch64 toolchain used for the SDK, cross-compile the application on the host:

```bash
cmake -S . -B build-rk \
  -DCMAKE_SYSTEM_NAME=Linux \
  -DCMAKE_SYSTEM_PROCESSOR=aarch64 \
  -DCMAKE_C_COMPILER="$ARM_CROSS_COMPILE_TOOLCHAIN/bin/aarch64-linux-gnu-gcc" \
  -DINSPIREFACE_ROOT=/absolute/path/to/inspireface-linux-aarch64-rk356x-rk3588/InspireFace
cmake --build build-rk --parallel 4
```

If the board's SDK provides a CMake toolchain file and sysroot, use that toolchain configuration for both builds. The command above follows the compiler layout used by the repository's aarch64 script.

Copy `build-rk/detect_c`, the installed SDK directory, the selected model pack and a test image to a device directory with this layout:

```text
inspireface-demo/
  detect_c
  sdk/lib/
  models/Gundam_RK3588
  images/face.jpg
```

On an RK3588 board, run from that directory:

```bash
export LD_LIBRARY_PATH="$PWD/sdk/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
./detect_c models/Gundam_RK3588 images/face.jpg
```

For RK3566/RK3568, use `Gundam_RK356X`. Put the matching SDK and runtime libraries in the application's `sdk/lib` directory and load them through the path above.

::: tip Check the loader before the model
An `Exec format error` points to the executable architecture; a missing shared library points to deployment paths or runtime dependencies. Only after the process starts should model compatibility, NPU initialization and frame input become the next checks.
:::

## Configure RGA {#configure-rga-deliberately}

The aarch64 and RV1106 scripts enable `ISF_ENABLE_RGA` alongside `ISF_ENABLE_RKNN`. At runtime, query the build and select the image backend before creating sessions:

```c
HInt32 built_with_rga = 0;
HResult status = HFQueryExpansiveHardwareRGACompileOption(&built_with_rga);
if (status == HSUCCEED && built_with_rga) {
    status = HFSwitchImageProcessingBackend(HF_IMAGE_PROCESSING_RGA);
}
/* Check status; only create the session after configuration succeeds. */
```

Check the DMA heap permissions and RGA driver on the board, then process a frame with RGA enabled. When debugging preprocessing, compare the result with `HF_IMAGE_PROCESSING_CPU`.

Query the DMA heap path with an explicit output-buffer size:

```c
char dma_heap_path[256];
HResult status = HFQueryExpansiveHardwareRockchipDmaHeapPathWithSize(
    dma_heap_path, (HInt32)sizeof(dma_heap_path));
/* Read dma_heap_path only when status == HSUCCEED. */
```

If the board uses another DMA heap path, set it with `HFSetExpansiveHardwareRockchipDmaHeapPath` and grant the application access to that device.

`HFSetImageProcessAlignedWidth` configures internal processing alignment before session creation. For `HFImageData`, repack camera rows into tightly packed storage as described in [image inputs](../guides/image-inputs.md).

## Python on the board

The Python wrapper can load the same native library. Follow [Python on Rockchip](../guides/python-rockchip-device.md) for an explicit library path and environment setup. Install Python and NumPy packages built for the board's architecture and libc.
