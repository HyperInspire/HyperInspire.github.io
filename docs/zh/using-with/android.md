# Android {#android}

Android Java API 可以直接处理位图和相机输入。**1.2.4.post1** 包含原生 InspireFace **1.2.4**、完整的可移植 Java API、人脸抓拍和检测快照。Kotlin 也可以调用这些接口。

先用位图确认模型加载，再接入摄像头。[Android 构建章节](../build/android.md)介绍源码编译与打包；普通 JVM 上的桌面应用和服务见 [Java 接入指南](./java.md)。

## 选择安装包或源码构建 {#choose-a-package-or-source-build}

Android 应用可以使用下面的 AAR。C/C++ 或可移植 Java 接入也可以下载原生 [1.2.4 Release ZIP](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-android-1.2.4.zip)，其中包含头文件、JAR 和三种 ABI 的库；模型和完整的 Android 便捷接口则随 AAR 提供。ZIP 目录与 Gradle 配置见[原生包接入](../build/android.md#download-the-prebuilt-sdk)。

在 `settings.gradle` 的依赖仓库中添加 JitPack：

```groovy
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}
```

应用模块中添加：

```groovy
dependencies {
    implementation 'com.github.HyperInspire:inspireface-android-sdk:v1.2.4.post1'
}
```

开头的 `v` 是 [JitPack 版本号](https://jitpack.io/#HyperInspire/inspireface-android-sdk/v1.2.4.post1)的一部分。

| Item | AAR 包含的内容 |
| --- | --- |
| Android | API 24 或更新版本 |
| ABI | `arm64-v8a`、`armeabi-v7a`、`x86_64` |
| Native library | 每个 ABI 一份 `libInspireFace.so`，同时包含两套 Java 接口的 JNI 实现 |
| Java | Android 便捷接口及 `com.insightface.sdk.inspireface.jni.*`；兼容 Java 8 |
| Models | `assets/inspireface/` 下的 `Pikachu` 和 `Megatron` |
| Shrinking | 保护 JNI 类、字段和构造方法的 R8/ProGuard consumer rules |

应用直接依赖 AAR 即可，无需编译 NDK 工程或另加 JNI 桥接层。从旧版升级时，如果应用曾额外加入 SDK 桥接库或复制过 Java 类，切换到新包后应清理这些重复内容。需要修改原生 SDK 时，再使用[源码构建](../build/android.md)。

### 运行示例项目 {#run-the-example-project}

[Android 示例](https://github.com/tunmx/InspireFace-Example-Android)基于 CameraX，包含照片分析、跟踪、录入和检索。使用 Android Studio 打开项目，准备 JDK 17 和 Android SDK 35。Java 源码级别为 8，构建工具使用 JDK 17。

连接 Android 设备并开启 USB 调试，或启动使用上述受支持 ABI 的模拟器：

```bash
git clone https://github.com/tunmx/InspireFace-Example-Android.git
cd InspireFace-Example-Android
./gradlew :app:assembleDebug
./gradlew :app:installDebug
```

Android Studio 会将 SDK 路径写入 `local.properties`；命令行构建可使用 `ANDROID_HOME`。Debug APK 位于 `app/build/outputs/apk/debug/`。先打开照片功能，再进入摄像头功能并授予相机权限，也可以直接[安装演示应用](../introduction.md#try-the-android-example-app)。

::: tip 接入应用
示例中的 `FaceEngine` 管理启动、模型切换和会话，`UprightFaceCameraAnalyzer` 准备相机帧并在工作线程中分析。切换模型前会等待正在使用的会话关闭。
:::

| File or directory | 用途 |
| --- | --- |
| `app/src/main/java/.../view/FaceEngine.java` | SDK 启动、会话配置与释放。 |
| `app/src/main/java/.../view/` | 相机分析器与各功能页面。 |
| `gradle/libs.versions.toml` | SDK 和 Android 库的依赖版本。 |
| `app/src/main/AndroidManifest.xml` | 声明相机权限；运行时授权也由应用处理。 |

## 添加模型并初始化 {#add-the-model-and-initialize}

AAR 已包含 `Pikachu` 和 `Megatron`。`GlobalLaunch(context, modelName)` 会将这些 assets 复制到应用专属的外部文件目录，再打开选定的模型包。在 SDK 工作线程中启动一次，避免阻塞 UI；会话在所属任务期间持续复用。

```java
import android.content.Context;
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.CustomParameter;
import com.insightface.sdk.inspireface.base.Session;
import com.insightface.sdk.inspireface.jni.CPUEngine;

// Call on the SDK worker. Keep the returned session for subsequent frames.
public static Session openSession(Context context) {
    CPUEngine.setGlobalPowerMode(CPUEngine.PowerMode.NORMAL);
    boolean launched = Boolean.TRUE.equals(InspireFace.GlobalLaunch(
            context.getApplicationContext(), InspireFace.PIKACHU));
    if (!launched) throw new IllegalStateException("Cannot load the model pack");

    CustomParameter options = InspireFace.CreateCustomParameter();
    Session session = InspireFace.CreateSession(
            options, InspireFace.DETECT_MODE_ALWAYS_DETECT, 10, 320, -1);
    if (session == null || session.handle == 0L) {
        throw new IllegalStateException("Cannot create the face session");
    }
    return session;
}
```

使用自己的模型包时，可以把资源**文件**放到 `app/src/main/assets/inspireface/Pikachu`，也可以自行管理本地文件，把路径传给 `GlobalLaunch(String resourcePath)`。外部模型包可先通过 `InspireFace.ValidateResourcePack(path)` 校验。下载方式与兼容性见[模型包说明](../guides/models-and-builds.md)。

## CPU 功耗策略 {#cpu-power-mode}

`NORMAL` 是默认 CPU 功耗策略。`CPUEngine.PowerMode` 还提供 `HIGH` 和 `LOW`，切换前可在目标设备上比较延时与功耗。应在创建会话前设置：它只影响之后初始化的 CPU 运行实例，不会改变已有会话、模型线程数或精度。启动、重载和终止 SDK 都会保留该设置；不要在模型或会话初始化期间并发修改。

## 检测位图 {#detect-a-bitmap}

下面的方法接受已经创建的会话，即使检测失败也会释放图像流：

```java
import android.graphics.Bitmap;
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.ImageStream;
import com.insightface.sdk.inspireface.base.MultipleFaceData;
import com.insightface.sdk.inspireface.base.Session;

public static int detectCount(Session session, Bitmap bitmap) {
    ImageStream stream = InspireFace.CreateImageStreamFromBitmap(
            bitmap, InspireFace.CAMERA_ROTATION_0);
    if (stream == null || stream.handle == 0L) {
        throw new IllegalStateException("Cannot create the image stream");
    }
    try {
        MultipleFaceData faces = InspireFace.ExecuteFaceTrack(session, stream);
        if (faces == null) throw new IllegalStateException("Face detection failed");
        for (int i = 0; i < faces.detectedNum; i++) {
            // Read faces.rects[i], faces.trackIds[i] and faces.trackCounts[i].
            // Extract features with this stream and faces.tokens[i] before releasing it.
        }
        return faces.detectedNum;
    } finally {
        InspireFace.ReleaseImageStream(stream);
    }
}
```

数量为零是有效结果，返回 null 则表示处理失败。1.2.4.post1 的 `ExecuteFaceTrack` 返回独立的 Java 数组，包含复制后的 token 和 `trackCounts`。特征提取与 Pipeline 分析仍需要匹配的图像流，应在同一会话处理下一帧之前完成。

所属工作线程结束后，调用 `InspireFace.ReleaseSession(session)`。只有所有应用会话均已释放，才能调用 `InspireFace.GlobalTerminate()`。Kotlin 中也应使用 `try/finally` 管理图像流和会话。

## 处理摄像头帧 {#process-camera-frames}

为摄像头序列创建一个 `DETECT_MODE_LIGHT_TRACK` 会话并持续复用，使用单一分析执行器保证帧顺序。处理速度低于采集速度时，丢弃过期帧，避免队列无限增长。

`CreateImageStreamFromByteBuffer` 接收 `byte[]` 像素、宽、高、像素格式和旋转参数。将 CameraX 的 `YUV_420_888` 平面转换成紧密排列的 NV21 时，分别处理行步长和像素步长。保持转换后的字节有效，直到该帧处理结束，并在 `finally` 中关闭 `ImageProxy`。

预览镜像与推理方向分别处理。[图像输入与坐标](../guides/image-inputs.md)说明原始帧到显示的变换；示例中的 `UprightFaceCameraAnalyzer` 和帧辅助类展示了摄像头相关实现。

::: warning 当前帧处理完再复用缓冲区
将 `track → pipeline / feature extraction → release stream` 放在同一个工作线程中，向 UI 线程只传递复制后的框与分数。关闭摄像头时先停止接收新帧，等待工作线程完成已有任务，再释放会话。
:::

<div class="doc-flow" aria-label="Android 摄像头帧处理流程">
  <div><strong>1 · CameraX</strong><span>取得 ImageProxy，读取各平面的步长。</span></div>
  <div><strong>2 · 准备字节</strong><span>打包为选定格式，按约定处理方向。</span></div>
  <div><strong>3 · 分析</strong><span>跟踪后，对同一帧提取特征或运行 Pipeline。</span></div>
  <div><strong>4 · 释放</strong><span>释放图像流、关闭 ImageProxy，再传递已复制的结果。</span></div>
</div>

示例先将 NV21 旋转为正向图像，再以 `CAMERA_ROTATION_0` 创建图像流。改用 SDK 旋转时，提交原始帧及对应旋转标志，并对预览使用匹配的显示变换。

## 可选分析 {#optional-analysis}

通过 `CustomParameter` 配置所需功能，并传给会话创建方法。读取分析结果时，先调用带所需参数的 `MultipleFacePipelineProcess`，检查布尔返回值，再读取 `GetFaceQualityConfidence` 等 getter。

| CustomParameter | 用途 |
| --- | --- |
| `enableRecognition(true)` | 提取特征并进行人脸比对。 |
| `enableFaceQuality(true)` | 质量分数。 |
| `enableFacePose(true)` | `MultipleFaceData.angles` 中的头部姿态；检查 yaw/pitch/roll 时开启。 |
| `enableLiveness(true)` | RGB 活体分数。 |
| `enableInteractionLiveness(true)` | 眼睛状态与时序动作信号。 |
| `enableMaskDetect(true)` | 口罩分数。 |
| `enableFaceAttribute(true)` | 属性分类结果。 |
| `enableFaceEmotion(true)` | 表情类别，需要所加载的模型包包含该模型。 |

三种检测模式都可以从检测 token 中取得稠密关键点。`GetFaceDenseLandmarkFromFaceToken` 读取稠密点，`GetFaceFiveKeyPointsFromFaceToken` 读取用于对齐的五点。无需额外 JNI 桥接层，也无需开启 `enableDetectModeLandmark`。

只开启当前页面需要的功能，并确认所选模型包包含对应模型。[识别](../guides/recognition.md)、[关键点](../guides/dense-landmark.md)、[活体检测](../guides/liveness-detection.md)和[可选分析](../guides/optional-analysis.md)指南中都可以切换到 Android 示例。

## 人脸抓拍 {#capture-in-the-current-source}

AAR 已包含 `FaceCapture` 和 `FaceDetectionSnapshot`，两者均实现 `AutoCloseable`。通过 `FaceCapture.create(session, FaceCapture.defaultConfig())` 创建一次抓拍策略，再用 `update(stream, frameId, timestampMs)` 持续提交帧，帧编号和时间戳应递增。默认的跟踪次数过滤需要使用跟踪会话。

同一次检测需要同时用于显示和抓拍时，可以创建 `FaceDetectionSnapshot`，再传给 `capture.update(stream, snapshot, frameId, timestampMs)`。创建快照时已经执行了跟踪，不要对同一帧重复跟踪。`snapshot.getFaces()` 返回复制后的 Java 结果，包含 token 和跟踪次数。

::: warning 快照复制会增加延时
快照更容易管理结果的生命周期，但复制会增加开销。单路顺序处理的相机流可以通过 `Native` 直接读取 handle 内的结果，省去快照复制；需要在所属对象的下一次操作之前用完。复制后的结果更方便在不同处理步骤间复用。Android 便捷接口本身也会把结果复制成 Java 数组。
:::

抓拍结果包含 token 和元数据，不含图像像素。需要裁剪或提取识别特征时，保留对应的原始帧。先关闭抓拍和快照，再释放它们的来源会话。完整代码、过滤条件和帧保存方式见[人脸抓拍](../guides/face-capture.md)。

## 完整 Java API 与诊断 {#full-java-api-and-diagnostics}

处理 `Bitmap`、`byte[]`、普通会话和复制后的结果时，可以使用 Android 便捷接口。需要直接对应 C API 的调用时，同一 AAR 也提供 `jni.Native`、`jni.NativeTypes` 结构和 `jni.NativeConstants` 常量。[Java 指南](./java.md)及各功能页 Java tab 中的可移植接口，也能在 Android 上使用。

两套接口都加载同一份 `libInspireFace.so`。图像流应由创建它的接口释放：Android 位图和字节数组方法创建的流用 `InspireFace.ReleaseImageStream`，可移植接口创建的流用 `Native.HFReleaseImageStream`。两者管理输入缓冲区的方式不同，不要混用释放方法。

`Native` 保留 C 状态码，可以用 `InspireFaceException.check(status)` 将失败转换为异常。原有 Android 方法通常保留 boolean/null 返回约定。新增查询和控制方法使用 `InspireFaceException`；`CreateSessionV2`、五点解码和 ID 枚举在失败时返回 null。

<details>
<summary>记录原生版本和诊断信息</summary>

```java
import android.util.Log;
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.InspireFaceVersion;

public static void logSdkVersion() {
    InspireFaceVersion version = InspireFace.QueryInspireFaceVersion();
    Log.i("InspireFace", "Native " + version.major + "."
            + version.minor + "." + version.patch);
    Log.i("InspireFace", "C API " + InspireFace.QueryCAPILevel());
    Log.i("InspireFace", InspireFace.QueryInspireFaceDiagnosticInformation());
}
```

</details>

Android 依赖版本为 **1.2.4.post1**，原生版本返回 **1.2.4**，C API level 为 **2**。反馈接入问题时附上这些信息，便于定位实际加载的版本。

## 构建原生库 {#build-the-native-library}

需要修改原生 SDK 时，[准备源码与第三方依赖](../build/source.md)后，安装 JDK、Python 3 和 Android NDK，在 SDK 目录中执行：

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
bash command/build_android.sh
```

脚本为 `arm64-v8a`、`armeabi-v7a` 和 `x86_64` 构建 native API 21 库，使用静态 C++ 运行库。Android AAR 的 minimum SDK 仍为 24。头文件位于 `build/inspireface-android/include`，`lib/<abi>` 下每个 ABI 一份合并后的库，`java/` 包含可移植接口的 `inspireface.jar`、源码、manifest 和 consumer rules。完整产物与应用打包方式见 [Android 构建指南](../build/android.md)。
