# Using InspireFace in CUDA


The GPU version of InspireFace has been verified on Linux physical machines. The dependency versions used for project compilation, unit testing, and continuous integration are as follows:

- **System**: Ubuntu 22.04
- **CUDA**: 12.2
- **cuDNN**: 8.9.2
- **TensorRT**: 10.8.0.43

The above versions were only tested on my RTX3060 12G, but this doesn't mean these are the only supported configurations. I believe as long as your environment supports TensorRT-10 and above (as of March 2025), it should run properly, since TensorRT-10 is a relatively new version, and its API seems to have some differences compared to previous versions.

## Checking CUDA Installation

When using the GPU version of InspireFace, you may need to ensure your device has certain dependencies installed. Besides basic tools like GCC, CMake, Git, etc., you should mainly focus on GPU-related environments:

1. Check CUDA installation:

```bash
nvcc -V
```

If the output looks like this, then it's OK:

```bash
nvcc: NVIDIA (R) Cuda compiler driver
Copyright (c) 2005-2023 NVIDIA Corporation
Built on Tue_Aug_15_22:02:13_PDT_2023
Cuda compilation tools, release 12.2, V12.2.140
Build cuda_12.2.r12.2/compiler.33191640_0
```

2. Check cuDNN installation:

```
cat /usr/include/x86_64-linux-gnu/cudnn_version_v8.h | grep CUDNN_MAJOR -A 2
```

If the output looks like this, then it's OK:

```
#define CUDNN_MAJOR 8
#define CUDNN_MINOR 9
#define CUDNN_PATCHLEVEL 2
--
#define CUDNN_VERSION (CUDNN_MAJOR * 1000 + CUDNN_MINOR * 100 + CUDNN_PATCHLEVEL)

/* cannot use constexpr here since this is a C-only file */
```

3. Check your NVIDIA driver:

```
nvidia-smi
```

After completing these checks, you can proceed to the next step. If there are issues, you'll need to reconfigure CUDA to ensure it can run.

## Method 1: Local Compilation

Local compilation is the most complex method, but if you need to modify the InspireFace source code, this method is the most suitable for you.

### Installing TensorRT

We recommend using TensorRT-10.8 version, as it has been verified:

```bash
# Download
wget https://developer.nvidia.com/downloads/compute/machine-learning/tensorrt/10.8.0/tars/TensorRT-10.8.0.43.Linux.x86_64-gnu.cuda-12.8.tar.gz
```

After downloading, you need to extract it and place it anywhere. You can use the environment variable **TENSORRT_ROOT** to record its location.

```
export TENSORRT_ROOT=/home/tunm/software/TensorRT-10.8.0.43/
```

To verify if the **TensorRT** installation is successful or available, you can execute the bin provided in the TensorRT folder or use some methods provided by the official website.

### Executing Compilation

Enter the InspireFace directory, and you can directly execute the compilation command. During compilation, you need to enable some CUDA-supporting compilation switches:

```bash
# Set tensorrt root dir
export TENSORRT_ROOT=/home/tunm/software/TensorRT-10.8.0.43/
# Execute build
cmake .. -DTENSORRT_ROOT=$TENSORRT_ROOT -DISF_ENABLE_TENSORRT=ON
make -j8
```

If you encounter compilation-related errors at this step, it's likely that there's an issue when linking CUDA or TensorRT. Common problems include:

- Cannot find CUDA library
- Cannot find TensorRT library
- Incomplete CUDA library linking
- CUDA library environment variable issues

You can check the **toolchain/FindTensorRT.cmake** file in the directory, which contains the toolchain methods for how the project searches for GPU dependency libraries:

```cmake
# FindTensorRT.cmake - Simple Version
# Contains basic functionality for finding TensorRT libraries

# Find CUDA
find_package(CUDA REQUIRED)
include_directories(${CUDA_INCLUDE_DIRS})
link_directories(${CUDA_TOOLKIT_ROOT_DIR}/lib64)

# Find TensorRT header files
find_path(TENSORRT_INCLUDE_DIR NvInfer.h
    HINTS ${TENSORRT_ROOT}
    PATH_SUFFIXES include)

# Find TensorRT libraries
find_library(TENSORRT_LIBRARY_INFER nvinfer
    HINTS ${TENSORRT_ROOT}
    PATH_SUFFIXES lib lib64)

find_library(TENSORRT_LIBRARY_RUNTIME nvinfer_plugin
    HINTS ${TENSORRT_ROOT}
    PATH_SUFFIXES lib lib64)

# Find CUDA runtime library
find_library(CUDA_RUNTIME_LIBRARY cudart
    HINTS ${CUDA_TOOLKIT_ROOT_DIR}
    PATH_SUFFIXES lib64 lib lib64/stubs lib/stubs)

# Set result variables, can be used in projects that include this module
set(ISF_TENSORRT_INCLUDE_DIRS ${TENSORRT_INCLUDE_DIR})
set(ISF_TENSORRT_LIBRARIES ${TENSORRT_LIBRARY_INFER} ${TENSORRT_LIBRARY_RUNTIME} ${CUDA_RUNTIME_LIBRARY})

# Output status messages
message(STATUS "Found TensorRT include: ${TENSORRT_INCLUDE_DIR}")
message(STATUS "Found TensorRT libraries: ${TENSORRT_LIBRARY_INFER} ${TENSORRT_LIBRARY_RUNTIME}")
message(STATUS "Found CUDA runtime library: ${CUDA_RUNTIME_LIBRARY}")
```

### Compilation Completion

When you successfully compile, you can see directories like lib, test, and sample, and find dynamic libraries, test programs, and sample programs from them.

## Method 2: Using Docker for Compilation

Using Docker for compilation is the simplest method. You only need to ensure that you have installed **docker** and **docker-compose**. If your host machine only needs to compile libraries and doesn't need to deploy GPU projects, you may not even need to install a CUDA environment.

Note that using Docker for compilation has limitations in terms of version selection, such as system and CUDA versions. If you need to modify them, you can check the dockerfile in the project root directory.

```bash
docker-compose up build-tensorrt-cuda12-ubuntu22
```

## Method 3: Directly Download Pre-compiled Libraries

This is the simplest method, but it is for fixed system versions and CUDA versions. You can go directly to the [Release Page](https://github.com/HyperInspire/InspireFace/releases) to find pre-compiled CUDA version SDKs.

## How to Use the Library

Let's describe how to use CMake to build a simple example using the CUDA version of InspireFace.

For convenience, along with the dynamic library, we need to put **toolchain/FindTensorRT.cmake** and the **Megatron_TRT** model into the project:

```bash
.
├── CMakeLists.txt
├── FindTensorRT.cmake
├── InspireFace
│   ├── include
│   │   ├── herror.h
│   │   ├── inspireface.h
│   │   └── intypedef.h
│   └── lib
│       └── libInspireFace.so
├── main.cpp
└── models
    └── Megatron_TRT
```

You can refer to this for building **CMakeLists.txt**:

```cmake
project(InspireFaceCUDA)
set(CMAKE_CXX_STANDARD 14)

# Add the current directory to the CMake module path
list(APPEND CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/)

# Find TensorRT
include(FindTensorRT)

# Link InspireFace 
link_directories(${CMAKE_CURRENT_SOURCE_DIR}/InspireFace/lib)

# Include InspireFace headers
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/InspireFace/include)

add_executable(demo main.cpp)

target_link_libraries(demo ${TENSORRT_LIBRARIES} InspireFace)
```

Besides building, the InspireFace CAPI provides some CUDA-related interfaces, mainly utility functions for printing GPU information, checking availability, etc. Other facial algorithm functionality interfaces **are consistent with the general version**, so we won't elaborate on how to use the API.

```c
/**
 * @brief Set the Apple CoreML inference mode, must be called before HFCreateInspireFaceSession.
 * @param mode The inference mode to be set.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFSetAppleCoreMLInferenceMode(HFAppleCoreMLInferenceMode mode);

/**
 * @brief Set the CUDA device id, must be called before HFCreateInspireFaceSession.
 * @param device_id The device id to be set.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFSetCudaDeviceId(int32_t device_id);

/**
 * @brief Get the CUDA device id, must be called after HFCreateInspireFaceSession.
 * @param device_id Pointer to the device id to be returned.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFGetCudaDeviceId(int32_t *device_id);

/**
 * @brief Print the CUDA device information.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFPrintCudaDeviceInfo();

/**
 * @brief Get the number of CUDA devices.
 * @param num_devices Pointer to the number of CUDA devices to be returned.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFGetNumCudaDevices(int32_t *num_devices);

/**
 * @brief Check if the CUDA device is supported.
 * @param support The support flag to be checked.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFCheckCudaDeviceSupport(int32_t *is_support);
```

