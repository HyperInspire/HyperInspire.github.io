# Model packs {#models-and-builds}

An InspireFace deployment needs three matching pieces: a native SDK, a resource pack and any runtime libraries required by its backend. Choose these together before tuning detection parameters.

## Pick a resource pack

| Pack family | Intended backend | Starting point |
| --- | --- | --- |
| `Pikachu` | General CPU / MNN | First integration and smaller deployments. |
| `Megatron` | General CPU / MNN | Another general-purpose model choice; check its size and performance on your target. |
| `Megatron_TRT` | NVIDIA TensorRT | Use with a TensorRT-enabled SDK and compatible GPU runtime. |
| `Gundam_RV1109` | Rockchip RV1109/RV1126 | Match the RKNPU generation and board runtime. |
| `Gundam_RV1106` | Rockchip RV1103/RV1106 family | Match the board's toolchain and runtime. |
| `Gundam_RK356X`, `Gundam_RK3588` | Rockchip RK356x or RK3588 | Use the pack for the actual SoC. |

The [model release page](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x) and the repository's `command/download_models_general.sh` provide the pack files. From the repository root:

```bash
bash command/download_models_general.sh Pikachu
```

This writes `test_res/pack/Pikachu`, which is enough for the first CPU example. To download every listed pack, run the script without an argument.

For iOS and macOS CPU frameworks, start with `Pikachu` as well. A CoreML build needs a compatible CoreML pack; changing the build flag or renaming a general pack does not convert its models. The general download script above does not provide a CoreML pack.

A pack is a file, sometimes without an extension. If you downloaded a ZIP archive, extract it first. Pass the pack file to `HFLaunchInspireFace` or `launch(resource_path=...)`.

## Validate before creating sessions

The 1.2.4 API includes pack validation and metadata inspection. The Python example works with the **1.2.4.post1 PyPI package**:

```python
import inspireface as isf

info = isf.validate_resource_pack("/path/to/Pikachu")
print(info)
isf.launch(resource_path="/path/to/Pikachu")
```

In C, use `HFValidateResourcePack` with `HFResourcePackInfo` as declared in the matching header. This checks the resource format. Install backend runtime dependencies using the target platform's guide below.

Java, Android and the Apple interfaces accept a local filesystem path to the pack. Validate it before launching the runtime. At shutdown, release all sessions before terminating the runtime.

::: tabs #api-language

@tab Java

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.HFResourcePackInfo;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

public final class PackRuntime {
    public static void launch(String path) {
        HFResourcePackInfo info = new HFResourcePackInfo();
        check(HFValidateResourcePack(path, info));
        check(HFLaunchInspireFace(path));
    }
}
```

@tab Android

```java
import com.insightface.sdk.inspireface.InspireFace;

public final class AndroidPackRuntime {
    // Call on a worker before creating sessions; path names a local pack file.
    public static void launch(String path) {
        InspireFace.ValidateResourcePack(path);
        if (!InspireFace.GlobalLaunch(path)) {
            throw new IllegalStateException("Cannot load model pack");
        }
    }
}
```

@tab Objective-C

```objc
#import <InspireFace/InspireFaceApple.h>

BOOL LaunchValidatedPack(NSString *path, NSError **error) {
    HFResourcePackInfo info = {0};
    if (![IFRuntime validateResourcePackAtPath:path info:&info error:error]) {
        return NO;
    }
    return [IFRuntime launchAtPath:path error:error];
}
```

@tab Swift

```swift
import InspireFaceSwift

func launchValidatedPack(path: String) throws {
    var info = HFResourcePackInfo()
    try InspireFaceRuntime.validateResourcePack(path: path, info: &info)
    try InspireFaceRuntime.launch(path: path)
}
```

:::

Record the SDK version, pack file and checksum with your application release. When changing the recognition model, regenerate gallery embeddings and reevaluate the comparison threshold.

## Change the loaded pack

Use the reload entry point when an already initialized process needs a different pack:

| API | Entry point | Success |
| --- | --- | --- |
| C API | `HFReloadInspireFace(pack_path)` | Return code `HSUCCEED`. |
| C++ | `inspire::Launch::GetInstance()->Reload(pack_path)` | Return code `0`. |
| Objective-C | `[IFRuntime reloadAtPath:path error:&error]` | Returns `YES`; failures return `NO` with an `NSError`. |
| Swift | `try InspireFaceRuntime.reload(path: path)` | Returns normally; failures throw. |
| Java | `check(HFReloadInspireFace(packPath))` | Returns normally; failures throw `InspireFaceException`. |
| Python | `isf.reload(resource_path=pack_path)` | Returns `True`; failures raise an exception. |

In 1.2.4, existing sessions retain the resources they were created with. To switch the whole application, stop submitting frames, release the old sessions, validate and reload the new pack, then create new sessions after loading succeeds. Handle any loading error before resuming processing. Rebuild the gallery when the recognition model changes.

Android 1.2.4.post1 provides `InspireFace.GlobalReload(packPath)`, which returns `false` on failure. Stop workers and close capture objects, snapshots, streams and sessions before switching, then create new sessions after loading succeeds. Use `GlobalLaunch(Context, model)` for the AAR’s bundled models; validate an external pack with `InspireFace.ValidateResourcePack(path)` first.

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/deploy.webp" alt="Deployment across desktops, mobile devices, servers and edge hardware" width="1536" height="1024" loading="lazy" />
<figcaption>Different devices use the same integration pattern, but the SDK, pack and backend runtime must match. Select the platform guide below for the actual deployment steps.</figcaption>
</figure>

## Download an SDK

[Get and build the SDK: overview and downloads](../build/README.md) lists the **1.2.4 native release**, Python package and Android dependency. Check the device and **process architecture**, and use matching headers, wrappers and native libraries. The native release supports the API-level-2 examples; Python 1.2.4.post1 wheels and the Android 1.2.4.post1 AAR also include this SDK version.

## Build a CPU SDK

[Source and common options](../build/source.md) includes the checkout, dependency initialization and complete CPU build commands. The [Linux](../build/linux.md) and [macOS](../build/macos.md) chapters cover toolchains, architecture and output checks.

## Build options that affect integration

[Common CMake options](../build/source.md#common-cmake-options) covers shared/static linkage, C++ headers, samples, tests and hardware backends. Platform scripts can override the defaults; use the corresponding build chapter to choose the configuration.

## Target-specific builds

- [Java](../build/java.md): JAR, JNI libraries and host JVM checks.
- [Android](../build/android.md): NDK, ABIs, JNI and AAR packaging.
- [iOS](../build/ios.md): device / simulator slices, XCFrameworks and CoreML.
- [macOS](../build/macos.md): Intel / Apple Silicon frameworks, Swift modules and native libraries.
- [HarmonyOS](../build/harmonyos.md): native SDK and ArkTS HAR project.
- [NVIDIA TensorRT](../build/nvidia.md): CUDA/TensorRT dependencies and build environments.
- [Rockchip NPU](../build/rockchip.md): board toolchains, RKNN and RGA.
- [Python packaging](../build/python.md): replace native libraries, build wheels and verify installation.

For a failed launch, check the file path and pack/build pairing first. See [Troubleshooting](./troubleshooting.md#model-launch-fails) for the next steps.
