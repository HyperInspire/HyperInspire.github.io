# Java packaging {#java-packaging}

Build one Java 8-compatible JAR and the JNI libraries for the target system. The build generates Java declarations from the public C headers and packages the adapter with the core SDK. Application code uses the [Java API](../using-with/java.md) without writing JNI.

Start with the [Develop source](./source.md#develop-source), which includes `command/build_java.sh` and the portable binding. Run build commands from the SDK source directory.

## Prepare the build tools {#prepare-the-build-tools}

| Tool | Requirement |
| --- | --- |
| JDK | Java 8 or newer, including `javac`, `jar` and JNI headers. A runtime-only installation is insufficient. |
| CMake | 3.20 or newer; 3.24+ can find a headless JDK without requiring AWT. |
| Python | Python 3 for generating and checking API bindings. |
| Native tools | C++14 compiler, Make or Ninja, and `nm` for the exported-symbol check. |
| SDK dependencies | The recursive `3rdparty` checkout from [source preparation](./source.md). |

On Linux, use the native C++ toolchain and a development JDK. On macOS, use Xcode's command-line tools and a JDK matching the target architecture. If CMake finds a different JDK from the one you intend to use, set `JAVA_HOME` before configuring a fresh build directory:

```bash
export JAVA_HOME=/absolute/path/to/jdk
export PATH="$JAVA_HOME/bin:$PATH"
java -version
javac -version
```

The build uses `--release 8` with JDK 9 or newer, and `-source 8 -target 8` with JDK 8. The generated JAR has no Android dependency. Java 8 bytecode compatibility does not change the native library's architecture or minimum OS requirements.

## Build the package {#build-the-package}

For a native Linux or macOS CPU build:

```bash
bash command/build_java.sh -DCMAKE_POLICY_VERSION_MINIMUM=3.5
```

The script configures a Release build, enables `ISF_BUILD_JAVA`, disables the native sample and test executables, compiles the SDK and installs it under `build/java-sdk/install/Java`. It also runs enabled Java contract and library-loading tests before installation. `CMAKE_POLICY_VERSION_MINIMUM=3.5` allows the bundled dependencies to configure with CMake 4.

Use a separate output directory for another architecture or backend. These environment variables control the script:

| Variable | Default | Effect |
| --- | --- | --- |
| `ISF_JAVA_BUILD_DIR` | `build/java-sdk` under the source directory | CMake build directory; `install/Java` is created beneath it. |
| `ISF_BUILD_JOBS` | `4` | Parallel compilation jobs. |
| `ISF_JAVA_TESTS` | `OFF` | Build and run Java contract and library-loading tests on the host. |

For example:

```bash
ISF_JAVA_BUILD_DIR="$PWD/build/java-cpu" ISF_BUILD_JOBS=8 \
  bash command/build_java.sh -DCMAKE_POLICY_VERSION_MINIMUM=3.5
```

Additional arguments are passed to CMake. Keep the JAR and native files from the same build when changing options or updating the SDK.

### Output files {#output-files}

A shared-core macOS arm64 build produces:

```text
build/java-sdk/install/Java/
  inspireface.jar
  api-manifest.json
  consumer-rules.pro
  sources/com/insightface/sdk/inspireface/jni/
    Native.java
    NativeTypes.java
    NativeConstants.java
    NativeLibrary.java
    InspireFaceException.java
    CPUEngine.java
  native/macos-arm64/
    libInspireFaceJNI.dylib
    libInspireFace.dylib
  examples/DetectFaces.java
```

The `native/` directory uses the target OS and CPU architecture. Linux produces `linux-x86_64` or `linux-arm64` with `.so` files; macOS produces `macos-x86_64` or `macos-arm64` with `.dylib` files. See [native package paths](../using-with/java.md#add-the-sdk) for loader filenames.

`inspireface.jar` contains the generated API, loader, error handling and `CPUEngine` for configuring the [CPU power policy](../using-with/java.md#cpu-power-mode). `sources/` contains their Java sources for IDE navigation. `api-manifest.json` maps public C functions to Java signatures. The native C/C++ SDK is also installed under the adjacent `install/InspireFace` directory.

`consumer-rules.pro` is installed as a separate file. If the application shrinks or obfuscates Java bytecode with ProGuard or R8, include these rules in its configuration to preserve the classes, methods and data fields that JNI resolves by name.

On desktop JVMs, the normal shared-core package contains both `InspireFaceJNI` and `InspireFace`; the loader requests `InspireFaceJNI`. With `ISF_BUILD_SHARED_LIBS=OFF`, CMake links the static core into the shared JNI adapter; inspect the resulting binary for any remaining external dependencies. JNI always needs a shared library that the JVM can load.

Android embeds the same portable JNI API and `CPUEngine` in one `libInspireFace.so`. The loader requests `InspireFace` when it detects Android Runtime or Dalvik. Android Java builds require `ISF_BUILD_SHARED_LIBS=ON`; package applications with the [Android AAR](../using-with/android.md), which already includes these classes, native libraries and consumer rules.

### Run the package {#run-the-package}

Use a filesystem model path and a test image. On macOS arm64:

```bash
cd build/java-sdk/install/Java
javac -cp inspireface.jar examples/DetectFaces.java
java -Djava.library.path=native/macos-arm64 -cp inspireface.jar:examples \
  DetectFaces /absolute/path/to/Pikachu /absolute/path/to/face.jpg
```

Replace `native/macos-arm64` with the matching target directory on Linux or Intel macOS. Model packs are separate from the JAR; select one from [Models and builds](../guides/models-and-builds.md#pick-a-resource-pack). The [Java integration page](../using-with/java.md#run-the-first-image) includes the complete detection program and Windows classpath syntax.

## Configure CMake directly {#configure-cmake-directly}

The equivalent shared CPU build without the helper script is:

<details>
<summary>Complete CMake commands</summary>

```bash
cmake -S . -B build/java-sdk \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DISF_BUILD_JAVA=ON \
  -DISF_BUILD_JAVA_TESTS=OFF \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF
cmake --build build/java-sdk --parallel 4
cmake --install build/java-sdk
```

</details>

Set a target architecture explicitly when needed. For example, on an Apple Silicon Mac with an arm64 JDK:

```bash
bash command/build_java.sh \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0
```

The deployment target applies to the native SDK. Keep the installed core and JNI library on the same architecture and deployment baseline. An Intel build needs an x86_64 compiler target, compatible dependencies and an x86_64 JVM to run it.

### Platforms and backends {#platforms-and-backends}

| Target | Build approach |
| --- | --- |
| Linux / macOS CPU | Native host build above. |
| Windows x64 CPU | Native SDK and Python packaging are available; the Java JNI adapter requires a separate build and validation (see below). |
| Linux ARM CPU | Build on the board, or use the matching cross toolchain and target JNI headers. |
| TensorRT / Rockchip / macOS CoreML | Combine `ISF_BUILD_JAVA=ON` with the native backend's build options and dependencies. |
| Android | Follow the [Android build](./android.md); portable JNI and the Android API share one `libInspireFace.so`. |
| iOS / HarmonyOS | Use the [Apple](../using-with/apple.md) or [HarmonyOS](../using-with/harmonyos.md) binding; the portable JVM target rejects iOS and OHOS configurations. |

Java does not select or install an inference backend on its own. Follow [NVIDIA](./nvidia.md), [Rockchip](./rockchip.md) or [macOS](./macos.md) for native settings, then use that build's JNI adapter and a matching model pack. The Java binding cannot add a backend to an already compiled CPU library.

For cross-compilation, keep Java runtime tests disabled and run them on the target afterward. Cross-building the native SDK also requires the target's JNI headers and system dependencies; do not link host libraries into the target package. Build each macOS architecture separately so the native directory corresponds to one JVM architecture.

The [Windows build entry point](./windows.md) builds the C/C++ CPU SDK. It does not enable `ISF_BUILD_JAVA` or produce `InspireFaceJNI.dll`, and the Windows PyPI wheel does not include JNI. The portable Java loader and install rules recognize Windows paths, but a Windows JNI build still needs a matching x64 JDK and a compatible native export check. The current check invokes `nm -g`; MSVC `dumpbin` is not a drop-in replacement. Windows Java packaging is not covered by the SDK's Windows build workflow, so validate loading and the contract tests on Windows before shipping a custom adapter.

## Run the contract tests {#run-the-contract-tests}

The contract tests use the actual native SDK with `-Xcheck:jni`. They cover CPU power policy, resource creation and release, image buffers, tracking, snapshots, recognition, FeatureHub, analysis, capture, diagnostics and invalid arguments. Build-time API checks also compare the public C declarations, generated Java methods and exported JNI symbols.

Before enabling the tests, prepare these two files in the source checkout:

| File | Content |
| --- | --- |
| `test_res/pack/Pikachu` | CPU model pack. |
| `test_res/data/bulk/kun.jpg` | Image from the repository's [test resource archive](https://github.com/tunmx/inspireface-store/raw/main/resource/test_res-lite2.zip). |

Download the model and run a native host build with tests enabled:

```bash
bash command/download_models_general.sh Pikachu
ISF_JAVA_TESTS=ON bash command/build_java.sh -DCMAKE_POLICY_VERSION_MINIMUM=3.5
```

After a successful build, rerun the Java tests without rebuilding:

```bash
ctest --test-dir build/java-sdk --output-on-failure -R '^InspireFace.Java\.'
```

CTest registers four tests:

| Test | What it checks |
| --- | --- |
| `InspireFace.Java.Contract` | Loads JNI through the absolute `inspireface.native.path` and runs the full contract suite. |
| `InspireFace.Java.LibraryLookup` | Finds JNI through `java.library.path` and runs the same contract suite. |
| `InspireFace.Java.AndroidLibraryLookup.runtime` | Simulates the `Android Runtime` marker on a host JVM and checks that the loader requests `InspireFace`. |
| `InspireFace.Java.AndroidLibraryLookup.vm` | Simulates the `Dalvik` marker on a host JVM and checks that the loader requests `InspireFace`. |

The last two tests resolve the host JNI library and exercise CPU and C API entry points. They do not run on an Android device or ART; Android applications still need separate device tests.

All four tests require a host JVM. Cross-compiling and Android configurations reject `ISF_BUILD_JAVA_TESTS`. The first two use the CPU `Pikachu` fixture; run a separate detection check with the target model when packaging a hardware backend.

## Deploy and replace native libraries {#deploy-and-replace-native-libraries}

Ship `inspireface.jar`, the matching `native/<os>-<arch>/` directory, the selected model file and any backend runtime dependencies. Keep the native files as filesystem files; putting them inside a JAR alone does not make this loader extract them.

From the installed Java directory, inspect Linux libraries with:

```bash
file native/linux-x86_64/libInspireFaceJNI.so native/linux-x86_64/libInspireFace.so
ldd native/linux-x86_64/libInspireFaceJNI.so
ldd native/linux-x86_64/libInspireFace.so
```

On macOS arm64:

```bash
file native/macos-arm64/libInspireFaceJNI.dylib native/macos-arm64/libInspireFace.dylib
otool -L native/macos-arm64/libInspireFaceJNI.dylib
otool -L native/macos-arm64/libInspireFace.dylib
```

The installed JNI adapter uses `$ORIGIN` on Linux and `@loader_path` on macOS to find its colocated core library. Backend dependencies may need additional runtime setup. For a custom Windows JNI build, put `InspireFaceJNI.dll` and its matching `libInspireFace.dll` together and add that directory to `PATH`. Deploy the Microsoft Visual C++ x64 runtime required by the build; see [Windows](../using-with/windows.md).

To update the SDK, replace the JAR and native directory together, then restart the JVM. Replacing only `libInspireFace` may leave missing functions or mismatched layouts. A detection run checks more than successful library loading: it also verifies that the selected model can execute with that native backend.

## Common build issues {#common-build-issues}

| Symptom | Check |
| --- | --- |
| Java or JNI headers not found | Install a JDK and set `JAVA_HOME` before configuring. With an older CMake, use a full JDK or upgrade CMake. |
| Dependency CMake policy error | Pass `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`. |
| API parity check fails | Rebuild generated bindings and native libraries from the same source revision; keep the `nm` tool compatible with the binary format. |
| Contract test cannot open a model or image | Check the two fixture paths above. |
| Library loads on the build machine but not the target | Check architecture, minimum OS, libc/C++ runtime and backend dependencies. |

Build implementation: `command/build_java.sh` and `cpp/inspireface/platform/jni/portable/CMakeLists.txt` in the SDK source checkout. Test implementations are `ContractTest.java` and `NativeLibraryLoadingTest.java` under `java/src/test/java/com/insightface/sdk/inspireface/jni/`.
