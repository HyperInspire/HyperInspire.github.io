# Build for Android {#build-for-android}

For an Android application, add the [1.2.4.post1 AAR](../using-with/android.md#choose-a-package-or-source-build). For C/C++ or portable Java, download the **1.2.4 native SDK** below. Build from source when you need a native change or your own SDK package. Rockchip Android builds have their own [RKNN instructions](./rockchip.md).

The standard script now produces the C/C++ SDK and a portable Java JAR together. Each ABI has one `libInspireFace.so` containing the core, Android JNI and portable JNI functions.

## Download the prebuilt SDK {#download-the-prebuilt-sdk}

The [Android 1.2.4 ZIP](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-1.2.4.zip) contains the same SDK layout shown below, without the leading `build/` directory. No NDK build is needed to use it:

```bash
curl -fL -o inspireface-android-1.2.4.zip \
  https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-1.2.4.zip
unzip inspireface-android-1.2.4.zip
```

Use `include/` and `lib/<abi>/libInspireFace.so` for native integration. For portable Java, also use `java/inspireface.jar` and `java/consumer-rules.pro`, then follow [application packaging](#package-the-native-library). Download a [model pack](../guides/models-and-builds.md) separately. The ZIP contains neither an AAR nor the complete Android convenience API; use the AAR for the `InspireFace`, `Session` and `Bitmap` examples in the Android guide.

## Prepare the toolchain {#prepare-the-toolchain}

Complete [source preparation](./source.md), then install CMake 3.20 or newer, Make, Python 3, a JDK (8 or newer) and the Android NDK. Run the following commands from the SDK directory. The JDK compiles the Java 8-compatible JAR; Python generates and checks the bindings.

`ANDROID_NDK` must point to the NDK directory containing `build/cmake/android.toolchain.cmake`, rather than the Android SDK or Android Studio directory. If CMake cannot locate the JDK, set `JAVA_HOME` to its installation directory.

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
test -f "$ANDROID_NDK/build/cmake/android.toolchain.cmake"
cmake --version
javac -version
python3 --version
```

The SDK's release workflow currently selects NDK r18b. An application that consumes the prebuilt AAR does not need that NDK: its Java and native libraries are already compiled. The example app uses JDK 17 to run Gradle and Android SDK 35.

## Build the standard SDK {#build-the-standard-sdk}

```bash
VERSION=1.2.4 bash command/build_android.sh
```

`VERSION` adds a directory suffix; the native SDK version comes from the source. Without this variable, the output directory is `build/inspireface-android`. The Android publication's `.post1` suffix is separate from the native version.

| Setting | Script value |
| --- | --- |
| ABI | `arm64-v8a`, `armeabi-v7a`, `x86_64` |
| Native API level | `21` for all three ABIs; the published AAR requires API `24` |
| Build type | `Release` |
| C++ runtime | `c++_static` |
| Library | One shared `libInspireFace.so` per ABI |
| Java bindings | `ISF_BUILD_JAVA=ON`, Java 8-compatible `inspireface.jar` |
| Binding checks | C declarations, generated Java/JNI signatures and native exports |
| Samples, native tests and host JVM tests | Disabled |

The script builds each ABI, installs the SDK and collects the files into one directory:

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

`java/sources/` matches the JAR. The separate `java/com/...` directory holds supplementary Android capture/snapshot source files; it is not a complete copy of the Android convenience API. Use the AAR when you need `InspireFace`, `Session` and `Bitmap` helpers together.

The final collection step removes intermediate CMake build directories. Use the direct CMake build below to retain the cache and object files for repeated compilation.

## Build one ABI {#build-one-abi}

This arm64 configuration keeps the build tree and installed files separate. For `armeabi-v7a`, change `ANDROID_ABI` and add `-DANDROID_ARM_NEON=TRUE`.

<details>
<summary>Single-ABI CMake commands</summary>

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

The C/C++ SDK is installed under `build/android-arm64-local/install/InspireFace/`. The JAR, manifest, portable sources and consumer rules are under `build/android-arm64-local/install/Java/`. Portable JNI is linked into `libInspireFace.so` on Android; no `libInspireFaceJNI.so` is produced. Host JVM contract tests remain disabled for this cross-compilation target.

## Package the native library {#package-the-native-library}

Choose one of these routes:

| Integration | Files to package |
| --- | --- |
| Android convenience API | The complete [Android AAR](../using-with/android.md), with its models and consumer rules. |
| Portable Java API | `java/inspireface.jar`, `lib/<abi>/libInspireFace.so`, model resources and the supplied consumer rules. |
| Your own JNI / C++ | `lib/<abi>/libInspireFace.so` and the installed headers for compilation. |

For the portable Java route, copy the JAR and libraries into the application module and copy `java/consumer-rules.pro` to `app/proguard-inspireface.pro`:

```text
app/
  libs/inspireface.jar
  proguard-inspireface.pro
  src/main/jniLibs/
    arm64-v8a/libInspireFace.so
    armeabi-v7a/libInspireFace.so
    x86_64/libInspireFace.so
```

The corresponding module configuration is:

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

Use `com.insightface.sdk.inspireface.jni.Native` as described in the [Java guide](../using-with/java.md). On Android it automatically loads `InspireFace` from the packaged native libraries. Copy the model pack to a readable file path before calling `HFLaunchInspireFace`; Android assets are not ordinary file paths. The JAR itself contains neither models nor Android `Bitmap` helpers.

::: warning Keep JNI names when shrinking
A plain JAR does not automatically apply the accompanying Android consumer rules. JNI resolves class names, fields and constructors at runtime, so keep the supplied rules in the application's release configuration. An AAR includes its consumer rules automatically.
:::

<details>
<summary>Portable Java JNI rules</summary>

```text
-keep class com.insightface.sdk.inspireface.jni.Native { *; }
-keep class com.insightface.sdk.inspireface.jni.CPUEngine { native <methods>; }
-keep class com.insightface.sdk.inspireface.jni.NativeTypes$* { *; }
```

</details>

Do not combine the complete AAR with another `inspireface.jar` or a second copy of its native libraries. When upgrading an earlier two-library source package, remove `libInspireFaceJNI.so`. For each ABI, keep the Java classes and `libInspireFace.so` from the same build; using Gradle `pickFirst` to suppress duplicate files can silently retain an older implementation.

## Check the result {#check-the-result}

Use the NDK's `llvm-readelf` to inspect an output library. Replace `HOST_TAG` with the directory present under your NDK's `toolchains/llvm/prebuilt/`:

```bash
export NDK_HOST_TAG=HOST_TAG
"$ANDROID_NDK/toolchains/llvm/prebuilt/$NDK_HOST_TAG/bin/llvm-readelf" \
  -h -d -l build/inspireface-android-1.2.4/lib/arm64-v8a/libInspireFace.so
```

Check that the machine is AArch64 for `arm64-v8a`, then use Android Studio's APK Analyzer to confirm one `libInspireFace.so` reached each selected ABI directory. The 1.2.4 Release ZIP uses 16 KB ELF load-segment alignment for all three ABIs. The source target also sets this alignment; check other native dependencies and final APK alignment as part of the application's page-size validation too.

| Symptom | Check |
| --- | --- |
| CMake cannot find Java or Python | Make the JDK development tools and Python 3 available; check `JAVA_HOME`. |
| NDK toolchain file cannot be found | `ANDROID_NDK` must point to one installed NDK version. |
| `UnsatisfiedLinkError` when loading | Device ABI, APK contents and shared-library dependencies. |
| Missing JNI method or class only in release builds | Matching JAR/native versions and the consumer keep rules. |
| Duplicate class or `.so` during packaging | Check for both an AAR and manually copied SDK files. |
| ABI or compiler changed, but CMake uses old settings | Use a new build directory for the new toolchain. |

Finish with model launch and single-image detection on the target device, then connect camera input. The [Android guide](../using-with/android.md) covers initialization, CPU policy, frame ownership and version diagnostics.

Source: [Android build script](https://github.com/HyperInspire/InspireFace/blob/v1.2.4/command/build_android.sh), [Java/JNI build rules](https://github.com/HyperInspire/InspireFace/blob/v1.2.4/cpp/inspireface/platform/jni/portable/CMakeLists.txt).
