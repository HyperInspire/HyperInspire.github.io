# 构建 Android SDK {#build-for-android}

Android 应用可以直接添加 [1.2.4.post1 AAR](../using-with/android.md#choose-a-package-or-source-build)。C/C++ 或可移植 Java 接入可以下载下面的 **1.2.4 原生 SDK**。需要修改原生实现或制作自己的 SDK 包时，再从源码构建。Rockchip Android 的构建方法见 [RKNN 章节](./rockchip.md)。

标准脚本现在会一起生成 C/C++ SDK 和可移植 Java JAR。每个 ABI 只有一份 `libInspireFace.so`，包含原生核心、Android JNI 和可移植 JNI 接口。

## 下载预编译 SDK {#download-the-prebuilt-sdk}

[Android 1.2.4 ZIP](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-1.2.4.zip) 的目录与下方源码构建产物一致，只是不带开头的 `build/`。直接使用时无需再通过 NDK 编译：

```bash
curl -fL -o inspireface-android-1.2.4.zip \
  https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-1.2.4.zip
unzip inspireface-android-1.2.4.zip
```

原生接入使用 `include/` 和 `lib/<abi>/libInspireFace.so`。可移植 Java 还需要 `java/inspireface.jar` 和 `java/consumer-rules.pro`，具体配置见[应用打包](#package-the-native-library)。[模型包](../guides/models-and-builds.md)需要单独下载。ZIP 不包含 AAR 或完整的 Android 便捷接口；Android 指南中的 `InspireFace`、`Session` 和 `Bitmap` 示例使用 AAR。

## 准备工具链 {#prepare-the-toolchain}

先完成[源码准备](./source.md)，再安装 CMake 3.20 或更新版本、Make、Python 3、JDK（8 或更新版本）及 Android NDK。以下命令均从 SDK 目录运行。JDK 用于编译兼容 Java 8 的 JAR，Python 用于生成和检查接口绑定。

`ANDROID_NDK` 应指向包含 `build/cmake/android.toolchain.cmake` 的 NDK 目录，而不是 Android SDK 或 Android Studio 的安装目录。如果 CMake 找不到 JDK，可通过 `JAVA_HOME` 指定其安装路径。

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
test -f "$ANDROID_NDK/build/cmake/android.toolchain.cmake"
cmake --version
javac -version
python3 --version
```

SDK 发布流程目前使用 NDK r18b。直接依赖预编译 AAR 的应用无需安装这一 NDK，包里的 Java 与原生库已经编译好。示例应用使用 JDK 17 运行 Gradle，并使用 Android SDK 35。

## 构建标准 SDK {#build-the-standard-sdk}

```bash
VERSION=1.2.4 bash command/build_android.sh
```

`VERSION` 只给输出目录添加后缀，原生 SDK 版本取决于源码。未设置这个变量时，输出目录为 `build/inspireface-android`。Android 发布包的 `.post1` 后缀与原生版本分别管理。

| Setting | Script value |
| --- | --- |
| ABI | `arm64-v8a`、`armeabi-v7a`、`x86_64` |
| Native API level | 三种 ABI 均为 `21`；发布的 AAR 要求 API `24` |
| Build type | `Release` |
| C++ runtime | `c++_static` |
| Library | 每个 ABI 一份动态库 `libInspireFace.so` |
| Java bindings | `ISF_BUILD_JAVA=ON`，生成兼容 Java 8 的 `inspireface.jar` |
| Binding checks | 检查 C 声明、生成的 Java/JNI 签名与原生导出符号 |
| Samples, native tests and host JVM tests | 关闭 |

脚本逐个编译 ABI，安装 SDK，再将文件收集到同一目录：

```text
build/inspireface-android-1.2.4/
  include/
    inspireface.h
    intypedef.h
    herror.h
  lib/
    arm64-v8a/libInspireFace.so
    armeabi-v7a/libInspireFace.so
    x86_64/libInspireFace.so
  java/
    inspireface.jar
    api-manifest.json
    consumer-rules.pro
    sources/com/insightface/sdk/inspireface/jni/
    examples/DetectFaces.java
    com/insightface/sdk/inspireface/
  version.txt
```

`java/sources/` 是与 JAR 对应的源码。单独的 `java/com/...` 目录保存 Android 抓拍和快照的补充源码，并不是完整的 Android 便捷接口。需要一起使用 `InspireFace`、`Session` 和 `Bitmap` 辅助方法时，使用 AAR 即可。

最后的整理步骤会删除中间 CMake 构建目录。需要保留缓存和目标文件以便增量编译时，可以使用下面的直接构建方式。

## 只构建一个 ABI {#build-one-abi}

下面的 arm64 配置会保留构建目录，安装文件单独放置。构建 `armeabi-v7a` 时，修改 `ANDROID_ABI`，并加入 `-DANDROID_ARM_NEON=TRUE`。

<details>
<summary>单个 ABI 的 CMake 构建命令</summary>

```bash
cmake -S . -B build/android-arm64-local \
  -G "Unix Makefiles" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK/build/cmake/android.toolchain.cmake" \
  -DANDROID_TOOLCHAIN=clang \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_NATIVE_API_LEVEL=21 \
  -DANDROID_STL=c++_static \
  -DMNN_BUILD_FOR_ANDROID_COMMAND=ON \
  -DISF_BUILD_SHARED_LIBS=ON \
  -DISF_BUILD_JAVA=ON \
  -DISF_BUILD_JAVA_TESTS=OFF \
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_ENABLE_BENCHMARK=OFF \
  -DISF_ENABLE_USE_LFW_DATA=OFF \
  -DISF_ENABLE_TEST_EVALUATION=OFF
cmake --build build/android-arm64-local --parallel 4
cmake --install build/android-arm64-local
```

</details>

C/C++ SDK 安装在 `build/android-arm64-local/install/InspireFace/`，JAR、manifest、可移植接口源码和 consumer rules 位于 `build/android-arm64-local/install/Java/`。Android 上的可移植 JNI 直接链接到 `libInspireFace.so`，不再生成 `libInspireFaceJNI.so`。交叉编译时不启用宿主 JVM 接口测试。

## 将 native 库打包进应用 {#package-the-native-library}

根据使用的接口选择一种方式：

| Integration | 需要打包的内容 |
| --- | --- |
| Android 便捷接口 | 完整的 [Android AAR](../using-with/android.md)，其中已包含模型和 consumer rules。 |
| 可移植 Java API | `java/inspireface.jar`、`lib/<abi>/libInspireFace.so`、模型资源和随包提供的 consumer rules。 |
| 自己的 JNI / C++ | `lib/<abi>/libInspireFace.so`，编译时使用安装后的头文件。 |

使用可移植 Java API 时，将 JAR 和各 ABI 的库放入应用模块，再把 `java/consumer-rules.pro` 复制为 `app/proguard-inspireface.pro`：

```text
app/
  libs/inspireface.jar
  proguard-inspireface.pro
  src/main/jniLibs/
    arm64-v8a/libInspireFace.so
    armeabi-v7a/libInspireFace.so
    x86_64/libInspireFace.so
```

应用模块对应配置如下：

```groovy
android {
    defaultConfig {
        minSdk 24
        // Optional: package only the ABIs your application supports.
        ndk { abiFilters 'arm64-v8a', 'armeabi-v7a', 'x86_64' }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                    'proguard-rules.pro', 'proguard-inspireface.pro'
        }
    }
}

dependencies {
    implementation files('libs/inspireface.jar')
}
```

接口调用参考 [Java 指南](../using-with/java.md)中的 `com.insightface.sdk.inspireface.jni.Native`。Android 上会自动从打包的原生库中加载 `InspireFace`。调用 `HFLaunchInspireFace` 前，先将模型包复制到可读取的文件路径；Android assets 不是普通文件路径。JAR 本身不包含模型或 Android `Bitmap` 辅助方法。

::: warning 混淆时保留 JNI 名称
普通 JAR 不会自动应用旁边的 Android consumer rules，需要在应用的 release 配置中引入。JNI 会按名称查找类、字段和构造方法，不能只保留 native 方法名。AAR 中的 consumer rules 则会自动合并。
:::

<details>
<summary>可移植 Java JNI 保留规则</summary>

```text
-keep class com.insightface.sdk.inspireface.jni.Native { *; }
-keep class com.insightface.sdk.inspireface.jni.CPUEngine { native <methods>; }
-keep class com.insightface.sdk.inspireface.jni.NativeTypes$* { *; }
```

</details>

不要同时引入完整 AAR 和另一份 `inspireface.jar`，也不要重复打包它的原生库。从早先的双库源码包升级时，移除 `libInspireFaceJNI.so`。每个 ABI 的 Java 类和 `libInspireFace.so` 应来自同一次构建；用 Gradle `pickFirst` 压过重复文件，可能会留下旧实现。

## 检查构建结果 {#check-the-result}

可以用 NDK 自带的 `llvm-readelf` 查看库文件。将 `HOST_TAG` 替换为本机 NDK 的 `toolchains/llvm/prebuilt/` 下实际存在的目录名：

```bash
export NDK_HOST_TAG=HOST_TAG
"$ANDROID_NDK/toolchains/llvm/prebuilt/$NDK_HOST_TAG/bin/llvm-readelf" \
  -h -d -l build/inspireface-android-1.2.4/lib/arm64-v8a/libInspireFace.so
```

`arm64-v8a` 的 machine 应为 AArch64。再用 Android Studio 的 APK Analyzer 确认最终 APK 中，每个选定 ABI 的目录只有一份 `libInspireFace.so`。1.2.4 Release ZIP 的三种 ABI 均使用 16 KB ELF 加载段对齐，源码构建目标也设置了这一对齐值；应用的页面大小验证还应覆盖其他 native 依赖和最终 APK 的对齐情况。

| Symptom | Check |
| --- | --- |
| CMake 找不到 Java 或 Python | 确认 JDK 开发工具和 Python 3 可用，并检查 `JAVA_HOME`。 |
| 找不到 NDK toolchain 文件 | `ANDROID_NDK` 应指向一个具体 NDK 版本的目录。 |
| 加载时出现 `UnsatisfiedLinkError` | 检查设备 ABI、APK 内容和动态库依赖。 |
| 只有 release 包找不到 JNI 方法或类 | 检查 JAR 与原生库版本是否一致，以及 consumer keep rules 是否生效。 |
| 打包时出现重复类或 `.so` | 检查是否同时引入了 AAR 和手动复制的 SDK 文件。 |
| 换了 ABI 或编译器，CMake 仍用旧配置 | 为新的工具链使用独立构建目录。 |

在目标设备上先验证模型加载和单张图像检测，再接相机。[Android 指南](../using-with/android.md)介绍初始化、CPU 策略、帧数据生命周期与版本诊断。

源码：[Android 构建脚本](https://github.com/HyperInspire/InspireFace/blob/v1.2.4/command/build_android.sh)、[Java/JNI 构建规则](https://github.com/HyperInspire/InspireFace/blob/v1.2.4/cpp/inspireface/platform/jni/portable/CMakeLists.txt)。
