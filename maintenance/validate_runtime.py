"""Validate documented Python operations against a matching local native build.

Set INSPIREFACE_LIBRARY_PATH and PYTHONPATH before running. This does not download
models or modify the SDK source checkout. Inputs and output directory are explicit.
"""
import argparse
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument("--image", required=True, help="A readable image with exactly one face")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    image = cv2.imread(args.image)
    assert image is not None
    print(isf.diagnostic_info())
    print(isf.validate_resource_pack(args.model))
    isf.launch(resource_path=args.model)
    options = (isf.HF_ENABLE_FACE_RECOGNITION | isf.HF_ENABLE_QUALITY |
               isf.HF_ENABLE_LIVENESS | isf.HF_ENABLE_MASK_DETECT |
               isf.HF_ENABLE_INTERACTION | isf.HF_ENABLE_FACE_POSE |
               isf.HF_ENABLE_FACE_ATTRIBUTE | isf.HF_ENABLE_FACE_EMOTION)
    try:
        with isf.InspireFaceSession(options, isf.HF_DETECT_MODE_ALWAYS_DETECT,
                                   detect_pixel_level=320, auto_launch=False) as session:
            faces = session.face_detection(image)
            assert len(faces) == 1
            results = session.face_pipeline(image, faces, options)
            assert len(results) == 1
            for field in ("quality_confidence", "mask_confidence", "rgb_liveness_confidence",
                          "left_eye_status_confidence", "right_eye_status_confidence"):
                assert math.isfinite(getattr(results[0], field)), field
            for field in ("race", "gender", "age_bracket", "emotion", "action_blink", "action_shake"):
                getattr(results[0], field)
            assert session.get_face_five_key_points(faces[0]).shape == (5, 2)
            assert session.get_face_dense_landmark(faces[0]).shape == (106, 2)
            embedding = session.face_feature_extract(image, faces[0])
            saved = embedding.copy()
            session.face_feature_extract(image, faces[0])
            assert np.array_equal(saved, embedding), "Python embedding should own its data"
            assert isf.feature_comparison(embedding, embedding) > 0.99
            with session.face_detection_snapshot(image) as snapshot:
                session.face_detection(image)
                assert len(snapshot.faces) == 1, "Snapshot should survive later tracking"
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            with isf.ImageStream.load_from_cv_image(rgb, isf.HF_STREAM_RGB) as stream:
                assert len(session.face_detection(stream)) == 1
            blank = np.zeros_like(image)
            assert session.face_detection(blank) == []
            print("PASS: pipeline fields, landmarks, copied features, snapshots, RGB and no-face input")

        config = isf.FeatureHubConfiguration(
            primary_key_mode=isf.HF_PK_MANUAL_INPUT, enable_persistence=False,
            persistence_db_path="", search_threshold=isf.get_recommended_cosine_threshold(),
            search_mode=isf.HF_SEARCH_MODE_EXHAUSTIVE)
        isf.feature_hub_enable(config)
        try:
            assert not isf.feature_hub_face_search(embedding).matched
            success, stored_id = isf.feature_hub_face_insert(isf.FaceIdentity(embedding, id=1001))
            assert success and stored_id == 1001
            result = isf.feature_hub_face_search(embedding)
            assert result.matched and result.similar_identity.id == 1001
            assert isf.feature_hub_face_search_top_k(embedding, 5)[0][1] == 1001
            assert isf.feature_hub_face_update(isf.FaceIdentity(embedding, id=1001))
            assert isf.feature_hub_get_face_count() == 1
            assert isf.feature_hub_get_face_id_list() == [1001]
            assert isf.feature_hub_face_remove(1001)
            assert not isf.feature_hub_face_search(embedding).matched
            print("PASS: empty gallery, insert, search, top-k, update, count, IDs and removal")
        finally:
            isf.feature_hub_disable()
    finally:
        isf.terminate()

    video_path = output / "stationary-face.avi"
    height, width = image.shape[:2]
    writer = cv2.VideoWriter(str(video_path), cv2.VideoWriter_fourcc(*"MJPG"), 30, (width, height))
    assert writer.isOpened()
    try:
        for _ in range(100):
            writer.write(image)
    finally:
        writer.release()
    examples = Path(__file__).resolve().parents[1] / "docs/.vuepress/public/examples"
    commands = [
        ["detect.py", args.image, "--model", args.model, "--output", str(output / "detected.jpg")],
        ["compare.py", args.image, args.image, "--model", args.model],
        ["capture.py", str(video_path), "--model", args.model, "--output", str(output / "captured.jpg")],
        ["benchmark.py", args.image, "--model", args.model, "--warmup", "2", "--runs", "5"],
    ]
    for name, *arguments in commands:
        subprocess.run([sys.executable, "-B", str(examples / name), *arguments], check=True)
        print("PASS:", name)
    assert cv2.imread(str(output / "captured.jpg")) is not None

    blank_path = output / "no-face.png"
    assert cv2.imwrite(str(blank_path), np.zeros_like(image))
    subprocess.run([sys.executable, "-B", str(examples / "detect.py"), str(blank_path),
                    "--model", args.model, "--output", str(output / "no-face-detected.jpg")], check=True)
    rejection = subprocess.run([sys.executable, "-B", str(examples / "compare.py"),
                                str(blank_path), args.image, "--model", args.model],
                               capture_output=True, text=True)
    assert rejection.returncode != 0 and "Expected exactly one face" in rejection.stderr
    print("PASS: empty detection accepted; comparison rejects no-face input")


if __name__ == "__main__":
    main()
