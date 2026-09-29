# Source and common options {#source-and-common-options}

Get the SDK source and its dependencies, then choose a platform build. Run subsequent build commands from the SDK directory entered below unless a block explicitly changes directory.

## Get the source {#get-the-source}

Choose one of the following sources.

### Release version (recommended) {#release-source}

For regular integration, start with the Release version in [InsightFace](https://github.com/deepinsight/insightface/tree/master/cpp-package/inspireface). Enter `cpp-package/inspireface` before downloading the dependencies:

```bash
git clone https://github.com/deepinsight/insightface.git
cd insightface/cpp-package/inspireface
git clone --recurse-submodules https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
```

### Develop version {#develop-source}

Use the [Develop repository](https://github.com/HyperInspire/InspireFace) for the latest features, more frequent updates and faster bug-fix follow-up:

```bash
git clone https://github.com/HyperInspire/InspireFace.git
cd InspireFace
git clone --recurse-submodules https://github.com/tunmx/inspireface-3rdparty.git 3rdparty
```

Continue with the build guide for your target platform.

## Prepare the build tools {#prepare-the-build-tools}

| Tool | Requirement |
| --- | --- |
| Git | Fetch the SDK and recursive third-party dependencies. |
| CMake | 3.20 or newer. |
| C++ compiler | C++14 support; use the target platform’s compiler or cross toolchain. |
| Build tool | Make or Ninja for direct CMake builds; most `command/` scripts call Make. |
| Platform SDK | Android NDK, Xcode, OpenHarmony Native SDK or board toolchain as applicable. |

Some bundled dependencies use older CMake policy settings. The direct CMake commands here pass `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` for CMake 4 compatibility. The unified Apple builder also passes this setting. The HarmonyOS HAR script in the `v1.2.4` tag does not pass this setting; use CMake 3.20–3.x when building that version.

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

This direct build produces the native C/C++ library. For Objective-C and Swift frameworks, use the unified Apple builder in the [iOS](./ios.md) or [macOS](./macos.md) chapter.

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

The Apple builder keeps reusable dependency caches under `build/apple-cache` and stages SDK outputs separately; see the [macOS](./macos.md) and [iOS](./ios.md) guides.
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
| `ISF_BUILD_JAVA` | `OFF` | Build the portable JNI library and Java 8-compatible JAR; see [Java packaging](./java.md). |
| `ISF_BUILD_JAVA_TESTS` | `OFF` | Build and run host JVM contract tests; requires `ISF_BUILD_JAVA`. |
| `ISF_BUILD_APPLE_FRAMEWORK` | `OFF` | Build the Objective-C framework and Swift overlay on Apple platforms. |
| `ISF_BUILD_APPLE_TESTS` | `OFF` | Build Apple API contract tests. |
| `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS` | `ON` | Use the Task preprocessing path. |

These are the top-level defaults. Platform scripts override them, particularly shared/static linkage, samples, tests and hardware backends. `ISF_INSPIRECV_SOURCE_DIR` can select another image-processing source checkout; rebuild the native SDK and keep its installed headers together after changing it.

## Check the build in an application {#check-the-build-in-an-application}

Check the binary architecture and dynamic dependencies using your platform chapter. Then load a [matching resource pack](../guides/models-and-builds.md#pick-a-resource-pack), run a still-image example and query the SDK version. Verify this small path before adding camera input, Python packaging or hardware-specific tuning. The [API diagnostics examples](../guides/api-recipes.md) provide version and build information queries.
