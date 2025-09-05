# Using InspireFace in Rockchip NPU

## How to Use the SDK

InspireFace-SDK already supports Rockchip's RKNPU and RGA technologies. Most of the basic interfaces of all InspireFace libraries are consistent with no differences, so you can refer to C/C++ and other related usage cases to quickly get started with the RK device-optimized version.

## API Differences

We provide several dedicated APIs for the RK version:

### RGA Related

RKRGA is an image processing acceleration engine provided by RK devices, which can provide acceleration for 2D image transformation processing using hardware advantages. We provide a series of interfaces for configuring RGA.

```c
/**
 * @brief Check whether RGA is enabled during compilation
 * @param status Pointer to the status variable that will be returned.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFQueryExpansiveHardwareRGACompileOption(HPInt32 enable);

/**
 * @brief Set the rockchip dma heap path
 * By default, we have already configured the DMA Heap address used by RGA on RK devices.
 * If you wish to customize this address, you can modify it through this API.
 * @param path The path to the rockchip dma heap
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFSetExpansiveHardwareRockchipDmaHeapPath(HPath path);

/**
 * @brief Query the rockchip dma heap path
 * @param path Pointer to a pre-allocated character array that will store the returned path.
 * The array should be at least 256 bytes in size.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFQueryExpansiveHardwareRockchipDmaHeapPath(HString path);

/**
 * @brief Enum for image processing backend.
 */
typedef enum HFImageProcessingBackend {
    HF_IMAGE_PROCESSING_CPU = 0,  ///< CPU backend(Default)
    HF_IMAGE_PROCESSING_RGA = 1,  ///< Rockchip RGA backend(Hardware support is mandatory)
} HFImageProcessingBackend;

/**
 * @brief Switch the image processing backend, must be called before HFCreateInspireFaceSession.
 * @param backend The image processing backend to be set.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFSwitchImageProcessingBackend(HFImageProcessingBackend backend);

/**
 * @brief Set the image process aligned width, must be called before HFCreateInspireFaceSession.
 * @param width The image process aligned width to be set.
 * @return HResult indicating the success or failure of the operation.
 * */
HYPER_CAPI_EXPORT extern HResult HFSetImageProcessAlignedWidth(HInt32 width);
```

