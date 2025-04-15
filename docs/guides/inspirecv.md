# InspireCV: Lightweight CV library

**InspireCV** is a lightweight computer vision library that provides high-level abstract interfaces for commonly used vision algorithms. It features a flexible backend architecture, allowing users to leverage a lightweight backend by default while also offering the option to switch to a more powerful **OpenCV backend** for enhanced performance.

![InspireCV](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv2.jpg)

- Supports both OpenCV and custom OKCV backends
- Core functionality includes:
  - Basic image processing operations
  - Geometric primitives (Point, Rect, Size)
  - Transform matrices
  - Image I/O
- Minimal dependencies when using OKCV backend
- Optional OpenCV integration for debugging and visualization

::: tip
InspireCV was developed to reduce SDK size and avoid dependency issues by replacing OpenCV with a lightweight, project-tailored vision library.
:::

## Build Options

### Backend Selection

- `INSPIRECV_BACKEND_OPENCV`: Use OpenCV as the backend (OFF by default)
- `INSPIRECV_BACKEND_OKCV_USE_OPENCV`: Enable OpenCV support in OKCV backend (OFF by default)
- `INSPIRECV_BACKEND_OKCV_USE_OPENCV_IO`: Use OpenCV's image I/O in OKCV (OFF by default)
- `INSPIRECV_BACKEND_OKCV_USE_OPENCV_GUI`: Use OpenCV's GUI features in OKCV (OFF by default)

### Other Options

- `INSPIRECV_BUILD_SHARED_LIBS`: Build as shared libraries (OFF by default)
- `INSPIRECV_OKCV_BUILD_TESTS`: Build test suite (ON by default)
- `INSPIRECV_OKCV_BUILD_SAMPLE`: Build sample applications (ON by default)

### Dependencies

Required:

- CMake 3.10+
- Eigen3
- C++14 compiler

Optional:

- OpenCV (required if using OpenCV backend or OpenCV features in OKCV)

## Use Guide

### Image I/0

Image has multiple ways to load from file, buffer, or other sources. Default image type is 3-channel **BGR** image, like OpenCV.

- **Image Constructor**

::: code-tabs#shell

@tab C++

```cpp
// Load image from file
// Load with 3 channels (BGR, like opencv)
inspirecv::Image img = inspirecv::Image::Create("test_res/data/bulk/kun_cartoon_crop.jpg", 3);

// Other load methods

// Load image from buffer
uint8_t* buffer = ...;  // buffer is a pointer to the image data
bool is_alloc_mem = false;  // if true, will allocate memory for the image data,
                            // false is recommended to point to the original data to avoid copying
inspirecv::Image img = inspirecv::Image::Create(width, height, channel, buffer, is_alloc_mem);
```

@tab C

```c
TODO
```

:::

- **Image Save and Show**

Image supports multiple image formats, including PNG, JPG, BMP, etc. You can save image to file. If you want to show image, it must depend on OpenCV.

::: code-tabs#shell

@tab C++

```cpp
// Save image to file
img.Write("output.jpg");

// Show image, warning: it must depend on opencv
img.Show("input");
```

@tab C

```c
TODO
```

:::

- **Get pointer of Image**

::: code-tabs#shell

@tab C++

```cpp
// Get pointer to image data
const uint8_t* ptr = img.Data();
```


@tab C

```c
TODO
```

:::

### Image Processing

Image processing is a core functionality of InspireCV. It provides a set of functions to process images.

Take this original image for example:

![KunKun](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/kun_cartoon_crop.jpg)

Features includes:

- **ToGray**

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image gray = img.ToGray();
```

@tab C

```c
TODO
```

:::

![Gray Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/gray.jpg)

---

- **Apply Gaussian blur**

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image blurred = img.GaussianBlur(3, 1.0);
```

@tab C

```c
TODO
```

:::

![Blurred Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/blurred.jpg)

---

- **Resize**

::: code-tabs#shell

@tab C++

```cpp
auto scale = 0.35;
bool use_bilinear = true;
inspirecv::Image resized = img.Resize(img.Width() * scale, img.Height() * scale, use_bilinear);
``` 

@tab C

```c
TODO
```

:::

![Resized Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/resized.jpg)

---

- **Rotate**
    - Support 90, 180, 270 clockwise degree rotation

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image rotated = img.Rotate90();
```

@tab C

```c
TODO
```

:::

![Rotated Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/rotated.jpg)

---

- **Flip**
    - Support horizontal, vertical, and both flip

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image flipped_vertical = img.FlipVertical();
```

@tab C

```c
TODO
```

:::

![Flipped Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/flipped_vertical.jpg)

---

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image flipped_horizontal = img.FlipHorizontal();
```

@tab C

```c
TODO
```

:::

![Flipped Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/flipped_horizontal.jpg)

---

- **Crop**

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Rect<int> rect = inspirecv::Rect<int>::Create(78, 41, 171, 171);
inspirecv::Image cropped = img.Crop(rect);
```

@tab C

```c
TODO
```

:::

![Cropped Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/cropped.jpg)

---

- **Padding**

::: code-tabs#shell

@tab C++

```cpp
int top = 50, bottom = 50, left = 50, right = 50;
inspirecv::Image padded = img.Pad(top, bottom, left, right, inspirecv::Color::Black);
```

@tab C

```c
TODO
```

:::

![Padded Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/padded.jpg)

---

- **Swap red and blue channels**

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image swapped = img.SwapRB();
```

@tab C

```c
TODO
```

:::

![Swapped Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/swapped.jpg)

---

- **Multiply**

::: code-tabs#shell

@tab C++

```cpp
double scale_factor = 0.5;
inspirecv::Image scaled = img.Mul(scale_factor);
```

@tab C

```c
TODO
```

:::

![Scaled Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/scaled.jpg)

---

- **Add**

::: code-tabs#shell

@tab C++

```cpp
double value = -175;
inspirecv::Image added = img.Add(value);
```

@tab C

```c
TODO
```

:::

![Added Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/added.jpg)

---

- **Affine transform**
    - Like warpAffine in OpenCV

Origin input is rotated 90 degree image, and the transform matrix is from face location:

![Rotated Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/rotated.jpg)

::: code-tabs#shell

@tab C++

```cpp
/**
 * Create a transform matrix from the following matrix
 * [[a11, a12, tx],
 *  [a21, a22, ty]]
 *
 * Face crop transform matrix
 * [[0.0, -1.37626, 261.127],
 *  [1.37626, 0.0, 85.1831]]
*/
float a11 = 0.0f;
float a12 = -1.37626f;
float a21 = 1.37626f;
float a22 = 0.0f;
float b1 = 261.127f;
float b2 = 85.1831f;

// Create a transform matrix: Face location transform matrix
inspirecv::TransformMatrix trans = inspirecv::TransformMatrix::Create(a11, a12, b1, a21, a22, b2);

// dst_width and dst_height is the size of the output image
int dst_width = 112;
int dst_height = 112;

// Apply affine transform
inspirecv::Image affine = rotated_90.WarpAffine(trans, dst_width, dst_height);
```

@tab C

```c
TODO
```

:::

![Affine Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/affine.jpg)

---


## Image Draw

Image draw is a core functionality of InspireCV. It provides a set of functions to draw on images.

- **Draw rectangle**

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Rect<int> new_rect = rect.Square(1.1f);  // Square and expand the rect
int thickness = 3;
draw_img.DrawRect(new_rect, inspirecv::Color::Green, thickness);
```

@tab C

```c
TODO
```

:::

![Draw Rectangle](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/draw_rect.jpg)

---

- **Draw circle**

::: code-tabs#shell

@tab C++

```cpp
std::vector<inspirecv::Point<int>> points = new_rect.As<int>().ToFourVertices();
for (auto& point : points) {
    draw_img.DrawCircle(point, 1, inspirecv::Color::Red, 5);
}
```

@tab C

```c
TODO
```

:::

![Draw Circle](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/draw_circle.jpg)

---

- **Draw Lines**

::: code-tabs#shell

@tab C++

```cpp
draw_img.DrawLine(points[0], points[1], inspirecv::Color::Cyan, 2);
draw_img.DrawLine(points[1], points[2], inspirecv::Color::Magenta, 2);
draw_img.DrawLine(points[2], points[3], inspirecv::Color::Pink, 2);
draw_img.DrawLine(points[3], points[0], inspirecv::Color::Yellow, 2);
```

@tab C

```c
TODO
```

:::

![Draw Lines](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/draw_line.jpg)

---

- **Fill**

::: code-tabs#shell

@tab C++

```cpp
draw_img.Fill(new_rect, inspirecv::Color::Purple);
```

@tab C

```c
TODO
```

:::

![Fill](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/fill_rect.jpg)

---

- **Reset**

::: code-tabs#shell

@tab C++

```cpp
// Reset image to gray
std::vector<uint8_t> gray_color(img.Width() * img.Height() * 3, 128);
img.Reset(img.Width(), img.Height(), 3, gray_color.data());
```

@tab C

```c
TODO
```

:::

![Reset](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/reset.jpg)


## Frame Process

To streamline image processing, we designed a frame processor that wraps around the input image, providing flexible support for frame sequences such as images or video streams. It integrates a processing pipeline with built-in image decoding (**BGR, RGB, BGRA, RGBA, YUV, NV12, NV21**), rotation, scaling, and affine transformations, while optimizing internal buffering for enhanced performance.

::: warning
**FrameProcess** is an InspireFace module and is not yet integrated into the InspireCV library.
:::

### Create Frame Processor

::: code-tabs#shell

@tab C++

```cpp
// BGR888 as raw data
inspirecv::Image raw = inspirecv::Image::Create("test_res/data/bulk/kun_cartoon_crop_r90.jpg", 3);
const uint8_t* buffer = raw.Data();

// You can also use other image format, like NV21, NV12, RGBA, RGB, BGR, BGRA
const uint8_t* buffer = ...;

// Create frame process
auto width = raw.Width();
auto height = raw.Height();
auto rotation_mode = inspirecv::ROTATION_90;
auto data_format = inspirecv::BGR;
inspirecv::FrameProcess frame_process = inspirecv::FrameProcess::Create(buffer, height, width, data_format, rotation_mode);
```

@tab C

```c
TODO
```

:::

Example of raw data:

![Resized Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/rotated.jpg)

### Pipeline

- Set preview size

::: code-tabs#shell

@tab C++

```cpp
// Set preview size
frame_process.SetPreviewSize(160);

// or

// Set preview scale
frame_process.SetPreviewScale(0.5f);
```

@tab C

```c
TODO
```

:::

- **Get transform image**
    - Will rotate and scale the image to the preview size

::: code-tabs#shell

@tab C++

```cpp
inspirecv::Image transform_img = frame_process.GetTransformImage();
```

@tab C

```c
TODO
```

:::

![Transform Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/transform_img.jpg)

---

- **Get affine processing image**

::: code-tabs#shell

@tab C++

```cpp
/** 
 * Face crop transform matrix
 * [[0.0, 0.726607, -61.8946],
 *  [-0.726607, 0.0, 189.737]]
*/

// Face crop transform matrix
float a11 = 0.0f;
float a12 = 0.726607f;
float a21 = -0.726607;
float a22 = 0.0f;
float b1 = -61.8946f;
float b2 = 189.737f;
inspirecv::TransformMatrix affine_matrix = inspirecv::TransformMatrix::Create(a11, a12, b1, a21, a22, b2);
int dst_width = 112;
int dst_height = 112;
inspirecv::Image affine_img = frame_process.ExecuteImageAffineProcessing(affine_matrix, dst_width, dst_height);
```

@tab C

```c
TODO
```

:::

![Affine Processing Image](https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/cv/affine_img.jpg)

## Performance Considerations

- The library uses Eigen3 for efficient matrix operations
- OKCV backend provides lightweight alternatives to OpenCV
- Operations are designed to minimize memory allocations
- Thread-safe operations for parallel processing

## Thread Safety

The library is designed to be thread-safe. You can use it in multi-threaded applications.

## Error Handling

The library uses error codes and exceptions to handle error conditions:

- Image loading/saving errors
- Invalid parameters
- Memory allocation failures
- Backend-specific errors

Errors can be caught using standard try-catch blocks:

::: code-tabs#shell

@tab C++

```cpp
try {
    Image img = Image::Create("nonexistent.jpg");
} catch (const std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
}
```

@tab C

```c
TODO
```

:::

