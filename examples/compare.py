"""Compare two images that each contain exactly one face."""
import argparse
import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first")
    parser.add_argument("second")
    parser.add_argument("--model", required=True)
    args = parser.parse_args()
    images = [cv2.imread(path) for path in (args.first, args.second)]
    if any(image is None for image in images):
        parser.error("Both image paths must be readable")

    isf.launch(resource_path=args.model)
    session = None
    try:
        session = isf.InspireFaceSession(
            isf.HF_ENABLE_FACE_RECOGNITION, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320,
        )
        features = []
        for image in images:
            faces = session.face_detection(image)
            if len(faces) != 1:
                raise ValueError(f"Expected exactly one face; found {len(faces)}")
            features.append(session.face_feature_extract(image, faces[0]))
        similarity = isf.feature_comparison(features[0], features[1])
        threshold = isf.get_recommended_cosine_threshold()
        print(f"Cosine similarity: {similarity:.4f}")
        print(f"Model threshold: {threshold:.4f}")
        print(f"Above threshold: {similarity >= threshold}")
    finally:
        if session is not None:
            session.release()
        isf.terminate()


if __name__ == "__main__":
    main()
