# NVIDIA GPU 与 TensorRT {#nvidia-gpu-with-tensorrt}

TensorRT 构建在 NVIDIA GPU 上运行兼容模型，使用与 CPU SDK 相同的检测、跟踪和识别接口，但需要启用 GPU 的原生库、匹配模型包，以及 CUDA/TensorRT 运行依赖。

完整编译参数和容器配置见 [NVIDIA TensorRT 构建](../build/nvidia.md)。

Python 接入时，安装配套封装，并按下文设置 `INSPIREFACE_LIBRARY_PATH`，指向启用 TensorRT 的原生库。

## 准备环境 {#prepare-the-environment}

在 Linux 上准备 NVIDIA 驱动、CUDA toolkit 和 TensorRT 开发包。SDK 使用 TensorRT 10 API，按 GPU 和驱动选择兼容的 CUDA 与 TensorRT 版本。

```bash
nvidia-smi
nvcc --version
```

`nvidia-smi` 显示驱动与 GPU 信息，`nvcc --version` 显示编译使用的 CUDA toolkit 版本。

将 `TENSORRT_ROOT` 指向 TensorRT 开发包目录，其中需要包含 `NvInfer.h`、`nvinfer` 和 `nvinfer_plugin`。构建时还会链接 CUDA 运行库。

## 构建原生 SDK {#build-the-native-sdk}

[准备源码依赖](../build/source.md)后，从 InspireFace 根目录运行：

```bash
export TENSORRT_ROOT=/absolute/path/to/TensorRT
cmake -S . -B build/tensorrt \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_ENABLE_TENSORRT=ON \
  -DTENSORRT_ROOT="$TENSORRT_ROOT" \
  -DISF_BUILD_WITH_SAMPLE=ON \
  -DISF_BUILD_WITH_TEST=OFF
cmake --build build/tensorrt --parallel 4
cmake --install build/tensorrt
```

SDK 安装到 `build/tensorrt/install/InspireFace`。在目标机器检查动态依赖：

```bash
ldd build/tensorrt/install/InspireFace/lib/libInspireFace.so
```

遇到 `not found` 项时，安装匹配的运行包，或将对应库目录加入加载路径。

仓库也提供 `command/build_linux_tensorrt.sh`，它启用对应示例、测试和性能测量配置，并重新整理安装产物。需要保留构建目录用于调试时，可以采用上面的直接 CMake 流程。

### 其他构建与部署方式 {#other-build-and-deployment-routes}

[发布页](https://github.com/HyperInspire/InspireFace/releases)中的预编译 TensorRT SDK 可以省去编译步骤，但目标环境仍需提供该二进制依赖的 CUDA/TensorRT。使用前检查包的架构与依赖版本。

仓库也提供 Docker Compose 构建服务。先按[容器构建说明](../build/nvidia.md#build-in-a-container)统一基础镜像、TensorRT 包和输出标签，再运行：

```bash
docker compose build build-tensorrt-cuda12-ubuntu22
docker compose run --rm build-tensorrt-cuda12-ubuntu22
```

准备好 `3rdparty` 后，在源码根目录运行。工程挂载到容器的 `/workspace`，产物写回本地 `build/` 目录。基础镜像与 TensorRT 包配置在 `docker/Dockerfile.cuda12_ubuntu22` 中，按目标环境一同调整。部署机器还需配置 NVIDIA 驱动，并为应用或运行容器提供 GPU 访问。

构建自己的应用时，可使用 [C 示例的 CMake 文件](./c-cpp.md#link-the-sdk)，将 `INSPIREFACE_ROOT` 指向 GPU SDK。人脸功能接口保持一致，部署时需要匹配的是原生库、模型包和运行时依赖。

| Deployment item | 在目标机器上检查 |
| --- | --- |
| `libInspireFace.so` | 已启用 TensorRT，且 CPU 架构匹配。 |
| TensorRT / CUDA libraries | 版本满足 SDK 要求，`ldd` 没有缺失项。 |
| NVIDIA driver | 运行应用的用户或容器能够访问 GPU。 |
| `Megatron_TRT` | 本地模型文件可读，并随部署记录保留版本信息。 |

::: tip 先跑通一个进程
先使用一个 GPU、一个会话和一张静态图片，确认模型加载与检测成功，再接入摄像头或增加工作线程。
:::

## 加载匹配的模型 {#load-the-matching-model}

从仓库根目录下载 TensorRT 模型包：

```bash
bash command/download_models_general.sh Megatron_TRT
```

TensorRT 构建使用 `test_res/pack/Megatron_TRT` 模型文件。

配合相同版本的 Python 源码封装，在导入前设置原生库覆盖路径：

```bash
export INSPIREFACE_LIBRARY_PATH="$PWD/build/tensorrt/install/InspireFace/lib/libInspireFace.so"
export LD_LIBRARY_PATH="$TENSORRT_ROOT/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
python -m pip install -e ./python
```

然后选择设备并初始化会话：

```python
import inspireface as isf

isf.set_cuda_device_id(0)  # Configure before session creation.
isf.launch(resource_path="test_res/pack/Megatron_TRT")
try:
    with isf.InspireFaceSession(isf.HF_ENABLE_NONE, auto_launch=False) as session:
        print("CUDA device:", isf.get_cuda_device_id())
        # Run the same image detection calls as in the Python guide.
finally:
    isf.terminate()
```

C 中对应的设备函数是 `HFSetCudaDeviceId` 和 `HFGetCudaDeviceId`。`HFGetNumCudaDevices` 与 `HFCheckCudaDeviceSupport` 可用于检查运行环境，除输出值外，也要检查状态码。

## 测量完整处理路径 {#measure-the-complete-path}

将模型和会话启动与重复推理分开测量。预热后，使用实际输入尺寸、人脸数和启用选项计时。与 CPU 应用对比时，包含图像准备和传输开销。

分别测量解码、缩放、推理、特征检索与绘制的耗时，定位最慢的环节。[性能测量指南](../guides/benchmark-remark(updating).md)介绍计时方式和结果记录。

同时使用时，分别配置 InspireCV CUDA 预处理和 InspireFace TensorRT 推理。
