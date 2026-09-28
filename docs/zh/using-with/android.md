# Android {#android}

Android 应用可以使用 Java 封装，也可以通过自己的 JNI 层调用 C API。建议先用位图确认 SDK 与模型配置，再接入摄像头。

[Android 构建章节](../build/android.md)介绍 NDK 配置、单个 ABI 编译、产物目录及 Java / JNI 库的打包。

[Android 示例项目](https://github.com/HyperInspire/InspireFace/tree/master/android/InspireFaceExample)包含 CameraX 接入、图像分析和录入检索流程，也可以先[安装演示应用](../introduction.md#try-the-android-example-app)体验交互。

## 选择安装包或源码构建 {#choose-a-package-or-source-build}

Android 示例使用 `1.2.0` Java SDK 依赖。升级时，将 Java 类、JNI 实现与原生库一同更新。

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
    implementation 'com.github.HyperInspire:inspireface-android-sdk:1.2.0'
}
```

此包提供 `arm64-v8a` 和 `armeabi-v7a` 原生库。示例应用使用 compile SDK 35、minimum SDK 24，以及 Java 8 源码兼容设置。

### 运行示例项目 {#run-the-example-project}

用 Android Studio 打开 `android/InspireFaceExample`。当前项目使用 JDK 17 运行 Gradle、Android SDK 35，以及 NDK `28.1.13356709` 编译 JNI 兼容桥接。Java 源码级别为 8，它和构建工具使用的 JDK 版本是两项设置。

连接 ARM 设备并开启 USB 调试后，从 InspireFace 仓库根目录执行：

```bash
cd android/InspireFaceExample
./gradlew :app:assembleDebug
./gradlew :app:installDebug
```

Android Studio 会将 SDK 路径写入 `local.properties`；命令行构建可使用 `ANDROID_HOME`。Debug APK 位于 `app/build/outputs/apk/debug/`。安装后先打开照片功能确认模型加载，再进入摄像头功能并授予相机权限。

::: tip 接入应用
示例中的 `FaceEngine` 负责 SDK 启动与会话配置，`UprightFaceCameraAnalyzer` 负责逐帧图像流。接入自己的应用时，可以复用这两个类。
:::

| File or directory | 用途 |
| --- | --- |
| `app/src/main/assets/inspireface/` | 存放模型资源，启动前复制到应用私有文件目录。 |
| `app/src/main/cpp/` | 示例的 JNI 兼容桥接与 NDK 构建文件。 |
| `cpp/inspireface/platform/jni/java/` | 示例通过 source set 引入的补充 Java 封装。 |
| `app/src/main/AndroidManifest.xml` | 声明相机权限，运行时授权由应用处理。 |

使用此 AAR 时连接 ARM 设备。需要在 x86 模拟器或其他架构上运行时，构建并打包该目标对应的原生库和 JNI 层。

## 添加模型并初始化 {#add-the-model-and-initialize}

将 `Pikachu` 资源**文件**放到 `app/src/main/assets/inspireface/Pikachu`，下载方式见[模型包说明](../guides/models-and-builds.md)。基于 Context 的启动方法会将 assets 复制到应用文件区域，首次启动放在工作线程执行。

```java
import com.insightface.sdk.inspireface.InspireFace;
import com.insightface.sdk.inspireface.base.CustomParameter;
import com.insightface.sdk.inspireface.base.Session;

// context is an Android Context. Run once for the application's SDK lifetime.
boolean launched = Boolean.TRUE.equals(InspireFace.GlobalLaunch(
        context.getApplicationContext(), InspireFace.PIKACHU));
if (!launched) throw new IllegalStateException("Cannot load the model pack");

CustomParameter options = InspireFace.CreateCustomParameter();
Session session = InspireFace.CreateSession(
        options, InspireFace.DETECT_MODE_ALWAYS_DETECT, 10, 320, -1);
if (session == null || session.handle == 0L) {
    throw new IllegalStateException("Cannot create the face session");
}
```

更新随应用打包的模型时，也更新应用文件目录中此前复制的版本。自行管理模型文件时，将本地路径传给 `GlobalLaunch(String resourcePath)`。

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
            // Read faces.rects[i] or run feature extraction with faces.tokens[i].
        }
        return faces.detectedNum;
    } finally {
        InspireFace.ReleaseImageStream(stream);
    }
}
```

数量为零是有效结果，返回 null 则表示处理失败，两者应分别处理。释放图像流或开始下一次跟踪前，使用同一图像完成特征提取与分析调用。

会话所属工作线程结束后，调用 `InspireFace.ReleaseSession(session)`。只有所有应用会话均已释放，才能调用 `InspireFace.GlobalTerminate()`。Kotlin 可调用同一套 Java API，也应通过 `try/finally` 管理原生句柄。

## 处理摄像头帧 {#process-camera-frames}

为摄像头序列创建一个 `DETECT_MODE_LIGHT_TRACK` 会话并持续复用，使用单一分析执行器保证帧顺序。处理速度低于采集速度时，丢弃过期帧，避免队列无限增长。

`CreateImageStreamFromByteBuffer` 接收 `byte[]` 像素、宽、高、像素格式和旋转参数。创建图像流前，先将相机输出整理成对应格式。

将 CameraX 的 `YUV_420_888` 平面转换成紧密排列的 NV21 时，分别处理行步长和像素步长。保持转换后的字节有效，直到该帧处理结束，并在 `finally` 中关闭 `ImageProxy`。

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

通过 `CustomParameter` 配置所需功能，例如 `.enableRecognition(true)`、`.enableFaceQuality(true)` 或 `.enableLiveness(true)`，并传给会话创建方法。读取分析结果时，先调用带所需参数的 `MultipleFacePipelineProcess`，检查布尔返回值，再读取 `GetFaceQualityConfidence` 等 getter。

使用 1.2.0 Java 包读取稠密关键点时，参考 [FaceEngine](https://github.com/HyperInspire/InspireFace/blob/master/android/InspireFaceExample/app/src/main/java/com/example/inspireface_example/view/FaceEngine.java) 中的会话创建流程，其中包含示例所用的 JNI 配置。可用的 Java 选项列在下表中。

| CustomParameter | 用途 |
| --- | --- |
| `enableRecognition(true)` | 提取特征并进行人脸比对。 |
| `enableFaceQuality(true)` | 质量评估；旧版 Java 演示中依赖姿态的流程也使用此选项。 |
| `enableLiveness(true)` | RGB 活体分数。 |
| `enableInteractionLiveness(true)` | 眼睛状态与时序动作信号。 |
| `enableMaskDetect(true)` | 口罩分数。 |
| `enableFaceAttribute(true)` | 属性分类结果。 |

只开启当前页面需要的选项。识别使用所选人脸的 token 提取特征；质量、活体等结果则需要在检测后再调用 pipeline。[识别](../guides/recognition.md)、[关键点](../guides/dense-landmark.md)和[活体检测](../guides/liveness-detection.md)指南中可以切换到 Android 示例。

[可选分析指南](../guides/optional-analysis.md)提供模型配置与 Pipeline 结果读取的 Java 示例。

## 构建原生库 {#build-the-native-library}

[准备源码与第三方依赖](../build/source.md)后，在 InspireFace 仓库根目录运行：

```bash
export ANDROID_NDK=/absolute/path/to/android-ndk
bash command/build_android.sh
```

当前脚本为 `arm64-v8a`、`armeabi-v7a` 和 `x86_64` 构建 native API 21 库，使用静态 C++ 运行库。头文件汇总到 `build/inspireface-android/include`，库位于 `build/inspireface-android/lib/<abi>`。可选的 `VERSION` 环境变量会给输出目录添加后缀。

将这些原生库打包到 AAR 或应用时，一并使用配套的 Java/JNI 封装，每种 ABI 保留一份库。打包前清理其他依赖中的重复副本。

## 人脸抓拍 {#capture-in-the-current-source}

`FaceCapture` 和 `FaceDetectionSnapshot` 位于 `cpp/inspireface/platform/jni/java`。使用这两个类时，搭配包含抓拍与快照 JNI 方法的原生构建。

通过 `FaceCapture.create(session, FaceCapture.defaultConfig())` 创建策略，用 `update(stream, frameId, timestampMs)` 连续提交帧，通过 `getResults()` 读取候选，并在释放父会话前关闭抓拍对象。抓拍和快照均实现 `AutoCloseable`。候选图像保存与时间要求见[人脸抓拍](../guides/face-capture.md)。
