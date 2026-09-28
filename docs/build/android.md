# Build for Android {#build-for-android}

Build the Android native SDK when you need a different ABI, a local native change, or a library for your own JNI layer. For a ready-made package, start with the [SDK downloads](./README.md). Rockchip Android builds have their own [RKNN instructions](./rockchip.md).

## Prepare the toolchain {#prepare-the-toolchain}

Complete [source preparation](./source.md), then install CMake 3.20 or newer, Make and the Android NDK. Run the following commands from the InspireFace repository root.

`ANDROID_NDK` must point to the NDK directory containing `build/cmake/android.toolchain.cmake`. An Android SDK or Android Studio directory is not the same path.

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
test -f "$ANDROID_NDK/build/cmake/android.toolchain.cmake"
cmake --version
```

The repository's SDK release workflow uses NDK r18b. The Android example app separately uses NDK `28.1.13356709` for its compatibility bridge, JDK 17 to run Gradle, and Android SDK 35. Keep a record of the NDK used for your native build when comparing binaries or diagnosing device-specific issues.

## Build the standard SDK {#build-the-standard-sdk}

```bash
VERSION=1.2.4 bash command/build_android.sh
```

`VERSION` adds a directory suffix; the SDK version itself comes from the source checkout. Without this variable, the output directory is `build/inspireface-android`.

| Setting | Script value |
| --- | --- |
| ABI | `arm64-v8a`, `armeabi-v7a`, `x86_64` |
| Native API level | `21` for all three ABIs |
| Build type | `Release` |
| C++ runtime | `c++_static` |
| Library | Shared `libInspireFace.so`, including Android JNI entry points |
| Samples and tests | Disabled |

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
  version.txt
```

The final collection step removes the intermediate CMake build directories. Use the direct CMake build below if you want to retain the cache and object files for debugging or repeated compilation.

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
  -DISF_BUILD_WITH_SAMPLE=OFF \
  -DISF_BUILD_WITH_TEST=OFF \
  -DISF_ENABLE_BENCHMARK=OFF \
  -DISF_ENABLE_USE_LFW_DATA=OFF \
  -DISF_ENABLE_TEST_EVALUATION=OFF
cmake --build build/android-arm64-local --parallel 4
cmake --install build/android-arm64-local
```

</details>

The installed native SDK is under `build/android-arm64-local/install/InspireFace/`. Its `java/` directory contains the additional Java declarations shipped with this checkout, including capture and detection snapshots.

## Package the native library {#package-the-native-library}

For an app with its own JNI layer, place each native library in the matching `jniLibs` directory and add the installed headers to your native target's include paths:

```text
app/src/main/jniLibs/
  arm64-v8a/libInspireFace.so
  armeabi-v7a/libInspireFace.so
  x86_64/libInspireFace.so
```

Include only the ABIs that your app and all its native dependencies support. For example, an arm64-only app can use this module setting:

```groovy
android {
    defaultConfig {
        ndk {
            abiFilters 'arm64-v8a'
        }
    }
}
```

The native build does not assemble an AAR. A Java SDK package also needs the base Java API and its matching JNI implementation. The repository's Android example uses the `1.2.0` AAR for that base API and adds its compatibility bridge separately; follow the [Android integration guide](../using-with/android.md) for that configuration.

When maintaining your own Java SDK module, update the native library and Java declarations together. The additional declarations are in `cpp/inspireface/platform/jni/java/`; the multi-ABI script's final output does not retain that directory, so copy them from the same source checkout. They extend the base API and do not replace its classes such as `InspireFace`, `Session` and `ImageStream`.

Ensure each ABI contains one selected copy of `libInspireFace.so`. If a dependency AAR already packages it, replace the library in the SDK module you own before assembling the app. Choosing an arbitrary duplicate during Gradle packaging can leave an older JNI implementation in the APK.

## Check the result {#check-the-result}

Use the NDK's `llvm-readelf` to inspect an output library. Replace `HOST_TAG` with the directory present under your NDK's `toolchains/llvm/prebuilt/`:

```bash
export NDK_HOST_TAG=HOST_TAG
"$ANDROID_NDK/toolchains/llvm/prebuilt/$NDK_HOST_TAG/bin/llvm-readelf" \
  -h -d -l build/inspireface-android-1.2.4/lib/arm64-v8a/libInspireFace.so
```

Check that the machine is AArch64 for `arm64-v8a`, then inspect the APK with Android Studio's APK Analyzer to confirm the same library reached `lib/arm64-v8a/`. The CMake target sets 16 KB ELF page alignment; check the other native libraries and the final APK as part of your app's page-size validation too.

| Symptom | Check |
| --- | --- |
| NDK toolchain file cannot be found | `ANDROID_NDK` points to one installed NDK version, not its parent directory. |
| `UnsatisfiedLinkError` when loading | Device ABI, APK contents and shared-library dependencies. |
| A JNI method cannot be found | Java declarations and the loaded `.so` belong to the same SDK integration. |
| Duplicate `.so` during packaging | An AAR and `jniLibs` both provide the same library. |
| ABI or compiler changed, but CMake uses old settings | Configure a new build directory for the new toolchain. |

Finish with model launch and a single-image detection on the target device, then connect camera input. The [Android guide](../using-with/android.md) covers model assets, Java initialization and frame ownership.

Source: [Android build script](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_android.sh), [native target and install rules](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/inspireface/CMakeLists.txt).
