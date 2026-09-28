# Source and common options {#source-and-common-options}

Prepare one source checkout and its dependencies, then choose a platform build. All commands in this section start in the InspireFace repository root unless a block explicitly changes directory.

## Get the source {#get-the-source}

The commands below use the develop repository and pin both the SDK and its dependency checkout to the revisions used by these **1.2.4** examples. Start in an empty parent directory:

```bash
git clone https://github.com/HyperInspire/InspireFace.git
cd InspireFace
git checkout 1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9
git clone https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
git -C 3rdparty checkout dfb1f29c511954bc0764c232ed62e713d972844d
git -C 3rdparty submodule update --init --recursive
```

If you already have `3rdparty`, initialize its nested dependencies instead of cloning over it:

```bash
git -C 3rdparty submodule update --init --recursive
```

Record both revisions with your build. The dependency repository changes independently of the SDK:

```bash
git rev-parse HEAD
git -C 3rdparty rev-parse HEAD
git -C 3rdparty submodule status --recursive
```

To follow subsequent development, select a newer SDK revision and update the headers, language wrapper and native library together. The build’s `VERSION` environment variable only labels output directories; it does not change the runtime API version.

## Prepare the build tools {#prepare-the-build-tools}

| Tool | Requirement |
| --- | --- |
| Git | Fetch the SDK and recursive third-party dependencies. |
| CMake | 3.20 or newer. |
| C++ compiler | C++14 support; use the target platform’s compiler or cross toolchain. |
| Build tool | Make or Ninja for direct CMake builds; most `command/` scripts call Make. |
| Platform SDK | Android NDK, Xcode, OpenHarmony Native SDK or board toolchain as applicable. |

Some bundled dependencies use older CMake policy settings. The direct CMake commands here pass `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` for CMake 4 compatibility. Several platform scripts use the same setting; the iOS and HarmonyOS HAR scripts do not, so run those scripts with CMake 3.20–3.x.

## Build a CPU SDK {#build-a-cpu-sdk}

On Linux or macOS, this builds a shared SDK for the active compiler’s target and retains intermediate files for incremental builds:

```bash
cmake -S . -B build/local-cpu \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_INSTALL_CPP_HEADER=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF
cmake --build build/local-cpu --parallel 4
cmake --install build/local-cpu
```

Use a separate build directory for each architecture and backend. The [Linux](./linux.md) and [macOS](./macos.md) chapters add platform-specific settings and binary inspection commands.

## Understand the output layout {#understand-the-output-layout}

Direct CMake builds install into the build directory’s `install` subdirectory. The CPU command above produces:

```text
build/local-cpu/install/
  InspireFace/
    include/
      inspireface.h
      intypedef.h
      herror.h
      inspireface/
      inspirecv/
    lib/
      libInspireFace.so       # Linux; libInspireFace.dylib on macOS
  version.txt
```

Set `INSPIREFACE_ROOT` to `build/local-cpu/install/InspireFace` when using the [C](../using-with/c-cpp.md#link-the-sdk) or [C++](../using-with/cpp.md#build-the-example) application examples. Python needs the full shared-library file path instead; see [Python packaging](./python.md).

::: warning Release scripts reorganize their output
Many scripts under `command/` move installed files to the top of their own build directory and delete intermediate compilation files. Their final paths therefore differ from a direct CMake build. Keep application files outside those directories, and use each platform page’s stated output path.
:::

## Common CMake options {#common-cmake-options}

| Option | Default | Effect |
| --- | --- | --- |
| `ISF_BUILD_SHARED_LIBS` | `ON` | Build a shared library; static applications must link its dependencies too. |
| `ISF_INSTALL_CPP_HEADER` | `ON` | Install C++ and image-processing headers alongside the C API. |
| `ISF_BUILD_WITH_SAMPLE` | `ON` | Build the source sample programs. |
| `ISF_BUILD_WITH_TEST` | `ON` | Build the test target; model files and fixtures are needed when running it. |
| `ISF_NEVER_USE_OPENCV` | `ON` | Use the default image path without an OpenCV dependency. |
| `ISF_ENABLE_TENSORRT` | `OFF` | Enable the NVIDIA TensorRT backend. |
| `ISF_ENABLE_RKNN` | `OFF` | Enable the Rockchip NPU backend. |
| `ISF_ENABLE_RGA` | `OFF` | Enable Rockchip preprocessing with a supported RKNPU2 configuration. |
| `ISF_ENABLE_APPLE_EXTENSION` | `OFF` | Enable Apple extensions, including CoreML support. |
| `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS` | `OFF` | Use the Task preprocessing path. |

These are the top-level defaults. Platform scripts override them, particularly shared/static linkage, samples, tests and hardware backends. `ISF_INSPIRECV_SOURCE_DIR` can select another image-processing source checkout; rebuild the native SDK and keep its installed headers together after changing it.

## Check the build in an application {#check-the-build-in-an-application}

Check the binary architecture and dynamic dependencies using your platform chapter. Then load a [matching resource pack](../guides/models-and-builds.md#pick-a-resource-pack), run a still-image example and query the SDK version. Verify this small path before adding camera input, Python packaging or hardware-specific tuning. The [API diagnostics examples](../guides/api-recipes.md) provide version and build information queries.
