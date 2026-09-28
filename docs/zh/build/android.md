# 构建 Android SDK {#build-for-android}

需要增加 ABI、修改 native 实现，或为自己的 JNI 层提供库时，可以编译 Android SDK。预编译包见 [SDK 下载概述](./README.md)。Rockchip Android 的构建方法放在 [RKNN 章节](./rockchip.md)。

## 准备工具链 {#prepare-the-toolchain}

先完成[源码准备](./source.md)，再安装 CMake 3.20 或更新版本、Make 和 Android NDK。以下命令均从 InspireFace 仓库根目录运行。

`ANDROID_NDK` 应指向包含 `build/cmake/android.toolchain.cmake` 的 NDK 目录，而不是 Android SDK 或 Android Studio 的安装目录。

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
test -f "$ANDROID_NDK/build/cmake/android.toolchain.cmake"
cmake --version
```

仓库的 SDK 发布流程使用 NDK r18b。Android 示例应用另用 NDK `28.1.13356709` 编译兼容桥接层，以 JDK 17 运行 Gradle，并使用 Android SDK 35。构建 native 库时记录所用 NDK 版本，方便比较产物和排查设备上的问题。

## 构建标准 SDK {#build-the-standard-sdk}

```bash
VERSION=1.2.4 bash command/build_android.sh
```

`VERSION` 只给输出目录添加后缀；SDK 版本取决于源码。未设置这个变量时，输出目录为 `build/inspireface-android`。

| Setting | Script value |
| --- | --- |
| ABI | `arm64-v8a`、`armeabi-v7a`、`x86_64` |
| Native API level | 三种 ABI 均为 `21` |
| Build type | `Release` |
| C++ runtime | `c++_static` |
| Library | 动态库 `libInspireFace.so`，包含 Android JNI 入口 |
| Samples and tests | 关闭 |

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
  version.txt
```

最后的整理步骤会删除中间 CMake 构建目录。如果需要保留缓存和目标文件，用于调试或增量编译，可以使用下面的直接构建方式。

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
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_ENABLE_BENCHMARK=OFF \
  -DISF_ENABLE_USE_LFW_DATA=OFF \
  -DISF_ENABLE_TEST_EVALUATION=OFF
cmake --build build/android-arm64-local --parallel 4
cmake --install build/android-arm64-local
```

</details>

安装后的 native SDK 位于 `build/android-arm64-local/install/InspireFace/`。其中 `java/` 保存这份源码随库安装的附加 Java 声明，包括抓拍和检测快照接口。

## 将 native 库打包进应用 {#package-the-native-library}

如果应用有自己的 JNI 层，将各 ABI 的库放入对应的 `jniLibs` 目录，并把安装后的头文件路径加入 native 目标的 include 路径：

```text
app/src/main/jniLibs/
  arm64-v8a/libInspireFace.so
  armeabi-v7a/libInspireFace.so
  x86_64/libInspireFace.so
```

只打包应用及其所有 native 依赖都支持的 ABI。例如，只面向 arm64 的应用可以在模块配置中设置：

```groovy
android {
    defaultConfig {
        ndk {
            abiFilters 'arm64-v8a'
        }
    }
}
```

native 构建不会直接生成 AAR。Java SDK 包还需要基础 Java API 及其对应的 JNI 实现。仓库中的 Android 示例使用 `1.2.0` AAR 提供基础 API，再单独编译兼容桥接层；这一配置的接入步骤见 [Android 使用指南](../using-with/android.md)。

维护自己的 Java SDK 模块时，应一起更新 native 库和 Java 声明。附加声明位于 `cpp/inspireface/platform/jni/java/`；多 ABI 脚本整理后的目录不保留这部分文件，需要从同一份源码复制。这些类用于扩展基础 API，不能替代 `InspireFace`、`Session`、`ImageStream` 等基础类。

每个 ABI 只保留一份选定的 `libInspireFace.so`。如果依赖的 AAR 已经包含它，应先在自己维护的 SDK 模块中替换，再构建应用。让 Gradle 从重复文件中随意挑选，可能把旧 JNI 实现打入 APK。

## 检查构建结果 {#check-the-result}

可以用 NDK 自带的 `llvm-readelf` 查看库文件。将 `HOST_TAG` 替换为本机 NDK 的 `toolchains/llvm/prebuilt/` 下实际存在的目录名：

```bash
export NDK_HOST_TAG=HOST_TAG
"$ANDROID_NDK/toolchains/llvm/prebuilt/$NDK_HOST_TAG/bin/llvm-readelf" \
  -h -d -l build/inspireface-android-1.2.4/lib/arm64-v8a/libInspireFace.so
```

`arm64-v8a` 的 machine 应为 AArch64。再用 Android Studio 的 APK Analyzer 检查最终 APK，确认同一份库已进入 `lib/arm64-v8a/`。CMake 目标设置了 16 KB ELF 页对齐；应用的页面大小验证还应覆盖其他 native 库及最终 APK。

| Symptom | Check |
| --- | --- |
| 找不到 NDK toolchain 文件 | `ANDROID_NDK` 应指向一个具体 NDK 版本的目录，而不是它的父目录。 |
| 加载时出现 `UnsatisfiedLinkError` | 检查设备 ABI、APK 内容和动态库依赖。 |
| 找不到 JNI 方法 | 检查 Java 声明与实际加载的 `.so` 是否属于同一套 SDK 接入配置。 |
| 打包时出现重复 `.so` | 检查 AAR 和 `jniLibs` 是否同时提供了同一个库。 |
| 换了 ABI 或编译器，CMake 仍用旧配置 | 为新的工具链使用独立构建目录。 |

在目标设备上先验证模型加载和单张图像检测，再接相机。[Android 指南](../using-with/android.md)介绍了模型资源、Java 初始化和帧数据的生命周期。

源码：[Android 构建脚本](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_android.sh)、[native 目标和安装规则](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/inspireface/CMakeLists.txt)。
