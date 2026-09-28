import Foundation
import InspireFaceSwift

func detectFile(modelPath: String, imagePath: String) throws -> Int {
    try InspireFaceRuntime.launch(path: modelPath)
    defer { try? InspireFaceRuntime.terminate() }
    let session = try FaceSession(configuration: SessionConfiguration(
        detectionMode: .alwaysDetect, maximumFaces: 10, pixelLevel: 320))
    defer { try? session.close() }
    let bitmap = try ImageBitmap(contentsOfFile: imagePath, channels: 3)
    defer { try? bitmap.close() }
    return try bitmap.withUnsafeMutablePixels { bytes, pixels in
        try ImageStream.withBorrowedBytes(
            bytes, width: pixels.width, height: pixels.height, format: .bgr
        ) { stream in
            try session.withUnsafeFaces(in: stream) { faces in
                for (index, rect) in faces.rectangles.enumerated() {
                    print("face \(index): x=\(rect.x) y=\(rect.y) " +
                          "width=\(rect.width) height=\(rect.height)")
                }
                return faces.count
            }
        }
    }
}

guard CommandLine.arguments.count == 3 else {
    print("Usage: detect MODEL IMAGE")
    exit(2)
}
do {
    let count = try detectFile(modelPath: CommandLine.arguments[1], imagePath: CommandLine.arguments[2])
    print("Detected \(count) faces")
} catch {
    let failure = error as NSError
    print("\(failure.domain) (\(failure.code)): \(failure.localizedDescription)")
    exit(1)
}
