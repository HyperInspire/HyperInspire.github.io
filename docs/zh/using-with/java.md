# Java {#java}

通过 `inspireface.jar` 和对应平台的动态库，可以在桌面或服务端 JVM 中使用 InspireFace。JAR 兼容 Java 8，通过 JNI 提供 C API 对应的接口，不依赖 Android 类，也不需要自己编写 JNI。Android 1.2.4.post1 也包含相同的 `com.insightface.sdk.inspireface.jni` 接口；AAR 与单库打包方式见 [Android 接入指南](./android.md)。

## 添加 SDK {#add-the-sdk}

按照 [Java 构建指南](../build/java.md) 生成 SDK，输出目录为 `build/java-sdk/install/Java`。将 `inspireface.jar` 加入应用的 classpath，并保留配套的动态库。模型文件需要单独准备，见[模型与构建](../guides/models-and-builds.md#pick-a-resource-pack)。

macOS arm64 的包结构如下：

```text
Java/
  inspireface.jar
  native/macos-arm64/
    libInspireFaceJNI.dylib
    libInspireFace.dylib
  sources/
  api-manifest.json
  examples/DetectFaces.java
```

不同平台共用同一套 JAR，动态库则必须匹配**正在运行的 JVM** 的系统和架构。即使电脑是 Apple Silicon，通过 Rosetta 运行的 x86_64 JVM 也需要 x86_64 动态库。JAR、JNI 库和核心 SDK 应来自同一次构建。

| Target | Native directory | JNI library | Core shared library |
| --- | --- | --- | --- |
| macOS arm64 | `native/macos-arm64` | `libInspireFaceJNI.dylib` | `libInspireFace.dylib` |
| macOS x86_64 | `native/macos-x86_64` | `libInspireFaceJNI.dylib` | `libInspireFace.dylib` |
| Linux x86_64 | `native/linux-x86_64` | `libInspireFaceJNI.so` | `libInspireFace.so` |
| Linux arm64 | `native/linux-arm64` | `libInspireFaceJNI.so` | `libInspireFace.so` |
| Windows x86_64 | `native/windows-x86_64` | `InspireFaceJNI.dll` | `InspireFace.dll` |

表格列出对应原生构建的加载名称与目录，不代表这些平台都已提供预编译下载。[Java 打包](../build/java.md)提供 Linux 和 macOS 的构建方法；Windows 需要准备兼容的原生库及其运行时依赖。使用静态核心库构建时，目录中可能只有 JNI 动态库。

Gradle 项目可以将 JAR 放到 `libs/`，然后在 `build.gradle` 中添加：

```groovy
dependencies {
    implementation files("libs/inspireface.jar")
}
```

动态库仍保存在外部文件中。应为实际运行应用的 JVM 设置加载路径，服务进程或应用服务器也一样。

## 运行第一张图片 {#run-the-first-image}

将下面的完整程序保存为 Java SDK 目录下的 `examples/DetectFaces.java`。进入该目录，在 macOS arm64 上编译并运行：

```bash
javac -cp inspireface.jar examples/DetectFaces.java
java -Djava.library.path=native/macos-arm64 -cp inspireface.jar:examples \
  DetectFaces /absolute/path/to/Pikachu /absolute/path/to/face.jpg
```

Linux 将 `native/macos-arm64` 改为对应的 `native/linux-*` 目录，classpath 仍使用 `:` 分隔。Windows 使用 `;`，还需将动态库目录加入 `PATH`，供系统查找依赖 DLL。准备好兼容的 Windows 包后：

```powershell
javac -cp inspireface.jar examples/DetectFaces.java
java "-Djava.library.path=native/windows-x86_64" -cp "inspireface.jar;examples" DetectFaces C:\models\Pikachu C:\images\face.jpg
```

程序通过 SDK 读取图片，不需要安装 OpenCV。处理成功但没有检测到人脸时，会输出 `Detected 0 face(s)`。

<details>
<summary>java/DetectFaces.java — 完整代码</summary>

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;

/**
 * Non-Android JVM example. Run from the installed Java SDK directory:
 * javac -cp inspireface.jar examples/DetectFaces.java
 * java -Djava.library.path=native/macos-arm64 -cp inspireface.jar:examples DetectFaces /path/Pikachu /path/face.jpg
 * Select the native directory matching the JVM OS/architecture; Windows uses ; in the classpath.
 */
public final class DetectFaces {
    public static void main(String[] args) {
        if (args.length != 2) throw new IllegalArgumentException("Usage: DetectFaces MODEL_FILE IMAGE_FILE");
        check(HFLaunchInspireFace(args[0]));
        long[] session = new long[1], bitmap = new long[1], stream = new long[1];
        try {
            check(HFCreateInspireFaceSessionOptional(HF_ENABLE_NONE, HF_DETECT_MODE_ALWAYS_DETECT, 10, -1, -1, session));
            check(HFCreateImageBitmapFromFilePath(args[1], 3, bitmap));
            HFImageBitmapData pixels = new HFImageBitmapData();
            check(HFImageBitmapGetData(bitmap[0], pixels));
            HFImageData input = new HFImageData();
            input.data = pixels.data; input.width = pixels.width; input.height = pixels.height;
            input.format = HF_STREAM_BGR; input.rotation = HF_CAMERA_ROTATION_0;
            check(HFCreateImageStream(input, stream)); // Borrows pixels; keep bitmap alive.
            HFMultipleFaceData faces = new HFMultipleFaceData();
            check(HFExecuteFaceTrack(session[0], stream[0], faces));
            System.out.println("Detected " + faces.detectedNum + " face(s)");
            for (HFaceRect rect : faces.rects) {
                System.out.printf("x=%d y=%d width=%d height=%d%n", rect.x, rect.y, rect.width, rect.height);
            }
        } finally {
            if (stream[0] != 0) HFReleaseImageStream(stream[0]);
            if (bitmap[0] != 0) HFReleaseImageBitmap(bitmap[0]);
            if (session[0] != 0) HFReleaseInspireFaceSession(session[0]);
            HFTerminateInspireFace();
        }
    }
}
```

</details>

`HFLaunchInspireFace` 接收模型文件路径，不是模型所在目录。以三个通道读取图片时，得到的是 BGR 像素。示例在 stream 借用像素期间保留 bitmap，并先释放 stream，再释放 bitmap。

处理摄像头或一批图片时，启动一次模型并复用 session。当前帧的跟踪和分析完成后，再让同一个 session 处理下一帧。

### 指定动态库文件 {#select-a-native-library-explicitly}

`java.library.path` 接收目录，也可以用 `inspireface.native.path` 指定 **JNI 动态库文件的绝对路径**：

```bash
java -Dinspireface.native.path=/absolute/path/to/libInspireFaceJNI.so \
  -cp inspireface.jar:examples DetectFaces /absolute/path/to/Pikachu /absolute/path/to/face.jpg
```

其他系统改为对应的 `.dylib` 或 `.dll` 文件。这个属性选择的是 `InspireFaceJNI`，不是核心 `InspireFace` 库；依赖的动态库仍需能被系统找到。在第一次调用 SDK 前设置属性，替换库文件后重启 JVM。初始化时，绑定层会检查 JAR 与 JNI 库的 API 布局是否匹配。

## API 名称与输出参数 {#api-names-and-output-parameters}

Java 绑定保留 C 函数名。各功能文章中的示例使用以下 import：

```java
import com.insightface.sdk.inspireface.jni.NativeTypes.*;
import static com.insightface.sdk.inspireface.jni.Native.*;
import static com.insightface.sdk.inspireface.jni.NativeConstants.*;
import static com.insightface.sdk.inspireface.jni.InspireFaceException.check;
```

| C API concept | Java representation |
| --- | --- |
| Functions | `Native` 中的静态方法。 |
| Structs | `NativeTypes` 中的嵌套类。 |
| Options, enums and error constants | `NativeConstants`。 |
| Resource handle | `long`；创建函数将句柄写入 `long[1]`。 |
| Scalar output | 根据方法签名，使用 `int[1]`、`long[1]` 或 `float[1]`。 |
| Native pixel, token or numeric buffer | Direct `ByteBuffer`。 |
| `HResult` / `HFStatus` | `long` / `int`；`HSUCCEED` 表示成功。 |

调用前创建输出数组，成功后读取第零个元素。`new HFMultipleFaceData()` 这类 Java 描述对象本身不会创建原生 session 或 snapshot。原生无符号整数在 Java 的 `int`、`long` 中保留相同的位表示。

使用版本化 session 配置时，`HFSessionConfigV2` 会按已加载的动态库初始化 `structSize` 和 `structVersion`。设置需要的选项，保留字段沿用默认值：

```java
HFSessionConfigV2 config = new HFSessionConfigV2();
config.featureMask = HF_ENABLE_FACE_RECOGNITION | HF_ENABLE_QUALITY;
config.detectMode = HF_DETECT_MODE_ALWAYS_DETECT;
config.maxDetectFaceNum = 10;
config.detectPixelLevel = -1;
config.trackByDetectModeFPS = -1;
long[] session = new long[1];
check(HFCreateInspireFaceSessionV2(config, session));
try {
    // Track images and extract features with session[0].
} finally {
    HFReleaseInspireFaceSession(session[0]);
}
```

只做人脸检测与跟踪时使用 `HF_ENABLE_NONE`，其他选项按模型包包含的功能启用。`-1` 使用模型包默认的检测档位。Mode 与延时的选择见[会话与跟踪](../guides/tracking.md)。

## CPU 运行策略 {#cpu-power-mode}

当前 SDK 的 CPU 推理默认使用 `NORMAL`。JVM 和 Android 的 Java 接口都可以通过 `CPUEngine` 设置进程级策略。在应用启动时、创建会话前调用：

```java
import com.insightface.sdk.inspireface.jni.CPUEngine;

// Run during startup, before creating sessions.
CPUEngine.setGlobalPowerMode(CPUEngine.PowerMode.NORMAL);
CPUEngine.PowerMode selected = CPUEngine.getGlobalPowerMode();
System.out.println("CPU policy: " + selected);
```

可选值为 `NORMAL`、`HIGH` 和 `LOW`。配置由随后初始化的 CPU 运行时读取，已创建的运行时保持原配置；模型线程数和数值精度也不变。`launch`、`reload` 和 `terminate` 会保留这项设置，不要与会话或模型初始化并发修改。比较耗时、空闲 CPU 占用与温度后再选择其他模式，见 [CPU 运行策略](./arm.md#cpu-power-mode)。

## Direct 图像缓冲区 {#direct-image-buffers}

传入可写的 direct `ByteBuffer`，并确保剩余字节足够。JNI 按 `position()` 和 `limit()` 读取，不会自动将位置重置为零。读写 float 等多字节数值时使用 native byte order。普通 heap buffer、只读 buffer、长度不足的 buffer，以及未对齐的数值切片都会被拒绝。

下面的方法接收紧密排列的 BGR 字节和已经创建的 session：

<details>
<summary>处理 BGR 字节数组</summary>

```java
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

// Add this method to a class with the SDK imports shown above.
static void detectBgr(long session, byte[] bgr, int width, int height) {
    if (width <= 0 || height <= 0) {
        throw new IllegalArgumentException("Image dimensions must be positive");
    }
    int bytes = Math.multiplyExact(Math.multiplyExact(width, height), 3);
    if (bgr.length != bytes) {
        throw new IllegalArgumentException("Expected tightly packed BGR pixels");
    }
    ByteBuffer pixels = ByteBuffer.allocateDirect(bytes).order(ByteOrder.nativeOrder());
    pixels.put(bgr);
    pixels.flip();
    HFImageData input = new HFImageData();
    input.data = pixels;
    input.width = width;
    input.height = height;
    input.format = HF_STREAM_BGR;
    input.rotation = HF_CAMERA_ROTATION_0;
    long[] stream = new long[1];
    check(HFCreateImageStream(input, stream));
    try {
        HFMultipleFaceData faces = new HFMultipleFaceData();
        check(HFExecuteFaceTrack(session, stream[0], faces));
        for (int i = 0; i < faces.detectedNum; i++) {
            HFaceRect rect = faces.rects[i];
            float confidence = faces.detConfidence.getFloat(i * Float.BYTES);
            System.out.printf("face %d: x=%d y=%d confidence=%.3f%n",
                              i, rect.x, rect.y, confidence);
        }
    } finally {
        HFReleaseImageStream(stream[0]);
    }
}
```

</details>

这个方法会将 Java 字节数组复制到 direct buffer。如果图像来源本来就写入兼容的 direct buffer，可以直接传入。连续处理时，可通过 `HFImageStreamSetBuffer` 复用 stream 句柄；完成当前帧处理后，再替换缓冲区或写入下一帧。输入格式、旋转与行排列要求见[图像输入](../guides/image-inputs.md)。

JNI 会保留 Java 输入 buffer 的强引用，直到 stream 释放或成功替换缓冲区。这个引用不会延长独立原生 bitmap 的生命周期：如果 `input.data` 来自 `HFImageBitmapGetData`，也必须保留 bitmap 句柄。

## 结果与资源生命周期 {#results-and-resource-lifetimes}

Java GC 不会释放 SDK 句柄。用 `try/finally` 管理资源，每个成功创建的句柄在最后一次使用后释放一次。同一个 session 的跟踪、特征提取、分析和释放放在同一串行任务中；全局 runtime 和 FeatureHub 的状态修改也需要串行处理。

| Resource or result | Lifetime |
| --- | --- |
| Stream created with borrowed pixels | 先释放 stream，再释放或复用像素的所有者。 |
| Current face tokens and result buffers | 在 session 下一次跟踪、重置或关闭前使用。 |
| Feature returned by `HFFaceFeatureExtract` | 借用 session 内的内存，在下一次提取或 session 关闭前使用。 |
| Pipeline result buffers | 在对应缓存更新或 session 关闭前使用。 |
| Snapshot results | 使用结束前保留 snapshot，包括从中取得的借用视图。 |
| FeatureHub result buffers | 在后续操作替换结果或关闭 FeatureHub 前，复制需要的数据。 |

矩形对象和已复制的标量字段属于 Java 值，但描述对象中的 `ByteBuffer` 仍可能指向原生内存，例如 token 字节、置信度和特征向量。保留 Java 对象或复制 buffer 视图不会延长这些原生内存的有效期。将结果交给其他任务时，先复制到应用自己管理的存储中。

::: warning Snapshot 的开销
Snapshot 方便跨帧保存结果，但拷贝会增加延时。单路顺序处理时，可在下一帧开始前直接使用 session 中的借用结果；需要跨越这个处理时段保留数据时再使用 snapshot，并通过 `HFReleaseFaceResultSnapshot` 释放。
:::

`HFFaceFeature` 的 `AutoCloseable` 只用于 `HFCreateFaceFeature` 分配的存储。session 已启用识别且当前帧有人脸时，可以这样使用独立特征缓冲区：

```java
HFFaceFeature feature = new HFFaceFeature();
check(HFCreateFaceFeature(feature));
try (HFFaceFeature ownedFeature = feature) {
    check(HFFaceFeatureExtractTo(session, stream, faces.tokens[0], ownedFeature));
    float firstValue = ownedFeature.data.getFloat(0);
    System.out.println(firstValue);
}
```

这里的 `session`、`stream` 是句柄，且 `faces.detectedNum` 必须大于零。对于 `HFFaceFeatureExtract` 或 FeatureHub 返回的借用特征，不要调用 `close()` 或 `HFReleaseFaceFeature`。其他句柄使用对应的 release 函数，并不是 `AutoCloseable` 对象。

先释放 capture session，再释放其父 session；所有 stream、bitmap 和 session 都释放后，再终止 runtime。在同一个 `finally` 中，不要让一次释放失败抛出的异常阻断后续清理或覆盖原始错误。清理失败的记录方式由应用统一处理。

## 错误与诊断 {#errors-and-diagnostics}

原生方法保留 SDK 状态码。可以直接判断返回值，也可以通过 `InspireFaceException.check(status)` 抛出包含错误码与错误信息的异常：

```java
import com.insightface.sdk.inspireface.jni.InspireFaceException;

try {
    check(HFLaunchInspireFace(modelPath));
} catch (InspireFaceException error) {
    System.err.println("SDK status=" + error.getCode() + ": " + error.getMessage());
    throw error;
}
```

JNI 参数校验也可能直接抛出 `IllegalArgumentException`，不经过状态码判断。库加载失败或 JAR/JNI API 不匹配时，会抛出 `UnsatisfiedLinkError`。

| Symptom | Check |
| --- | --- |
| `no InspireFaceJNI in java.library.path` | 检查 `-Djava.library.path` 指向的目录与库文件名。 |
| Dependent library cannot be loaded | 将配套核心库放在 JNI 库旁，并安装后端运行时依赖。 |
| Wrong architecture / incompatible binary | 检查 JVM 架构、动态库架构与最低系统版本。 |
| Java/JNI ABI mismatch | 同时替换 JAR 与动态库，重启 JVM。 |
| Expected writable direct `ByteBuffer` | 检查 direct 分配、可写状态、剩余长度与对齐。 |
| Stale or invalid results after another frame | 检查结果归属和释放顺序，不要在更新后继续访问借用视图。 |

## 按功能继续阅读 {#continue-with-a-feature}

在[跟踪](../guides/tracking.md)、[识别与 FeatureHub](../guides/recognition.md)、[关键点](../guides/dense-landmark.md)、[活体检测](../guides/liveness-detection.md)、[可选分析](../guides/optional-analysis.md)、[人脸抓拍](../guides/face-capture.md)和 [API 使用](../guides/api-recipes.md)中选择 **Java** 标签即可查看对应写法。[API 功能索引](../guides/api-coverage.md)列出各项功能的入口。
