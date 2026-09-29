# NVIDIA GPU with TensorRT

The TensorRT build runs compatible models on an NVIDIA GPU. It uses the same detection, tracking and recognition APIs as the CPU SDK, but needs a GPU-enabled native library, the matching model pack and the CUDA/TensorRT runtime dependencies.

For Linux x86_64, download the [1.2.4 TensorRT SDK for CUDA 12.2 / Ubuntu 22.04](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-tensorrt-cuda12.2_ubuntu22.04-1.2.4.zip). Check its native dependencies on the target before use. When they match your environment, you can skip SDK compilation and proceed to [model loading](#load-the-matching-model).

For complete compiler settings and container configuration, see [NVIDIA TensorRT builds](../build/nvidia.md).

For Python, install the matching wrapper and point `INSPIREFACE_LIBRARY_PATH` to the TensorRT-enabled native library, as shown below.

## Prepare the environment

Build on Linux with an NVIDIA driver, CUDA toolkit and TensorRT development package. The SDK uses TensorRT 10 APIs. Choose CUDA and TensorRT versions supported by your GPU and driver.

```bash
nvidia-smi
nvcc --version
```

`nvidia-smi` reports the driver and GPU. `nvcc --version` reports the CUDA toolkit used for compilation.

Set `TENSORRT_ROOT` to the TensorRT development package directory containing `NvInfer.h`, `nvinfer` and `nvinfer_plugin`. The build also links the CUDA runtime.

## Build the native SDK

After [preparing the source dependencies](../build/source.md), run from the InspireFace root:

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

The SDK is installed under `build/tensorrt/install/InspireFace`. Inspect its dynamic dependencies on the target machine:

```bash
ldd build/tensorrt/install/InspireFace/lib/libInspireFace.so
```

Resolve each `not found` entry by installing the matching runtime package or adding its library directory to the loader path.

The repository also provides `command/build_linux_tensorrt.sh`, which enables its sample, test and benchmark configuration and reorganizes the installation output. Use the direct CMake flow above when you want to retain the build tree for debugging.

### Other build and deployment routes

The prebuilt SDK and a custom build both need their matching CUDA/TensorRT dependencies on the target. Use the selected SDK's `lib/libInspireFace.so` when configuring the application or Python library path below.

The repository also includes a Docker Compose build service. First align the base image, TensorRT package and output label using the [container build instructions](../build/nvidia.md#build-in-a-container), then run:

```bash
docker compose build build-tensorrt-cuda12-ubuntu22
docker compose run --rm build-tensorrt-cuda12-ubuntu22
```

Run from the source root after fetching `3rdparty`. The project is mounted at `/workspace`, and output is written to the checkout's `build/` directory. The base image and TensorRT package are configured in `docker/Dockerfile.cuda12_ubuntu22`; adjust them together for your target environment. On the deployment host, configure the NVIDIA driver and GPU access for the application or runtime container.

To build your application, use the [C example's CMake file](./c-cpp.md#link-the-sdk) with `INSPIREFACE_ROOT` pointing to the GPU SDK. The normal face APIs remain the same; deployment differs in the native library, resource pack and runtime dependencies.

| Deployment item | Check on the target |
| --- | --- |
| `libInspireFace.so` | TensorRT-enabled build for the target CPU architecture. |
| TensorRT / CUDA libraries | Versions required by the SDK; every `ldd` dependency resolves. |
| NVIDIA driver | Device access works for the user or container running the application. |
| `Megatron_TRT` | Readable local resource file; retained with this deployment's version record. |

::: tip Establish one working process first
Use one GPU, one session and a still image to check model loading and detection. Once this works, add camera input and any additional workers.
:::

## Load the matching model

Download the TensorRT pack from the repository root:

```bash
bash command/download_models_general.sh Megatron_TRT
```

Use `test_res/pack/Megatron_TRT` with the TensorRT build.

With the matching source Python wrapper, set the native-library override before importing it:

```bash
export INSPIREFACE_LIBRARY_PATH="$PWD/build/tensorrt/install/InspireFace/lib/libInspireFace.so"
export LD_LIBRARY_PATH="$TENSORRT_ROOT/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
python -m pip install -e ./python
```

Then initialize a device and session:

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

For C, the equivalent device functions are `HFSetCudaDeviceId` and `HFGetCudaDeviceId`. `HFGetNumCudaDevices` and `HFCheckCudaDeviceSupport` help inspect the runtime; check their status codes as well as the output values.

## Measure the complete path

Separate model/session startup from repeated inference. Warm up the session and time your actual input resolution, number of faces and enabled options. Include image preparation and transfers when comparing an application against CPU execution.

Measure decoding, resizing, inference, feature search and drawing separately to locate the slowest stage. The [benchmark guide](../guides/benchmark-remark(updating).md) shows the timing setup and result format.

Configure InspireCV CUDA preprocessing and InspireFace TensorRT inference separately when using both.
