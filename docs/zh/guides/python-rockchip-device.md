# 在 Rockchip Linux 上使用 Python {#python-on-rockchip-linux}

Python 与 C 应用调用相同的原生 SDK。使用 NPU 时，需要将 Python 封装与 Rockchip 版本的 `libInspireFace.so`、运行依赖以及正确的 `Gundam_*` 模型包配套。

本页适用于运行 **aarch64 Linux / glibc** 的 RK356x、RK3588 设备，通过 1.2.4 封装的 `INSPIREFACE_LIBRARY_PATH` 选择 Rockchip 原生 SDK。需要对比 CPU 性能时，可以在独立环境中安装兼容的通用 CPU wheel。

原生库可使用 [1.2.4 Linux RK356x/RK3588 SDK](https://github.com/HyperInspire/InspireFace/releases/download/v1.2.4/inspireface-linux-aarch64-rk356x-rk3588-1.2.4.zip)。解压后使用其中的 `lib/libInspireFace.so`，保留配套头文件和版本文件。板端运行依赖和 SoC 对应的模型包仍需单独准备；需要更换工具链或调整配置时，再[编译 SDK](../build/rockchip.md)。

## 准备设备 {#prepare-the-device}

先运行原生 [Rockchip 检测示例](../using-with/rknpu.md#start-with-a-still-image)，再确认 Python 解释器、原生库和根文件系统使用一致的架构与 libc。

aarch64 glibc SDK 需要兼容 glibc 系统上的 aarch64 Python 进程。当前 Python 打包脚本不支持 RV1106 这类 ARMv7/uClibc 平台，下面的安装步骤不适用于这些板卡，请使用 [C/C++ 部署方式](../using-with/rknpu.md#start-with-a-still-image)。

可以按如下方式组织应用文件：

```text
my-app/
  native/          # libInspireFace.so and matching runtime dependencies
  models/
    Gundam_RK3588  # choose the pack for your actual device
  detect.py
```

把该板卡和构建所需的运行库放在一起。导入封装前先解决动态加载器报告的问题。

## 安装配套的封装 {#install-the-matching-wrapper}

设备上使用与原生 SDK 相同提交版本的 Python 源码。CMake 配置 SDK 时会生成 `python/version.txt`。如果原生库是在其他机器上编译的，安装前先将该 SDK 随附的 `version.txt` 复制到 Python 源码目录；缺少这个文件时，安装包版本会变成 `0.0.0`。

将下面的路径替换为实际的 SDK 和源码目录。如果当前源码目录已有配套 SDK 构建生成的版本文件，可以跳过复制：

```bash
cp /absolute/path/to/sdk/version.txt /path/to/InspireFace/python/version.txt
cat /path/to/InspireFace/python/version.txt
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e /path/to/InspireFace/python
```

启动 Python 前设置：

```bash
export INSPIREFACE_LIBRARY_PATH=/absolute/path/to/my-app/native/libInspireFace.so
export LD_LIBRARY_PATH="/absolute/path/to/my-app/native${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
python -c 'import inspireface as isf; print("Wrapper:", isf.__version__, "Native:", isf.version())'
```

`INSPIREFACE_LIBRARY_PATH` 选择 SDK 库，`LD_LIBRARY_PATH` 提供依赖目录。应用与部署脚本使用同一个库路径。

使用当前源码时，Python 包版本为 `1.2.4.post1`，原生版本为 `1.2.4`；`.post1` 后缀来自 `python/post`。同时保留配套的源码提交和原生构建记录，相同版本号不代表来自同一次提交。需要为其他设备制作 wheel 时，参照 [Python 打包](../build/python.md#prepare-the-native-sdk-and-wrapper)。

## 加载本地模型包 {#load-a-local-pack}

将本地模型文件传给 `launch`：

```python
import inspireface as isf

isf.launch(resource_path="/absolute/path/to/my-app/models/Gundam_RK3588")
try:
    with isf.InspireFaceSession(
        isf.HF_ENABLE_NONE,
        isf.HF_DETECT_MODE_ALWAYS_DETECT,
        max_detect_num=5,
        detect_pixel_level=320,
        auto_launch=False,
    ) as session:
        # image is a tightly packed BGR uint8 NumPy array.
        faces = session.face_detection(image)
        print(len(faces))
finally:
    isf.terminate()
```

RK3566/RK3568 使用 `Gundam_RK356X`，RK3588 使用 `Gundam_RK3588`。[快速开始](../get-started.md)介绍图像读取和人脸框绘制。其他 Rockchip SoC 请参照[原生部署指南](../using-with/rknpu.md#select-the-target)。

无界面的板端可使用兼容的 `opencv-python-headless` 读取图像。如果没有可用 wheel，使用板端环境提供的图像读取方式，并传入格式正确的 NumPy 数组或 `ImageStream`。

## 部署到多台设备 {#deploy-to-more-than-one-device}

将 Python 源码版本、原生 SDK、模型包和板端运行库固定为一套部署配置。同一板卡配置的设备使用同一套产物。

批量部署前，在每种板卡配置上运行固定图片检查和短视频序列。支持时记录原生诊断信息，再按实际 RGA 配置和启用功能测量耗时。库加载与模型错误可查看[常见问题](./troubleshooting.md)。
