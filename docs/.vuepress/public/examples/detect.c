/* Build as C99. Usage: detect_c <resource-pack> <image> */
#include <stdio.h>
#include <inspireface.h>

int main(int argc, char **argv) {
    HFSession session = NULL;
    HFImageBitmap bitmap = NULL;
    HFImageStream stream = NULL;
    HFMultipleFaceData faces = {0};
    HResult status;
    int exit_code = 1;

    if (argc != 3) {
        fprintf(stderr, "Usage: %s <resource-pack> <image>\n", argv[0]);
        return 2;
    }
    status = HFLaunchInspireFace(argv[1]);
    if (status != HSUCCEED) {
        fprintf(stderr, "Launch failed: %ld\n", (long)status);
        return 1;
    }
    status = HFCreateInspireFaceSessionOptional(
        HF_ENABLE_NONE, HF_DETECT_MODE_ALWAYS_DETECT, 10, 320, -1, &session);
    if (status != HSUCCEED) goto cleanup;
    status = HFCreateImageBitmapFromFilePath(argv[2], 3, &bitmap);
    if (status != HSUCCEED) goto cleanup;
    status = HFCreateImageStreamFromImageBitmap(bitmap, HF_CAMERA_ROTATION_0, &stream);
    if (status != HSUCCEED) goto cleanup;
    status = HFExecuteFaceTrack(session, stream, &faces);
    if (status != HSUCCEED) goto cleanup;

    printf("Detected %d faces\n", faces.detectedNum);
    for (HInt32 i = 0; i < faces.detectedNum; ++i) {
        HFaceRect box = faces.rects[i];
        printf("face %d: x=%d y=%d width=%d height=%d confidence=%.3f\n",
               i, box.x, box.y, box.width, box.height, faces.detConfidence[i]);
    }
    exit_code = 0;

cleanup:
    if (exit_code != 0) fprintf(stderr, "InspireFace error: %ld\n", (long)status);
    /* Release each handle once, after its final use. */
    if (stream != NULL) HFReleaseImageStream(stream);
    if (bitmap != NULL) HFReleaseImageBitmap(bitmap);
    if (session != NULL) HFReleaseInspireFaceSession(session);
    HFTerminateInspireFace();
    return exit_code;
}
