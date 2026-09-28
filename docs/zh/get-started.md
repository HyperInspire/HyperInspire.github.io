# 快速开始 {#get-started}

这个示例读取一张图片，检测人脸，并保存一份画好人脸框的副本。可以先用它确认运行时和模型包正常，再加入相机、跟踪或识别功能。

## 安装 Python 依赖 {#install-python-dependencies}

建议使用虚拟环境，把 SDK 及其依赖放在项目自己的环境里：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install inspireface opencv-python
```

可用的 wheel 取决于 Python 版本、操作系统和 CPU 架构。如果 pip 提示“No matching distribution”，先检查[已发布的 wheel 文件](https://pypi.org/project/inspireface/#files)。没有显示界面的服务器可以将 `opencv-python` 替换为 `opencv-python-headless`；本示例只写入图片文件。

::: tip 示例版本
下面的示例使用基础检测接口。快照和人脸抓拍示例需要配套的 1.2.4 封装与原生库，配置方法见 [Python 接入](./using-with/python.md#use-a-local-native-build)。
:::

## 检测图片中的人脸 {#detect-faces-in-an-image}

把下面的代码保存为 `first_face.py`，并在同一目录放一张名为 `face.jpg` 的人脸图片：

```python
import cv2
import inspireface as isf

image = cv2.imread("face.jpg")
if image is None:
    raise FileNotFoundError("Cannot read face.jpg")

# The first call may download the Pikachu resource pack.
isf.launch("Pikachu")
session = None
try:
    session = isf.InspireFaceSession(
        isf.HF_ENABLE_NONE,
        isf.HF_DETECT_MODE_ALWAYS_DETECT,
        max_detect_num=10,
        detect_pixel_level=320,
    )
    faces = session.face_detection(image)
    print(f"Detected {len(faces)} faces")
    for face in faces:
        x1, y1, x2, y2 = face.location
        cv2.rectangle(image, (x1, y1), (x2, y2), (60, 170, 80), 2)
    if not cv2.imwrite("detected.jpg", image):
        raise RuntimeError("Could not write detected.jpg")
finally:
    if session is not None:
        session.release()
    isf.terminate()
```

运行：

```bash
python first_face.py
```

打开 `detected.jpg` 查看人脸框。如果没有符合检测条件的人脸，脚本会输出 `Detected 0 faces`。建议先使用清晰、正向的人脸图片。如果人脸在原图中占比很小，可以尝试更高的受支持检测档位，每帧的计算量也会增加。

## 使用已经下载的模型 {#use-a-model-you-already-downloaded}

离线应用可以直接传入已下载资源包的**文件路径**：

```python
isf.launch(resource_path="/path/to/Pikachu")
```

资源包可能没有扩展名。如果下载的是 ZIP 压缩包，请先解压，再把资源文件传给 `launch`。部署时，将测试过的 SDK 与资源包配套发布。

需要从命令行指定输入、模型和输出路径时，将下面的完整代码保存为 `detect.py`：

<details>
<summary>detect.py — 完整命令行示例</summary>

```python
"""Detect faces in one image and save an annotated copy."""
import argparse
from pathlib import Path

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    parser.add_argument("--model", type=Path, help="Path to an unpacked resource pack")
    parser.add_argument("--output", type=Path, default=Path("detected.jpg"))
    args = parser.parse_args()

    image = cv2.imread(str(args.image))
    if image is None:
        parser.error(f"Cannot read image: {args.image}")
    if args.model is None:
        isf.launch("Pikachu")  # Downloads the model on first use.
    else:
        isf.launch(resource_path=str(args.model))

    session = None
    try:
        session = isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320,
        )
        faces = session.face_detection(image)
        print(f"Detected {len(faces)} faces")
        output = image.copy()
        for face in faces:
            x1, y1, x2, y2 = face.location
            cv2.rectangle(output, (x1, y1), (x2, y2), (60, 170, 80), 2)
            print(face.location, face.detection_confidence)
        if not cv2.imwrite(str(args.output), output):
            raise RuntimeError(f"Cannot write image: {args.output}")
        print(f"Saved {args.output}")
    finally:
        if session is not None:
            session.release()
        isf.terminate()


if __name__ == "__main__":
    main()
```

</details>

运行：

```bash
python detect.py face.jpg --model /path/to/Pikachu --output detected.jpg
```

## 示例中的配置 {#what-the-example-sets-up}

| Setting | 说明 |
| --- | --- |
| `HF_ENABLE_NONE` | 只加载检测和跟踪所需模块，不启用额外分析模型。 |
| `HF_DETECT_MODE_ALWAYS_DETECT` | 每次调用都执行检测，适合处理互不相关的静态图片。 |
| `max_detect_num=10` | 限制会话返回的人脸数量。 |
| `detect_pixel_level=320` | 从模型包支持的档位中，选择检测模型的输入尺寸。 |
| `face.location` | 图像坐标系中的 `(x1, y1, x2, y2)`。 |

实际应用应跨帧复用会话。每张图片都重新创建会话会重复初始化模型，也会丢失跟踪历史。

## 继续接入 {#continue-from-here}

- [Python](./using-with/python.md)：执行可选分析、处理原始图像流和管理资源。
- [C API](./using-with/c-cpp.md)：编译不依赖 OpenCV 的完整原生示例。
- [会话与跟踪](./guides/tracking.md)：处理视频序列并调整检测开销。
- [人脸识别](./guides/recognition.md)：比对两张人脸并接入特征库。
- [常见问题](./guides/troubleshooting.md)：排查模型、动态库和图像格式问题。
