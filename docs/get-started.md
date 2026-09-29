# Get started

Install the SDK with one command, then use the Python example below to detect faces in an image and save the annotated result.

## Install Python dependencies

```bash
python -m pip install inspireface opencv-python
```

The current PyPI package is **1.2.4.post1** and includes the **1.2.4 CPU SDK**. For an existing installation, use `python -m pip install --upgrade inspireface`. Platform packages and requirements are listed in the [Python guide](./using-with/python.md#install).

## Detect faces in an image

Save this as `first_face.py` and place a face image named `face.jpg` beside it:

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

Run it:

```bash
python first_face.py
```

Open `detected.jpg` to see the boxes. If no faces meet the detection settings, the script prints `Detected 0 faces`. Try a clear, upright face first. If a face is small in the original image, a larger supported detector level can help, at the cost of more work per frame.

## Use a model you already downloaded

For an offline application, pass the path to the downloaded resource-pack **file**:

```python
isf.launch(resource_path="/path/to/Pikachu")
```

Resource packs may have no file extension. If you downloaded a ZIP archive, extract it first and pass the pack file to `launch`. Deploy the resource pack and SDK as a tested pair.

To pass image, model and output paths on the command line, save the complete program below as `detect.py`:

<details>
<summary>detect.py — Complete command-line example</summary>

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

Run it:

```bash
python detect.py face.jpg --model /path/to/Pikachu --output detected.jpg
```

## What the example sets up

| Setting | Meaning |
| --- | --- |
| `HF_ENABLE_NONE` | Load the detection/tracking core without optional analysis models. |
| `HF_DETECT_MODE_ALWAYS_DETECT` | Run detection for every call; suitable for unrelated still images. |
| `max_detect_num=10` | Limit the number of faces returned by the session. |
| `detect_pixel_level=320` | Select the model's detection input size from the levels supported by the pack. |
| `face.location` | `(x1, y1, x2, y2)` in the image coordinate system. |

Keep the session alive across frames in a real application. Creating a new session for every image repeats model setup and loses tracking history.

## Continue from here

- [Python](./using-with/python.md): run optional analysis, handle raw image streams and manage resources.
- [Java](./using-with/java.md): load the SDK on a regular JVM and run a complete image-detection program.
- [C API](./using-with/c-cpp.md): compile a complete native example without OpenCV.
- [Objective-C and Swift](./using-with/apple.md): build an Apple app with the iOS or macOS frameworks.
- [Tracking](./guides/tracking.md): use a video sequence and tune detection work.
- [Recognition](./guides/recognition.md): compare two faces and add a gallery.
- [Troubleshooting](./guides/troubleshooting.md): diagnose model, library and image-format problems.
