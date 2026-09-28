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
