# Java 打包 {#java-packaging}

构建 Java 8 兼容的 JAR，以及目标系统使用的 JNI 动态库。构建过程根据公开 C 头文件生成 Java 声明，并将 JNI 适配层与核心 SDK 一起打包。应用直接使用 [Java API](../using-with/java.md)，不需要自行编写 JNI。

从包含 `command/build_java.sh` 和 portable 绑定的 [Develop 源码](./source.md#develop-source)开始。以下构建命令在 SDK 源码目录执行。

## 准备构建工具 {#prepare-the-build-tools}

| Tool | Requirement |
| --- | --- |
| JDK | Java 8 或更新版本，包含 `javac`、`jar` 和 JNI 头文件；仅安装运行时不够。 |
| CMake | 3.20 或更新版本；3.24+ 查找 headless JDK 时不再要求 AWT。 |
| Python | Python 3，用于生成和检查 API 绑定。 |
| Native tools | C++14 编译器、Make 或 Ninja，以及检查导出符号的 `nm`。 |
| SDK dependencies | [源码准备](./source.md)中的递归 `3rdparty` 依赖。 |

Linux 使用本机 C++ 工具链和开发用 JDK。macOS 使用 Xcode 命令行工具，以及匹配目标架构的 JDK。如果 CMake 找到了另一套 JDK，可在配置新的构建目录前设置 `JAVA_HOME`：

```bash
export JAVA_HOME=/absolute/path/to/jdk
export PATH="$JAVA_HOME/bin:$PATH"
java -version
javac -version
```

JDK 9 及以上使用 `--release 8` 编译，JDK 8 使用 `-source 8 -target 8`。生成的 JAR 不依赖 Android。Java 8 字节码兼容性不会改变动态库的架构或最低系统版本要求。

## 构建 SDK 包 {#build-the-package}

在 Linux 或 macOS 本机构建 CPU 版本：

```bash
bash command/build_java.sh -DCMAKE_POLICY_VERSION_MINIMUM=3.5
```

脚本配置 Release 构建，启用 `ISF_BUILD_JAVA`，关闭原生示例和测试程序，编译后安装到 `build/java-sdk/install/Java`。如果启用了 Java 测试，会先执行契约测试与库加载测试，再安装。`CMAKE_POLICY_VERSION_MINIMUM=3.5` 用于让内置依赖兼容 CMake 4。

不同架构或后端使用独立的输出目录。脚本支持以下环境变量：

| Variable | Default | Effect |
| --- | --- | --- |
| `ISF_JAVA_BUILD_DIR` | 源码目录下的 `build/java-sdk` | CMake 构建目录，包输出到其下的 `install/Java`。 |
| `ISF_BUILD_JOBS` | `4` | 并行编译任务数。 |
| `ISF_JAVA_TESTS` | `OFF` | 构建并在本机运行 Java 契约测试与库加载测试。 |

例如：

```bash
ISF_JAVA_BUILD_DIR="$PWD/build/java-cpu" ISF_BUILD_JOBS=8 \
  bash command/build_java.sh -DCMAKE_POLICY_VERSION_MINIMUM=3.5
```

其他参数会传给 CMake。修改构建选项或更新 SDK 后，JAR 与动态库应保持配套。

### 输出文件 {#output-files}

macOS arm64 的共享核心库构建输出如下：

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

`native/` 子目录按目标系统和 CPU 架构命名。Linux 使用 `linux-x86_64` 或 `linux-arm64`，库文件为 `.so`；macOS 使用 `macos-x86_64` 或 `macos-arm64`，库文件为 `.dylib`。加载名称见[原生包路径](../using-with/java.md#add-the-sdk)。

`inspireface.jar` 包含生成的 API、加载器、错误处理类，以及配置 [CPU 功耗策略](../using-with/java.md#cpu-power-mode)的 `CPUEngine`。`sources/` 保存对应 Java 源码，可用于 IDE 跳转。`api-manifest.json` 记录公开 C 函数与 Java 签名的对应关系。原生 C/C++ SDK 同时安装在旁边的 `install/InspireFace` 目录。

`consumer-rules.pro` 随安装包单独提供。如果应用使用 ProGuard 或 R8 压缩、混淆 Java 字节码，将这份规则加入配置，保留 JNI 按名称查找的类、方法与数据字段。

桌面 JVM 的普通共享核心库构建包含 `InspireFaceJNI` 和 `InspireFace` 两个库，加载器请求 `InspireFaceJNI`。设置 `ISF_BUILD_SHARED_LIBS=OFF` 时，CMake 会将静态核心库链接进 JNI 动态库；仍需检查最终文件是否有其他外部依赖。JNI 最终必须是 JVM 可加载的动态库。

Android 将同一套 portable JNI API 和 `CPUEngine` 编入单个 `libInspireFace.so`，加载器识别 Android Runtime 或 Dalvik 后请求 `InspireFace`。Android Java 构建要求 `ISF_BUILD_SHARED_LIBS=ON`；应用打包使用 [Android AAR](../using-with/android.md)，其中已经包含这些类、动态库与 consumer 规则。

### 运行生成的包 {#run-the-package}

准备模型文件路径和测试图片，在 macOS arm64 上执行：

```bash
cd build/java-sdk/install/Java
javac -cp inspireface.jar examples/DetectFaces.java
java -Djava.library.path=native/macos-arm64 -cp inspireface.jar:examples \
  DetectFaces /absolute/path/to/Pikachu /absolute/path/to/face.jpg
```

Linux 或 Intel macOS 将 `native/macos-arm64` 改为相应目录。模型包不包含在 JAR 中，按[模型与构建](../guides/models-and-builds.md#pick-a-resource-pack)选择。[Java 接入篇](../using-with/java.md#run-the-first-image)包含完整检测程序和 Windows 的 classpath 写法。

## 直接配置 CMake {#configure-cmake-directly}

不使用脚本时，等效的共享 CPU 构建如下：

<details>
<summary>完整 CMake 命令</summary>

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

需要时可显式设置目标架构。例如，在 Apple Silicon Mac 上使用 arm64 JDK：

```bash
bash command/build_java.sh \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0
```

deployment target 约束原生 SDK。核心库与 JNI 库应使用相同的架构和部署基线。Intel 构建需要 x86_64 编译目标、匹配的依赖，并使用 x86_64 JVM 运行。

### 平台与后端 {#platforms-and-backends}

| Target | Build approach |
| --- | --- |
| Linux / macOS CPU | 使用上面的本机构建命令。 |
| Windows x64 CPU | 已有原生 SDK 和 Python 打包入口；Java JNI 适配库仍需单独构建与验证，见下方说明。 |
| Linux ARM CPU | 在开发板本机构建，或准备对应交叉工具链和目标 JNI 头文件。 |
| TensorRT / Rockchip / macOS CoreML | 将 `ISF_BUILD_JAVA=ON` 与对应原生后端的选项、依赖一起配置。 |
| Android | 按 [Android 构建](./android.md)打包；portable JNI 与 Android API 共用一个 `libInspireFace.so`。 |
| iOS / HarmonyOS | 使用 [Apple](../using-with/apple.md)或 [HarmonyOS](../using-with/harmonyos.md)绑定；portable JVM 目标会拒绝 iOS 和 OHOS 配置。 |

Java 不会自动选择或安装推理后端。先按照 [NVIDIA](./nvidia.md)、[Rockchip](./rockchip.md)或 [macOS](./macos.md)准备原生构建，再使用该构建的 JNI 库和匹配模型。Java 绑定不能给已有 CPU 动态库增加新的后端。

交叉编译时关闭 Java 运行测试，构建后再到目标设备验证。除了原生 SDK 所需的系统依赖，也要配置目标的 JNI 头文件，不要将宿主机库链接到目标包。macOS 每个架构单独构建，使原生目录对应一种 JVM 架构。

[Windows 构建入口](./windows.md)生成 C/C++ CPU SDK，默认不启用 `ISF_BUILD_JAVA`，也不生成 `InspireFaceJNI.dll`；Windows PyPI wheel 同样不包含 JNI。portable Java 的加载器和安装规则能够处理 Windows 路径，但构建 JNI 还需匹配的 x64 JDK 和可用的原生符号检查工具。目前检查调用 `nm -g`，不能直接换成 MSVC 的 `dumpbin`。SDK 的 Windows 构建流程尚未覆盖 Java 打包，自行构建适配库后，需要在 Windows 上完成库加载与契约测试再交付。

## 运行契约测试 {#run-the-contract-tests}

契约测试通过 `-Xcheck:jni` 调用真实原生 SDK，涵盖 CPU 功耗策略、资源创建与释放、图像缓冲区、跟踪、snapshot、识别、FeatureHub、分析、抓拍、诊断与非法参数。构建时还会检查公开 C 声明、生成的 Java 方法与 JNI 导出符号是否一致。

启用测试前，在源码目录准备这两个文件：

| File | Content |
| --- | --- |
| `test_res/pack/Pikachu` | CPU 模型包。 |
| `test_res/data/bulk/kun.jpg` | 仓库[测试资源压缩包](https://github.com/tunmx/inspireface-store/raw/main/resource/test_res-lite2.zip)中的图片。 |

下载模型，再启用测试进行本机构建：

```bash
bash command/download_models_general.sh Pikachu
ISF_JAVA_TESTS=ON bash command/build_java.sh -DCMAKE_POLICY_VERSION_MINIMUM=3.5
```

构建成功后，可以不重新编译，只运行 Java 测试：

```bash
ctest --test-dir build/java-sdk --output-on-failure -R '^InspireFace.Java\.'
```

CTest 注册以下四项测试：

| Test | 验证内容 |
| --- | --- |
| `InspireFace.Java.Contract` | 通过绝对路径 `inspireface.native.path` 加载 JNI，执行完整契约测试。 |
| `InspireFace.Java.LibraryLookup` | 通过 `java.library.path` 查找 JNI，再执行同一套契约测试。 |
| `InspireFace.Java.AndroidLibraryLookup.runtime` | 在宿主 JVM 模拟 `Android Runtime` 标记，检查加载器请求 `InspireFace`。 |
| `InspireFace.Java.AndroidLibraryLookup.vm` | 在宿主 JVM 模拟 `Dalvik` 标记，检查加载器请求 `InspireFace`。 |

后两项使用宿主机 JNI 库验证加载分支，并调用 CPU 与 C API 入口；它们没有在 Android 设备或 ART 上运行。Android 应用还需单独完成设备测试。

这四项测试需要本机 JVM，交叉编译和 Android 配置不支持启用 `ISF_BUILD_JAVA_TESTS`。前两项使用 CPU `Pikachu` 模型；打包硬件后端时，还应使用目标模型单独运行检测验证。

## 部署与替换动态库 {#deploy-and-replace-native-libraries}

部署 `inspireface.jar`、配套的 `native/<os>-<arch>/` 目录、所选模型文件及后端运行时依赖。动态库需要是文件系统上的独立文件，加载器不会自动从 JAR 中解压原生库。

进入安装后的 Java 目录，检查 Linux 库：

```bash
file native/linux-x86_64/libInspireFaceJNI.so native/linux-x86_64/libInspireFace.so
ldd native/linux-x86_64/libInspireFaceJNI.so
ldd native/linux-x86_64/libInspireFace.so
```

macOS arm64：

```bash
file native/macos-arm64/libInspireFaceJNI.dylib native/macos-arm64/libInspireFace.dylib
otool -L native/macos-arm64/libInspireFaceJNI.dylib
otool -L native/macos-arm64/libInspireFace.dylib
```

安装后的 JNI 库在 Linux 使用 `$ORIGIN`，在 macOS 使用 `@loader_path` 查找同目录的核心库。后端依赖仍可能需要额外安装或配置运行路径。自行构建 Windows JNI 时，将 `InspireFaceJNI.dll` 与配套的 `libInspireFace.dll` 放在同一目录，并将该目录加入 `PATH`。目标机器还需安装构建对应的 Microsoft Visual C++ x64 运行库，见 [Windows](../using-with/windows.md)。

更新 SDK 时同时替换 JAR 和原生库目录，然后重启 JVM。仅替换 `libInspireFace` 可能造成函数缺失或布局不一致。除了确认能加载动态库，还应运行一次检测，检查目标模型是否能在当前后端执行。

## 常见构建问题 {#common-build-issues}

| Symptom | Check |
| --- | --- |
| Java or JNI headers not found | 安装 JDK，配置前设置 `JAVA_HOME`；旧版 CMake 可换用完整 JDK，或升级 CMake。 |
| Dependency CMake policy error | 传入 `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`。 |
| API parity check fails | 使用同一份源码重新生成绑定并编译原生库；确保 `nm` 兼容目标二进制格式。 |
| Contract test cannot open a model or image | 检查上面的两个测试文件路径。 |
| Library loads on the build machine but not the target | 检查架构、最低系统版本、libc/C++ 运行时与后端依赖。 |

构建实现位于 SDK 源码的 `command/build_java.sh` 和 `cpp/inspireface/platform/jni/portable/CMakeLists.txt`，测试实现位于 `java/src/test/java/com/insightface/sdk/inspireface/jni/` 下的 `ContractTest.java` 和 `NativeLibraryLoadingTest.java`。
