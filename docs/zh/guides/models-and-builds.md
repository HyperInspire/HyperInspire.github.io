# 模型资源包 {#models-and-builds}

部署 InspireFace 需要三部分配套：原生 SDK、模型资源包，以及后端所需的运行库。先确认它们能够配合工作，再调整检测参数。

## 选择模型资源包 {#pick-a-resource-pack}

| Pack | Backend | 使用建议 |
| --- | --- | --- |
| `Pikachu` | CPU / MNN | 适合首次接入和较小规模部署。 |
| `Megatron` | CPU / MNN | 可作为另一种通用模型选择，在目标设备上比较大小与性能。 |
| `Megatron_TRT` | NVIDIA TensorRT | 搭配启用 TensorRT 的 SDK 和兼容的 GPU 运行环境。 |
| `Gundam_RV1109` | Rockchip RV1109/RV1126 | 匹配 RKNPU 代际与板端运行环境。 |
| `Gundam_RV1106` | Rockchip RV1103/RV1106 | 匹配板端工具链与运行环境。 |
| `Gundam_RK356X`, `Gundam_RK3588` | Rockchip RK356x / RK3588 | 按实际 SoC 选择。 |

可通过[模型发布页](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x)或仓库中的 `command/download_models_general.sh` 下载模型包。在仓库根目录执行：

```bash
bash command/download_models_general.sh Pikachu
```

文件会保存为 `test_res/pack/Pikachu`，首次运行 CPU 示例使用这个包即可。需要下载脚本列出的全部模型包时，不传参数运行脚本。

iOS 和 macOS 的 CPU Framework 同样可以从 `Pikachu` 开始。CoreML 构建需配套兼容的 CoreML 模型包；修改编译选项或重命名通用包都不会转换模型格式。上面的通用下载脚本不提供 CoreML 包。

模型包是一个文件，有时没有扩展名。如果下载的是 ZIP 压缩包，先解压，再将模型包文件传给 `HFLaunchInspireFace` 或 `launch(resource_path=...)`。

## 创建会话前验证模型包 {#validate-before-creating-sessions}

1.2.4 接口提供模型包验证和元信息读取。下面的 Python 示例可直接使用 PyPI 的 **1.2.4.post1 包**：

```python
import inspireface as isf

info = isf.validate_resource_pack("/path/to/Pikachu")
print(info)
isf.launch(resource_path="/path/to/Pikachu")
```

C 中使用 `HFValidateResourcePack` 和配套头文件声明的 `HFResourcePackInfo` 检查资源格式。后端所需的运行库按下方对应平台指南安装。

Java、Android 和 Apple 接口也接受模型包的本地文件路径。先验证资源包，再启动运行时；应用退出前，释放所有会话并终止运行时。

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

发布应用时，记录 SDK 版本、模型包文件及其校验值。更换识别模型后，重新生成特征库中的向量，并重新评估比对阈值。

## 切换已加载的模型包 {#change-the-loaded-pack}

已经初始化的进程需要更换模型包时，使用 reload 接口：

| API | Entry point | 成功条件 |
| --- | --- | --- |
| C API | `HFReloadInspireFace(pack_path)` | 返回 `HSUCCEED`。 |
| C++ | `inspire::Launch::GetInstance()->Reload(pack_path)` | 返回 `0`。 |
| Objective-C | `[IFRuntime reloadAtPath:path error:&error]` | 返回 `YES`；失败时返回 `NO` 并提供 `NSError`。 |
| Swift | `try InspireFaceRuntime.reload(path: path)` | 正常返回；失败时抛出错误。 |
| Java | `check(HFReloadInspireFace(packPath))` | 成功时正常返回；失败时抛出 `InspireFaceException`。 |
| Python | `isf.reload(resource_path=pack_path)` | 返回 `True`；失败时抛出异常。 |

1.2.4 中，已有 Session 会继续持有创建时的资源。整个应用切换时，先停止提交帧，释放旧 Session，验证并重新加载模型包，成功后再创建新 Session。加载失败时先处理错误，再恢复图像处理。识别模型发生变化后，还需要重建特征库。

Android 1.2.4.post1 提供 `InspireFace.GlobalReload(packPath)`，返回 `false` 表示加载失败。切换前停止工作线程并关闭抓拍、快照、图像流和会话，加载成功后重新创建会话。AAR 自带的模型可通过 `GlobalLaunch(Context, model)` 初始化；外部模型可先用 `InspireFace.ValidateResourcePack(path)` 验证。

<figure>
<img class="feature-illustration" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/deploy.webp" alt="桌面、移动设备、服务器和边缘硬件的部署示意" width="1536" height="1024" loading="lazy" />
<figcaption>应用可以部署到不同设备，但 SDK、模型包与后端运行库必须配套。下面按目标平台选择接入路径。</figcaption>
</figure>

## 下载 SDK {#download-an-sdk}

[获取和编译：概述与下载](../build/README.md)列出 **1.2.4 原生发布包**、Python 包和 Android 依赖。选择时同时检查设备与**进程架构**，并使用配套的头文件、封装和原生库。原生发布包已支持 API level 2 示例，Python 1.2.4.post1 wheel 和 Android 1.2.4.post1 AAR 也包含这一版 SDK。

## 构建 CPU SDK {#build-a-cpu-sdk}

[源码准备与通用选项](../build/source.md)包含源码获取、依赖初始化和完整的 CPU 构建命令。[Linux](../build/linux.md) 与 [macOS](../build/macos.md) 章节进一步说明工具链、架构和产物检查。

## 影响接入的构建选项 {#build-options-that-affect-integration}

[常用 CMake 选项](../build/source.md#common-cmake-options)汇总动态 / 静态链接、C++ 头文件、示例、测试与硬件后端设置。平台脚本可能覆盖默认值，按对应章节选择配置。

## 各平台的构建方式 {#target-specific-builds}

- [Java](../build/java.md)：JAR、JNI 库和本机 JVM 验证。
- [Android](../build/android.md)：NDK、ABI、JNI 与 AAR 打包。
- [iOS](../build/ios.md)：真机与模拟器切片、XCFramework 和 CoreML。
- [macOS](../build/macos.md)：Intel / Apple Silicon Framework、Swift 模块和原生库。
- [HarmonyOS](../build/harmonyos.md)：原生 SDK 和 ArkTS HAR 工程。
- [NVIDIA TensorRT](../build/nvidia.md)：CUDA / TensorRT 依赖和构建环境。
- [Rockchip NPU](../build/rockchip.md)：板端工具链、RKNN 与 RGA。
- [Python 打包](../build/python.md)：替换原生库、制作 wheel 和安装验证。

启动失败时，先检查文件路径，以及模型包与 SDK 构建是否配套。后续步骤见[模型加载排查](./troubleshooting.md#model-launch-fails)。
