# Build for HarmonyOS {#build-for-harmonyos}

The HarmonyOS build has two outputs: a native C/C++ SDK and an ArkTS HAR module. Choose the HAR module for an ArkTS app; choose the native SDK when you provide your own native integration. See [SDK downloads](./README.md) for the available prebuilt packages.

The configurations below use InspireFace `1.2.4`, target `arm64-v8a`, and run inference with MNN on the CPU. They use raw pixel buffers for image input. Build locally and validate the packaged app on the devices you plan to support.

## Prepare the Native SDK {#prepare-the-native-sdk}

Complete [source preparation](./source.md), then install an OpenHarmony Native SDK, CMake 3.20–3.x, Make and Node.js. The HAR script does not pass the additional policy setting needed by its dependencies under CMake 4. DevEco Studio is used later to integrate and package the HAR module.

Set `OHOS_NATIVE_HOME` to the Native SDK directory containing the toolchain file:

```bash
export OHOS_NATIVE_HOME=/absolute/path/to/native-sdk/native
test -f "$OHOS_NATIVE_HOME/build/cmake/ohos.toolchain.cmake"
cmake --version
node --version
```

Without this variable, the scripts look under `build/harmony-tools/openharmony-6.1/native-sdk/native` inside the repository. They do not download that SDK automatically.

The source tree includes `cmake/ohos/node_modules/@ali/tcpkg/tcpkg.cmake`, which supplies the packaging hook expected by MNN's OHOS configuration. The build scripts set `NODE_PATH` to this directory. Keep it with the rest of the source preparation; no separate `tcpkg` installation is needed for this path.

## Build the ArkTS module {#build-the-arkts-module}

From the InspireFace repository root:

```bash
bash command/build_harmonyos_napi.sh
```

The script builds the `InspireFaceNapi` target, installs it and strips the installed library. The native core and third-party dependencies are linked into `libinspireface_napi.so`; the HAR does not need a second `libInspireFace.so`.

```text
build/inspireface-harmonyos-napi-arm64-v8a/install/HarmonyOS/
  libs/arm64-v8a/libinspireface_napi.so
  har/
    Index.ets
    oh-package.json5
    build-profile.json5
    hvigorfile.ts
    src/main/
      module.json5
      ets/InspireFace.ets
      cpp/types/libinspireface_napi/
        index.d.ts
        oh-package.json5
      libs/arm64-v8a/libinspireface_napi.so
```

`har/` is a staged HAR **project directory** containing the compiled library and ArkTS sources. Package it as a HAR through the application's normal DevEco Studio/Hvigor workflow.

| Setting | HAR build |
| --- | --- |
| Build type | `Release` |
| ABI | `arm64-v8a` |
| C++ runtime | `c++_static` |
| Native core | Static, position-independent code |
| Public native entry | Node-API registration in `libinspireface_napi.so` |
| Inference backend | MNN CPU |
| Optional backends | RKNN, RGA, TensorRT, CUDA and Apple extension disabled |

## Add the HAR to an app {#add-the-har-to-an-app}

Copy the installed `har/` directory into your DevEco Studio app as an `inspireface` module, register that module in the project and add a local dependency from the entry module. For sibling `entry/` and `inspireface/` directories, use:

```json
{
  "dependencies": {
    "@hyperinspire/inspireface": "file:../inspireface"
  }
}
```

Sync the project dependencies, then build the app or HAR using the selected DevEco SDK and your project's Hvigor configuration. Keep `Index.ets`, the ArkTS wrapper, native declarations and compiled `.so` together when distributing the module.

The `harmony/inspireface/` source directory is the template for this package. Use the **installed** `har/` directory for integration because it also contains the native library produced by the build.

Both `oh-package.json5` manifests must match the native SDK version. The CMake configuration checks the top-level module manifest and the `libinspireface_napi` type-package manifest against the source version (`1.2.4` in this checkout). Upgrade these pieces together when changing SDK versions.

Put the model pack in an app-readable file location. If you bundle it as a raw resource, copy it to the app's files directory before launch. The [HarmonyOS integration guide](../using-with/harmonyos.md) includes an ArkTS detection example and worker-lifetime rules.

## Build the native SDK only {#build-the-native-sdk-only}

For a native application or a custom bridge:

```bash
bash command/build_harmonyos.sh
```

The standard configuration builds `libInspireFace.so` and installs the C headers:

```text
build/inspireface-harmonyos-arm64-v8a/install/
  InspireFace/
    include/
    lib/libInspireFace.so
  version.txt
```

Use that library and its matching headers in your native target. This output does not contain the ArkTS module. For ArkTS, use the Node-API build above so that the native exports, declarations and wrapper are packaged together.

## Build locations and checks {#build-locations-and-checks}

| Environment variable | Purpose |
| --- | --- |
| `OHOS_NATIVE_HOME` | Native SDK directory. |
| `OHOS_BUILD_DIR` | Output directory for the C/C++ SDK. |
| `OHOS_NAPI_BUILD_DIR` | Output directory for the Node-API/HAR build. |
| `OHOS_BUILD_JOBS` | Parallel build jobs; defaults to `4`. |

The HarmonyOS scripts do not use `VERSION` for output names. Set the appropriate build-directory variable if you want a versioned directory:

```bash
OHOS_NAPI_BUILD_DIR="$PWD/build/harmonyos-napi-1.2.4" \
OHOS_BUILD_JOBS=4 \
  bash command/build_harmonyos_napi.sh
```

The Node-API target runs checks after linking: the library must be AArch64, register its Node-API module, depend on `libace_napi.z.so`, keep the core C API hidden, and avoid Android-only libraries. A separate contract check covers the C API, native bridge, type declarations and ArkTS wrapper.

| Symptom | Check |
| --- | --- |
| Native SDK cannot be found | `OHOS_NATIVE_HOME` contains `build/cmake/ohos.toolchain.cmake`. |
| `tcpkg` compatibility module is missing | The `cmake/ohos/` directory is present in the checkout. |
| Package version check fails | Both manifests and the native source use the same SDK version. |
| ArkTS types resolve but native loading fails | The installed module includes `src/main/libs/arm64-v8a/libinspireface_napi.so`. |
| Contract or ABI check fails | Read the reported missing method, declaration or library before packaging the module. |

After packaging, check model launch, one RGBA detection, result release and shutdown on a target device. Then test camera format conversion and worker scheduling in the app. See [HarmonyOS usage](../using-with/harmonyos.md) for the complete flow.

Source: [native build script](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_harmonyos.sh), [Node-API build script](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/command/build_harmonyos_napi.sh), [HAR install and version checks](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/cpp/inspireface/platform/ohos/napi/CMakeLists.txt).
