# iOS

InspireFace's C API can be called from Objective-C, Objective-C++ or Swift through a small bridge. Start with file or bitmap input, then connect camera frames once model loading and detection work on a device.

For the full framework build process, dependency versions and binary checks, see [Build for iOS](../build/ios.md).

::: warning iOS APIs
iOS integration currently requires calling the C/C++ APIs from your app. Dedicated Objective-C and Swift APIs will be available in a future release.
:::

## Build the frameworks

Prepare the source and `3rdparty` checkout as described in [Source and common options](../build/source.md). On macOS with the Xcode command-line tools selected, run from the InspireFace root:

```bash
bash command/build_ios.sh
```

The current script builds a static `InspireFace.framework` for **iOS devices, arm64**. Its configured deployment target is iOS 11.0 and Bitcode is disabled. It also stages the MNN framework used by that build:

```text
build/inspireface-ios/
  InspireFace.framework/
  MNN.framework/
```

Use the SDK version query when recording the runtime version. Set the optional `VERSION` environment variable to add a suffix to the build output directory.

These frameworks target arm64 devices. For a simulator target, build the SDK and its dependencies for the simulator SDK and architecture. Package device and simulator builds into an XCFramework if your application needs both.

## Add the SDK and model to Xcode

Add both frameworks to the target's link settings and make their locations available through Framework Search Paths. `InspireFace.framework` contains a static library, so it does not need to be embedded as a dynamic framework. Configure the accompanying MNN binary according to the linkage of the package you built.

Add the model resource file to the target's Copy Bundle Resources phase. Keep its filename unchanged, for example `Pikachu`. Resolve an actual filesystem path before calling the launcher:

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

Run initialization off the UI thread and reuse the resulting process-level runtime. Create sessions with `HFCreateInspireFaceSessionOptional` and follow the [complete C detection example](./c-cpp.md#a-complete-detection-program) for error handling and cleanup.

For Swift, expose the C header through your target's bridging header or wrap the session in an Objective-C++ class with explicit start, process and close methods. Manage native pointers and frame lifetimes inside that wrapper.

### Check the target settings

1. In **Build Phases → Link Binary With Libraries**, add `InspireFace.framework`, `MNN.framework` and the frameworks required by that build. The current iOS CMake target links Metal, CoreML, Foundation, CoreVideo and CoreMedia; C++ code also needs the C++ runtime. The Apple extension adds Accelerate.
2. In **Build Settings → Framework Search Paths**, point to the directory holding the frameworks. Use a project-relative path such as `$(PROJECT_DIR)/Frameworks` so another machine can build the project.
3. In **Copy Bundle Resources**, add the model to the application target so Xcode copies it into the built app.
4. Select a physical arm64 device and run the model-launch check above before adding camera processing. If the app captures video, add `NSCameraUsageDescription` to its Info settings and handle camera authorization before starting the capture session.

![Xcode Build Phases showing framework link settings](https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/setup_s1.png)

*Use Build Phases to add the framework dependencies listed above. The Pods entry belongs to the project shown in the screenshot.*

::: tip Find the failing stage
For a missing header, check Framework Search Paths. For undefined symbols, check linked libraries and dependencies. For a nil model path, check Copy Bundle Resources and target membership.
:::

## Camera input and row stride

For a BGRA `CVPixelBuffer`, lock its base address while reading it. Obtain the real bytes-per-row with `CVPixelBufferGetBytesPerRow`. `HFImageData` has no stride field, so a padded buffer must be copied row by row into tightly packed storage.

The following helper shows the copy for an already-created BGRA pixel buffer. It belongs in an Objective-C++ `.mm` file and returns `false` for a different format:

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

Describe the copied storage as `HF_STREAM_BGRA`, and retain the vector until the stream and all downstream processing are finished. The vector now owns an independent copy, so camera-buffer reuse cannot change the submitted pixels.

For NV12 camera output, read the Y and UV planes separately and use each plane's row stride when packing the input. See [image inputs](../guides/image-inputs.md) for format sizes and rotation conventions.

## Session and UI lifetime

Use one serial analysis queue for each tracking session. Create the session before starting camera callbacks. On teardown, stop new submissions, finish outstanding work, release streams and sessions, then terminate the SDK when no other screen uses it.

Apply the preview's crop, scale, orientation and front-camera mirror transform to the detection coordinates before drawing. Send copied geometry to the main queue for UIKit rendering.

## Apple acceleration

The source also provides `command/build_ios_coreml.sh`, which enables `ISF_ENABLE_APPLE_EXTENSION` and writes to `build/inspireface-ios-coreml-arm64`. Use the corresponding Apple resource pack and evaluate on the target device.

Measure model/session startup and repeated frame processing separately on the target device. Include image conversion in the application timing, and record the resource pack and CoreML configuration with the results.
