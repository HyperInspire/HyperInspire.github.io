"""Select a stable face frame from a video using InspireFace 1.2.4."""
import argparse
import math
from pathlib import Path

import cv2
import inspireface as isf


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video")
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", default="captured.jpg")
    args = parser.parse_args()
    video = cv2.VideoCapture(args.video)
    if not video.isOpened():
        parser.error("Cannot open the input video")
    fps = video.get(cv2.CAP_PROP_FPS)
    if not math.isfinite(fps) or not 0 < fps <= 1000:
        video.release()
        parser.error("This example needs a video with a valid frame rate")

    launched = False
    try:
        isf.launch(resource_path=args.model)
        launched = True
        with isf.InspireFaceSession(
            isf.HF_ENABLE_NONE, isf.HF_DETECT_MODE_LIGHT_TRACK,
            max_detect_num=5, detect_pixel_level=320, auto_launch=False,
        ) as session:
            config = isf.FaceCaptureConfig.defaults()
            with session.create_face_capture(config) as capture:
                candidates = {}
                frame_id = 0
                while True:
                    ok, frame = video.read()
                    if not ok:
                        break
                    # Use video time, not the speed of this offline processing loop.
                    timestamp_ms = round(frame_id * 1000 / fps)
                    progress = capture.update(frame, frame_id, timestamp_ms)
                    results = capture.results()
                    kept_ids = {result.frame_id for result in results}
                    if frame_id in kept_ids:
                        candidates[frame_id] = frame.copy()
                    candidates = {key: value for key, value in candidates.items()
                                  if key in kept_ids}
                    print(frame_id, progress.state.name, int(progress.reject_reasons))
                    frame_id += 1
                    if progress.state == isf.FaceCaptureState.READY:
                        capture.finish()
                        selected = capture.results()[0]
                        output = Path(args.output)
                        output.parent.mkdir(parents=True, exist_ok=True)
                        if not cv2.imwrite(str(output), candidates[selected.frame_id]):
                            raise RuntimeError(f"Cannot write {output}")
                        print(f"Saved frame {selected.frame_id} to {output}")
                        return
                    if progress.state == isf.FaceCaptureState.FINISHED:
                        raise RuntimeError("Capture finished before becoming ready; start a new round")
                raise RuntimeError("Video ended before capture was ready")
    finally:
        video.release()
        if launched:
            isf.terminate()


if __name__ == "__main__":
    main()
