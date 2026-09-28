# iOS {#ios}

InspireFace 的 C API 可以直接从 Objective-C、Objective-C++ 调用，也可通过简单的桥接供 Swift 使用。先在真机上用文件或位图跑通模型加载和检测，再连接摄像头帧。

Framework 的完整构建流程、依赖版本和库文件检查见 [iOS 构建](../build/ios.md)。

::: warning iOS 接口
目前在 iOS 上接入需要混合调用 C/C++ 接口。后续会推出 Objective-C 和 Swift 接口。
:::

## 构建 Framework {#build-the-frameworks}

按[源码准备与通用选项](../build/source.md)准备源码和 `3rdparty`。在已选择 Xcode 命令行工具的 macOS 上，从 InspireFace 根目录运行：

```bash
bash command/build_ios.sh
```

当前脚本构建用于 **iOS arm64 真机**的静态 `InspireFace.framework`，部署目标为 iOS 11.0，关闭 Bitcode。同时准备该构建使用的 MNN Framework：

```text
build/inspireface-ios/
  InspireFace.framework/
  MNN.framework/
```

使用 SDK 版本查询接口记录运行库版本。设置可选的 `VERSION` 环境变量，可以为构建输出目录添加后缀。

这里生成的是 arm64 真机 Framework。需要模拟器目标时，按模拟器 SDK 与架构分别构建 InspireFace 和依赖；应用同时需要真机与模拟器时，再将两套产物打包为 XCFramework。

## 将 SDK 和模型加入 Xcode {#add-the-sdk-and-model-to-xcode}

将两个 Framework 加入目标的链接设置，并通过 Framework Search Paths 指定目录。`InspireFace.framework` 内含静态库，无需按动态 Framework 嵌入；MNN 则按实际构建包的链接方式配置。

将模型文件加入目标的 Copy Bundle Resources，保持文件名不变，例如 `Pikachu`。调用启动接口前，取得实际文件系统路径：

```objectivec
#import <InspireFace/inspireface.h>

NSString *pack = [[NSBundle mainBundle] pathForResource:@"Pikachu" ofType:nil];
if (pack == nil) {
    // Report a missing bundled resource to the application.
    return;
}
HResult status = HFLaunchInspireFace(pack.fileSystemRepresentation);
if (status != HSUCCEED) {
    NSLog(@"InspireFace launch failed: %ld", (long)status);
    return;
}
```

在 UI 线程之外初始化，并复用进程级运行环境。使用 `HFCreateInspireFaceSessionOptional` 创建会话，错误处理和清理方式参考[完整 C 检测示例](./c-cpp.md#a-complete-detection-program)。

Swift 可以通过目标的 bridging header 暴露 C 头文件，也可以用 Objective-C++ 类包装会话，提供启动、处理和关闭方法。在封装内管理原生指针与帧的生命周期。

### 检查 Target 设置 {#check-the-target-settings}

1. 在 **Build Phases → Link Binary With Libraries** 中添加 `InspireFace.framework`、`MNN.framework` 及当前构建需要的系统 Framework。当前 iOS CMake 目标链接 Metal、CoreML、Foundation、CoreVideo 和 CoreMedia；C++ 代码还需要 C++ 运行库。Apple 扩展额外使用 Accelerate。
2. 在 **Build Settings → Framework Search Paths** 中填写 Framework 所在目录。建议使用 `$(PROJECT_DIR)/Frameworks` 这类项目相对路径，方便其他机器构建。
3. 在 **Copy Bundle Resources** 中将模型加入应用 Target，让 Xcode 把它复制进 App。
4. 选择 arm64 真机，先运行上面的模型启动检查，再接入摄像头。需要采集视频时，在 Info 设置中加入 `NSCameraUsageDescription`，并在启动采集前处理相机授权。

![Xcode Build Phases 中添加 Framework 链接的入口](https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/setup_s1.png)

*在图示的 Build Phases 中添加上文列出的 Framework 依赖。Pods 条目属于截图中的示例工程。*

::: tip 按出错阶段排查
找不到头文件时，检查 Framework Search Paths；出现 undefined symbols 时，检查链接库和依赖；模型路径为 nil 时，检查 Copy Bundle Resources 与 Target membership。
:::

## 摄像头输入与行步长 {#camera-input-and-row-stride}

读取 BGRA `CVPixelBuffer` 时，先锁定基地址，通过 `CVPixelBufferGetBytesPerRow` 获取实际行字节数。`HFImageData` 没有步长字段，因此带行填充的缓冲区需要逐行复制到紧密排列的内存。

下面的辅助函数复制已有的 BGRA 像素缓冲区，应放在 Objective-C++ `.mm` 文件中；遇到其他格式时返回 `false`：

```cpp
#import <CoreVideo/CoreVideo.h>
#include <cstring>
#include <vector>

bool copyBGRA(CVPixelBufferRef buffer, std::vector<unsigned char>& pixels) {
    if (!buffer || CVPixelBufferGetPixelFormatType(buffer) != kCVPixelFormatType_32BGRA)
        return false;
    const size_t width = CVPixelBufferGetWidth(buffer);
    const size_t height = CVPixelBufferGetHeight(buffer);
    pixels.resize(width * height * 4);
    if (CVPixelBufferLockBaseAddress(buffer, kCVPixelBufferLock_ReadOnly) != kCVReturnSuccess)
        return false;
    const auto* source = static_cast<const unsigned char*>(CVPixelBufferGetBaseAddress(buffer));
    const size_t stride = CVPixelBufferGetBytesPerRow(buffer);
    const bool valid = source != nullptr && stride >= width * 4;
    if (valid) {
        for (size_t y = 0; y < height; ++y)
            std::memcpy(pixels.data() + y * width * 4, source + y * stride, width * 4);
    }
    CVPixelBufferUnlockBaseAddress(buffer, kCVPixelBufferLock_ReadOnly);
    return valid;
}
```

将复制后的存储声明为 `HF_STREAM_BGRA`，并保留 vector，直到图像流及所有后续处理结束。此时 vector 持有独立副本，摄像头复用原缓冲区不会改变已提交像素。

NV12 摄像头输出需要分别读取 Y 和 UV 平面，并按各平面的行步长整理输入。格式大小与旋转约定见[图像输入](../guides/image-inputs.md)。

## 会话与界面生命周期 {#session-and-ui-lifetime}

每个跟踪会话使用一个串行分析队列，在启动摄像头回调前创建会话。退出时先停止新任务，等待已有任务结束，释放图像流和会话；没有其他页面使用 SDK 后，再终止运行环境。

绘制前，将预览的裁剪、缩放、方向和前置镜像变换应用到检测坐标。向主队列传递复制后的几何信息，再通过 UIKit 绘制。

## Apple 加速 {#apple-acceleration}

源码还提供 `command/build_ios_coreml.sh`，启用 `ISF_ENABLE_APPLE_EXTENSION`，输出到 `build/inspireface-ios-coreml-arm64`。搭配对应的 Apple 模型包，在目标设备上评估。

在目标设备上分别测量模型与会话启动、连续帧处理的耗时。应用计时包含图像转换，并与结果一起记录资源包和 CoreML 配置。
