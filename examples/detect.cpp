// Usage: detect_cpp <resource-pack> <image>
#include <iostream>
#include <vector>
#include <inspirecv/inspirecv.h>
#include <inspireface/inspireface.hpp>

struct RuntimeScope {
    ~RuntimeScope() { INSPIREFACE_CONTEXT->Unload(); }
};

int main(int argc, char** argv) {
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <resource-pack> <image>\n";
        return 2;
    }
    int status = INSPIREFACE_CONTEXT->Load(argv[1]);
    if (status != 0) {
        std::cerr << "Launch failed: " << status << '\n';
        return 1;
    }
    RuntimeScope runtime;
    auto image = inspirecv::Image::Create(argv[2], 3);
    if (image.Empty()) {
        std::cerr << "Cannot read image\n";
        return 1;
    }
    // FrameProcess takes height before width and borrows the pixel buffer.
    auto frame = inspirecv::FrameProcess::Create(
        image.Data(), image.Height(), image.Width(),
        inspirecv::BGR, inspirecv::ROTATION_0);
    inspire::CustomPipelineParameter options;
    auto session = inspire::Session::Create(
        inspire::DETECT_MODE_ALWAYS_DETECT, 10, options, 320);
    std::vector<inspire::FaceTrackWrap> faces;
    status = session.FaceDetectAndTrack(frame, faces);
    if (status != 0) {
        std::cerr << "Detection failed: " << status << '\n';
        return 1;
    }
    std::cout << "Detected " << faces.size() << " faces\n";
    auto output = image.Clone();
    for (const auto& face : faces) {
        output.DrawRect(session.GetFaceBoundingBox(face), inspirecv::Color::Green, 2);
    }
    return output.Write("detected-cpp.jpg") ? 0 : 1;
}
