# NVIDIA TensorRT 构建 {#nvidia-tensorrt-builds}

在 Linux 上编译启用 TensorRT 推理的动态库，供 C、C++ 或配套 Python 封装调用。先完成[源码准备](./source.md)，模型加载与应用接入见 [NVIDIA 部署](../using-with/cuda.md)。

## 准备 CUDA 与 TensorRT {#prepare-cuda-and-tensorrt}

| Component | 用途 |
| --- | --- |
| CMake 3.20+、C++14 编译器 | 编译 SDK 和依赖。 |
| CUDA toolkit | 提供 CUDA 头文件、编译工具和 `cudart`。 |
| TensorRT 10 development package | 提供 `NvInfer.h`、`nvinfer` 和 `nvinfer_plugin`。 |
| NVIDIA driver and GPU | 在目标机器上运行推理并验证生成的库。 |

`TENSORRT_ROOT` 指向包含 `include/` 和 `lib/` 或 `lib64/` 的开发包目录。CUDA 与 TensorRT 版本需符合目标 GPU 和驱动要求。CMake 同时查找 CUDA toolkit 和 TensorRT 库，仅安装 TensorRT 的 Python 包不足以完成这次 C++ 构建。

```bash
export TENSORRT_ROOT=/opt/TensorRT
nvcc --version
test -f "$TENSORRT_ROOT/include/NvInfer.h"
```

## 使用 CMake 构建 {#build-with-cmake}

下面生成动态库，并保留构建目录以便增量编译：

```bash
cmake -S . -B build/tensorrt \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_ENABLE_TENSORRT=ON \
  -DTENSORRT_ROOT="$TENSORRT_ROOT" \
  -DCUDA_TOOLKIT_ROOT_DIR=/usr/local/cuda \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF
cmake --build build/tensorrt --parallel 4
cmake --install build/tensorrt
```

CUDA 安装在其他位置时，修改 `/usr/local/cuda`。SDK 安装到 `build/tensorrt/install/InspireFace`，动态库位于 `lib/libInspireFace.so`，头文件位于 `include/`。

## 使用发布脚本 {#use-the-release-script}

发布脚本会启用示例、测试和 benchmark，并将安装产物整理到带名称的目录：

```bash
VERSION=1.2.4 CUDA_TAG=local \
  bash command/build_linux_tensorrt.sh
```

上面的产物位于 `build/inspireface-linux-tensorrt-local-1.2.4/InspireFace`。`CUDA_TAG` 只用于目录命名，可以将 `local` 改成已验证环境的标签；不设置时，脚本从 CUDA 与 Ubuntu 版本信息生成标签。安装完成后，脚本会删除编译中间文件。

## 在容器中构建 {#build-in-a-container}

仓库提供 `build-tensorrt-cuda12-ubuntu22` Compose 服务。先按目标环境在 `docker/Dockerfile.cuda12_ubuntu22` 中配好 CUDA 与 TensorRT，再构建镜像：

```bash
docker compose build build-tensorrt-cuda12-ubuntu22
VERSION=1.2.4 docker compose run --rm build-tensorrt-cuda12-ubuntu22
```

服务将源码目录挂载到 `/workspace`，产物写回宿主机的 `build/`。本文对应的源码中，Dockerfile 使用 CUDA **12.0** 开发镜像与 TensorRT **10.8 / CUDA 12.8** 压缩包，而 Compose 的目录标签为 `cuda12.2_ubuntu22.04`。构建发布包前，按目标环境统一镜像、TensorRT 包与输出标签，不能仅凭目录名判断二进制兼容性。

## 检查运行依赖 {#check-runtime-dependencies}

在部署机器上，用实际准备发布的 SDK 检查依赖：

```bash
file build/tensorrt/install/InspireFace/lib/libInspireFace.so
ldd build/tensorrt/install/InspireFace/lib/libInspireFace.so
```

加载模型前，补齐缺失的 TensorRT、CUDA 或编译器运行库。将 TensorRT 库目录加入动态加载器搜索路径，或通过系统加载器配置安装路径。GPU 驱动库由部署主机提供。

使用 `Megatron_TRT`，按[模型加载与 GPU 选择](../using-with/cuda.md#load-the-matching-model)完成首次推理。GPU 初始化和引擎准备会增加首次启动开销，测量时将预热与稳定运行分开。Python 接入先[切换到这个 `.so`](./python.md) 验证，再决定是否将其打包进 wheel；打包 SDK 动态库不会一并安装系统 GPU 驱动。
