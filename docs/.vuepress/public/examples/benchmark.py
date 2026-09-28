"""Measure synchronous still-image detection latency (not camera FPS)."""
import argparse
import math
import statistics
import time

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image")
    parser.add_argument("--model", required=True)
    parser.add_argument("--runs", type=int, default=100)
    parser.add_argument("--warmup", type=int, default=20)
    args = parser.parse_args()
    if args.runs < 1 or args.warmup < 0:
        parser.error("runs must be positive and warmup must be non-negative")
    image = cv2.imread(args.image)
    if image is None:
        parser.error("Cannot read the input image")
    isf.launch(resource_path=args.model)
    try:
        with isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_ALWAYS_DETECT,
            max_detect_num=10, detect_pixel_level=320, auto_launch=False,
        ) as session:
            with isf.ImageStream.load_from_cv_image(image) as stream:
                for _ in range(args.warmup):
                    session.face_detection(stream)
                elapsed = []
                counts = set()
                for _ in range(args.runs):
                    start = time.perf_counter_ns()
                    faces = session.face_detection(stream)
                    elapsed.append((time.perf_counter_ns() - start) / 1_000_000)
                    counts.add(len(faces))
        ordered = sorted(elapsed)
        p95 = ordered[math.ceil(0.95 * len(ordered)) - 1]
        print(f"native={isf.version()}, image={image.shape}, face_counts={sorted(counts)}")
        print(f"ALWAYS_DETECT, level=320, max_faces=10, runs={args.runs}")
        print(f"median={statistics.median(elapsed):.3f} ms, p95={p95:.3f} ms")
    finally:
        isf.terminate()


if __name__ == "__main__":
    main()
