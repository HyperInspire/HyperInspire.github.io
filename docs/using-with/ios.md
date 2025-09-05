# Using InspireFace in iOS

We provide C and C++ header files, which you can use by enabling C/C++ compiler features in Xcode.

## How to Get the SDK

1. You can download the iOS SDK from the [release page](https://github.com/HyperInspire/InspireFace/releases), which includes iOS InspireFace static library files and framework files;

2. You can also compile from source code using a macOS device:

```bash
bash command/build_ios.sh
```

The compilation results will be consistent with the iOS SDK downloaded from the [release page](https://github.com/HyperInspire/InspireFace/releases).

## 2. Specifications

### Requirements and Dependencies

- Framework type: Static library
- Minimum supported version: iOS 11.0
- Supported architecture: armv8 (ARM64)
    - Simulator version not supported yet
- Dependencies:
    - libc++.tbd
    - UIKit.framework
    - CoreML.framework
    - Foundation.framework
    - MNN.framework(2.8.1)
- SDK version: 10.2.3 (corresponding to open source version 1.2.3)
- Bitcode: Enabled


## 3. Integration Guide

1. You need to add **InspireFace.framework** and **MNN.framework** to your project, and add the required dependency libraries;

![step1](https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/setup_s1.png)

2. Download the models you need. You can download the required models from the [Github Release](https://github.com/HyperInspire/InspireFace/releases/tag/v1.x) page and add them to your project;

3. You can refer to [C/C++ usage examples](https://doc.inspireface.online/using-with/c-cpp.html) for related usage.