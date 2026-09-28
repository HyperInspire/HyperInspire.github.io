#include <inspirecv/inspirecv.h>
#include <inspirecv/task/pipeline.h>
#include <algorithm>
#include <iostream>
#include <vector>

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "Usage: preprocess IMAGE\n";
        return 1;
    }
    auto image = inspirecv::Image::Create(argv[1], 3);
    if (image.Empty()) {
        std::cerr << "Cannot read image\n";
        return 2;
    }
    // This example stretches to a square; use the transform your model expects.
    auto resized = image.Resize(224, 224);
    if (!resized.Write("resized.jpg")) {
        std::cerr << "Cannot write resized.jpg\n";
        return 3;
    }
    namespace task = inspirecv::task;
    task::PipelineOptions options;
    options.input_format = task::PixelFormat::kBgr;
    options.output_format = task::PixelFormat::kRgb;
    options.mean = {{127.5f, 127.5f, 127.5f, 0.0f}};
    options.scale = {{1.0f / 127.5f, 1.0f / 127.5f, 1.0f / 127.5f, 1.0f}};
    task::Pipeline pipeline(options);
    if (pipeline.ConfigurationStatus() != task::Status::kOk) return 4;

    std::vector<float> values(3 * 224 * 224);
    task::TensorBuffer tensor;
    tensor.data = values.data();
    tensor.width = 224;
    tensor.height = 224;
    tensor.channels = 3;
    tensor.element_type = task::ElementType::kFloat32;
    tensor.order = task::TensorOrder::kChw;
    const auto status = pipeline.Run(resized, tensor);
    if (status != task::Status::kOk) {
        std::cerr << task::StatusMessage(status) << '\n';
        return 5;
    }
    const auto range = std::minmax_element(values.begin(), values.end());
    std::cout << "RGB float tensor: 3 x 224 x 224, range ["
              << *range.first << ", " << *range.second << "]\n";
    return 0;
}
