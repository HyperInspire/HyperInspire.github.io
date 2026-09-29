# HarmonyOS {#harmonyos}

ArkTS API 通过 HAR 模块提供会话、图像流、检测、关键点、特征、分析流水线和 FeatureHub。**1.2.4 Release** 已提供可直接导入的 HAR 工程，包含编译好的原生库，包内也有独立的 C/C++ SDK。

[HarmonyOS 构建章节](../build/harmonyos.md)介绍工具链配置、原生 SDK、HAR 工程生成与打包检查。

## 获取模块 {#build-the-module}

下载并解压 [HarmonyOS 1.2.4 包](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-harmonyos-arm64-v8a-1.2.4.zip)。ArkTS 模块位于：

```text
inspireface-harmonyos-arm64-v8a-1.2.4/HarmonyOS/har
```

在 DevEco Studio 中将该目录导入为模块，或通过项目的 Hvigor 流程打包。这里提供的是 HAR 工程目录，还不是打包后的 `.har` 文件。编译好的原生库已位于 `src/main/libs/arm64-v8a/libinspireface_napi.so`，类型声明位于 `src/main/cpp/types/libinspireface_napi`。

发布包面向 **arm64-v8a**，使用 CPU 推理和原始像素缓冲输入。[模型包](../guides/models-and-builds.md)需要单独下载。先在目标设备上确认模型加载和单帧处理，再连接摄像头。

需要重新编译时，准备 [InspireFace 源码依赖](../build/source.md)，安装 OpenHarmony Native SDK，然后从仓库根目录运行：

```bash
OHOS_NATIVE_HOME=/path/to/native-sdk/native \
  ./command/build_harmonyos_napi.sh
```

源码构建会将相同结构的 HAR 工程输出到：

```text
build/inspireface-harmonyos-napi-arm64-v8a/install/HarmonyOS/har
```

### 接入应用工程 {#add-the-module-to-an-application}

1. 将 Release 包中的 `HarmonyOS/har`，或源码构建安装后的 `har` 目录复制到工程，作为 `inspireface` 模块。两种方式都包含编译好的 `.so` 和 ArkTS 源码。
2. 在应用工程中注册该模块，并从 entry 模块添加本地依赖。假设目录为 `project/entry` 和 `project/inspireface`，entry 的 `oh-package.json5` 可以加入：

```json
{
  "dependencies": {
    "@hyperinspire/inspireface": "file:../inspireface"
  }
}
```

3. 在 DevEco Studio 中同步依赖，一并打包 `Index.ets`、原生类型声明和 `src/main/libs/arm64-v8a/libinspireface_napi.so`。
4. 将模型放到应用可读取的文件位置。如果随 raw resource 打包，先复制到应用文件目录，再将文件系统路径传给 `launch`。

::: tip 先确认打包，再连接摄像头
首次调用使用一张已知内容的小尺寸 RGBA 图像。在 arm64 目标上确认输入为 `width × height × 4` 字节、模型路径可读、原生库已打包，然后再处理摄像头的实际格式与步长。
:::

## 检测 RGBA 帧 {#detect-an-rgba-frame}

将模型包复制到应用可访问的文件，向 `launch` 传入路径。下面的函数从调用方接收紧密排列的 RGBA 字节：

```ts
import { DetectMode, Feature, ImageFormat, InspireFace, Rotation, Session }
  from '@hyperinspire/inspireface';

export function detectCount(resourcePath: string, rgba: Uint8Array,
                            width: number, height: number): number {
  InspireFace.launch(resourcePath);
  let session: Session | undefined = undefined;
  try {
    session = InspireFace.createSession({
      featureMask: Feature.NONE,
      detectMode: DetectMode.ALWAYS_DETECT,
      maxFaces: 5
    });
    const image = InspireFace.createImageStream(
      rgba, width, height, ImageFormat.RGBA, Rotation.DEGREE_0);
    try {
      const faces = session.track(image);
      try {
        return faces.detectedNum;
      } finally {
        session.releaseFaceResult(faces);
      }
    } finally {
      image.close();
    }
  } finally {
    if (session !== undefined) session.close();
    InspireFace.terminate();
  }
}
```

处理视频时，在帧循环外完成启动与会话创建。使用跟踪模式，每个会话处理一个序列，并在对应分析或特征提取结束后释放每份结果。

## 内存归属与工作线程 {#ownership-and-workers}

| Object | 生命周期与释放方式 |
| --- | --- |
| `ImageStream` | 创建时复制输入字节，处理后关闭。 |
| `ImageBitmap` | 持有位图存储，使用结束后调用 `close()`。 |
| `Session.track()` result | 返回独立的检测快照，通过 `session.releaseFaceResult(result)` 释放。 |
| `Session` | 保存推理与跟踪状态，处理结束后调用 `close()` 释放。 |

这些方法同步执行，放在工作线程中运行，每个 worker 管理自己的会话和原生句柄。保存检测快照后还要提取特征或执行分析时，一同保留对应帧的像素。

## 分析与特征库 {#analysis-and-a-gallery}

创建会话时使用功能掩码，例如 `Feature.QUALITY | Feature.LIVENESS`，随后将同一帧的结果传给 `session.processPipeline(image, faces)`。访问输出数组前检查人脸数量。

FeatureHub 使用 `bigint` ID 对应原生有符号 64 位整数。应用中也使用 `bigint` 保存与传递 ID，例如 `1001n`。

## 按功能查看示例 {#feature-examples}

在以下页面选择 **HarmonyOS** 标签。示例使用 `@hyperinspire/inspireface` 导出的 ArkTS 对象。

| Task | ArkTS entry points | Guide |
| --- | --- | --- |
| 跟踪与会话设置 | `Session.track`, `configure`, `clearTracking` | [会话与跟踪](../guides/tracking.md) |
| 密集与五点关键点 | `getDenseLandmarks`, `getFiveKeyPoints` | [人脸关键点](../guides/dense-landmark.md) |
| 质量、口罩、属性与表情 | `Session.processPipeline`, `detectFaceQuality` | [人脸分析](../guides/optional-analysis.md) |
| RGB 活体与动作 | `Session.processPipeline` | [活体检测](../guides/liveness-detection.md) |
| 特征与特征库 | `Session.extractFeature`, `compareFeatures`, `FeatureHub` | [识别与特征库](../guides/recognition.md) |
| 抓拍与检测快照 | `FaceCaptureSession`, `Session.releaseFaceResult` | [人脸抓拍](../guides/face-capture.md) |
| 对齐图、分数与诊断 | `getFaceAlignmentImage`, `similarityToPercentage`, `getDiagnosticInformation` | [补充 API 示例](../guides/api-recipes.md) |

完整类型见 [ArkTS 接口声明](https://github.com/HyperInspire/InspireFace/blob/master/harmony/inspireface/src/main/ets/InspireFace.ets)。输入格式和旋转规则见[图像输入](../guides/image-inputs.md)，运行环境与工作线程的生命周期见[会话架构](../guides/arch.md)。
