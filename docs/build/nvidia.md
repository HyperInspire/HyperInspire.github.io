# NVIDIA TensorRT builds {#nvidia-tensorrt-builds}

Build a Linux shared SDK with TensorRT inference, then use it from C, C++ or the matching Python wrapper. Start with [source preparation](./source.md); the model and application setup are covered in [NVIDIA deployment](../using-with/cuda.md).

## Prepare CUDA and TensorRT {#prepare-cuda-and-tensorrt}

| Component | Needed for |
| --- | --- |
| CMake 3.20+, C++14 compiler | Build the SDK and dependencies. |
| CUDA toolkit | CUDA headers, compiler tools and `cudart`. |
| TensorRT 10 development package | `NvInfer.h`, `nvinfer` and `nvinfer_plugin`. |
| NVIDIA driver and GPU | Run inference and validate the resulting library on the target. |

Set `TENSORRT_ROOT` to the extracted development package with `include/` and `lib/` or `lib64/`. Use a CUDA/TensorRT combination supported by the target GPU and driver. The SDK’s CMake finder locates the CUDA toolkit as well as the TensorRT libraries; a Python-only TensorRT installation is not enough for this C++ build.

```bash
export TENSORRT_ROOT=/opt/TensorRT
nvcc --version
test -f "$TENSORRT_ROOT/include/NvInfer.h"
```

## Build with CMake {#build-with-cmake}

This creates a shared library and keeps the build directory for incremental compilation:

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

Adjust `/usr/local/cuda` if the toolkit is installed elsewhere. The installed SDK is `build/tensorrt/install/InspireFace`; its shared library is `lib/libInspireFace.so` and its headers are under `include/`.

## Use the release script {#use-the-release-script}

The release script enables samples, tests and benchmarks and collects the installed files into a named directory:

```bash
VERSION=1.2.4 CUDA_TAG=local \
  bash command/build_linux_tensorrt.sh
```

With these values, the SDK is under `build/inspireface-linux-tensorrt-local-1.2.4/InspireFace`. `CUDA_TAG` only names the output; replace `local` with a label for your tested environment. If omitted, the script derives a label from the available CUDA and Ubuntu version information. It removes intermediate build files after installation.

## Build in a container {#build-in-a-container}

The repository includes the `build-tensorrt-cuda12-ubuntu22` Compose service. Configure `docker/Dockerfile.cuda12_ubuntu22` for your target CUDA/TensorRT combination before building the image:

```bash
docker compose build build-tensorrt-cuda12-ubuntu22
VERSION=1.2.4 docker compose run --rm build-tensorrt-cuda12-ubuntu22
```

The service mounts the checkout at `/workspace` and writes output to the host’s `build/` directory. In the source revision used here, the Dockerfile selects a CUDA **12.0** development image and a TensorRT **10.8 / CUDA 12.8** archive, while Compose sets the output label to `cuda12.2_ubuntu22.04`. Align the image, TensorRT package and output label with the environment you intend to distribute; the label alone does not establish binary compatibility.

## Check runtime dependencies {#check-runtime-dependencies}

Run the following on the deployment machine using the SDK you will ship:

```bash
file build/tensorrt/install/InspireFace/lib/libInspireFace.so
ldd build/tensorrt/install/InspireFace/lib/libInspireFace.so
```

Resolve any missing TensorRT, CUDA or compiler runtime library before launching a model. Add the installed TensorRT library directory to the loader search path or configure the system loader. Driver libraries come from the deployment host.

Use `Megatron_TRT` and follow [model loading and GPU selection](../using-with/cuda.md#load-the-matching-model) for the first inference. GPU initialization and engine preparation can make the first launch slower; measure warm-up separately from steady processing. For Python, first [select this `.so`](./python.md), then decide whether to bundle it in a wheel. Packaging the SDK library does not package the system GPU driver.
