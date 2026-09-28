#import <InspireFace/InspireFaceApple.h>

BOOL DetectFile(NSString *modelPath, NSString *imagePath,
                HInt32 *faceCount, NSError **error) {
    *faceCount = 0;
    if (![IFRuntime launchAtPath:modelPath error:error]) return NO;
    IFSession *session = nil;
    IFImageBitmap *bitmap = nil;
    IFImageStream *stream = nil;
    BOOL success = NO;
    do {
        session = [[IFSession alloc] initWithOptions:0
                                               mode:HF_DETECT_MODE_ALWAYS_DETECT
                                       maximumFaces:10
                                         pixelLevel:320
                                    framesPerSecond:-1
                                              error:error];
        if (!session) break;
        bitmap = [[IFImageBitmap alloc] initWithContentsOfFile:imagePath
                                                     channels:3 error:error];
        if (!bitmap) break;
        HFImageBitmapData pixels = {0};
        if (![bitmap getBorrowedData:&pixels error:error]) break;
        HFImageData input = {pixels.data, pixels.width, pixels.height,
                             HF_STREAM_BGR, HF_CAMERA_ROTATION_0};
        stream = [[IFImageStream alloc] initWithBorrowedData:input error:error];
        if (!stream) break;
        HFMultipleFaceData faces = {0};
        if (![session trackStream:stream borrowedResult:&faces error:error]) break;
        for (HInt32 i = 0; i < faces.detectedNum; ++i) {
            HFaceRect rect = faces.rects[i];
            NSLog(@"face %d: x=%d y=%d width=%d height=%d", i,
                  rect.x, rect.y, rect.width, rect.height);
        }
        *faceCount = faces.detectedNum;
        success = YES;
    } while (NO);
    [stream closeWithError:NULL];
    [bitmap closeWithError:NULL];
    [session closeWithError:NULL];
    [IFRuntime terminateWithError:NULL];
    return success;
}

#include <stdio.h>
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) { fprintf(stderr, "Usage: detect MODEL IMAGE\n"); return 2; }
        NSError *error = nil;
        HInt32 count = 0;
        if (!DetectFile([NSString stringWithUTF8String:argv[1]],
                        [NSString stringWithUTF8String:argv[2]], &count, &error)) {
            NSLog(@"%@ (%ld): %@", error.domain, (long)error.code, error.localizedDescription);
            return 1;
        }
        printf("Detected %d faces\n", count);
        return 0;
    }
}
