# Using InspireFace in Python on Rockchip Linux

If you want to run InspireFace on a Rockchip device with a Linux system and get hardware acceleration support such as **Rockchip NPU** and **Rockchip RGA**, you need to manually create a Python version installation package.

::: warning
If you do not need the support of device acceleration such as NPU and RGA, you can directly use pip to install the regular **CPU** version. This will be very easy, but you will not be able to leverage the performance advantages of the device, and the computation **speed will be slow**.
:::

Before creating the installation package, ensure that the following configurations are complete:

  * A device or virtual machine with the target architecture
      * Docker container (Aarch64) or a physical Rockchip device (such as RK3566, RK3568, or RK3588)
  * Python is installed on the device or virtual machine
  * **pip** is installed on the device or virtual machine
      * Requires toolkits such as **setuptools** and **wheel**

## Get Resources

For convenience, you can download the release installation file corresponding to your device from InspireFace's [Releases Page](https://github.com/HyperInspire/InspireFace/releases). Taking the **RK356X/RK3588** device as an example, select the latest installation package **inspireface-linux-aarch64-rk356x-rk3588-x.y.z.zip**.

::: tip
The sdk under the release page is continuously updated. It is recommended that you choose the latest version.
:::

By decompressing it, you can see the files in the lib folder:

  * **libInspireFace.so**
  * **librknnrt.so**

When you have successfully obtained these two files, you can start creating the Python version installation package. You can also obtain these two files by compiling the source code.

## Create Python Installation Package

Before creating the Python installation package, we need to understand the running mechanism of the Python version of InspireFace. In fact, we are just using Python's **ctypes** library to call the functions in the **libInspireFace.so** dynamic library to implement a layer of native call wrapper code to rely on the underlying C/C++ version. Therefore, in essence, the content of the Python version and the C/C++ version is highly consistent.

The source code location for the Python version is: [InspireFace Python](https://www.google.com/search?q=https://github.com/HyperInspire/InspireFace/tree/master/python)

### Step 1: Pull Source Code

First, pull the InspireFace source code on the **host device**. You can also operate directly on a virtual machine or RK device (if git is installed on the RK device):

```bash
git clone https://github.com/HyperInspire/InspireFace.git
```

Navigate to the `InspireFace/python` directory:

```bash
cd InspireFace/python
```

The python folder directory contains the core source code folder and some usage examples:

```bash
InspireFace/python/
├── README.md
├── inspireface
│   ├── __init__.py
│   ├── modules
│   │   ├── __init__.py
│   │   ├── core/
│   │   ├── inspireface.py
│   │   └── utils
│   └── param.py
├── pull_models.py
├── read_nv21.py
├── sample_face_comparison.py
├── sample_face_detection.py
├── sample_face_recognition.py
├── sample_face_track_from_video.py
├── sample_feature_hub.py
├── sample_system_resource_statistics.py
├── sample_video.py
├── setup.py
├── test/
├── test.db
├── test.py
├── test.sh
└── version.txt.in
```

### Step 2: Install rknnrt on the RK Device

InspireFace depends on the rknn-runtime library. You can obtain the `librknnrt.so` file through the previous steps. You need to transfer this file to your **RK device** and install it in the system directory:

```bash
sudo cp librknnrt.so /usr/local/lib
sudo ldconfig
```

**Note: This step must be performed on the RK device\!**

The example places the dynamic library in the `/usr/local/lib` directory, which is a common path in Linux systems. If your device has other configurable dynamic library directories, you can use them directly. This depends on the factory configuration of your RK device manufacturer or your custom configuration.

### Step 3: Create Python Installation Package

This step can be performed on an Aarch64 architecture virtual machine or directly on an **RK device**. The example here uses an **RK356X device**.

First, we need to move the `inspireface/python` directory from the host device to the virtual machine or **RK device**. If you already have this project in the target system, you can skip this step.

  * Enter the python directory:

    ```bash
    cd python/
    ```

  * Create the corresponding architecture directory:

    ```bash
    mkdir -p inspireface/modules/core/libs/linux/arm64/
    ```

  * Copy the libInspireFace.so file to the architecture directory:

    ```bash
    cp YOUR_PATH/inspireface-linux-aarch64-rk356x-rk3588/InspireFace/lib/libInspireFace.so inspireface/modules/core/libs/linux/arm64/
    ```

    And ensure the copy is successful:

    ```bash
    inspireface/modules/core/libs/linux/arm64/
    └── libInspireFace.so
    ```

  * Create the wheel installation package:

    ```bash
    # Execute the python command directly
    INSPIRE_FACE_TARGET_AARCH_MAPPING=linux_aarch64 python3 setup.py bdist_wheel
    ```

    After execution, you will find the corresponding wheel file in the `dist` directory. The file name will correspond to the version number of your current environment:

      * dist/inspireface-0.0.0-cp38-cp38-linux\_aarch64.whl

  * Install inspireface:

    You can distribute this whl file to other RK devices for installation:

    ```bash
    pip install dist/inspireface-0.0.0-cp38-cp38-linux_aarch64.whl
    ```

Installation is successful at this step.

### Step 4: Test SDK

After successful installation, we need to test and verify the usability of the SDK. Enter the python shell or write a python program to call inspireface directly. If you are using an RK3566 or RK3568 device, you need to load the **Gundam\_RK356X** model. If it is an RK3588, you need to load **Gundam\_RK3588**.

This step is very important and needs to be called globally. It only needs to be called once:

```python
import inspireface as isf

# This step will automatically download the model on first use
isf.reload("Gundam_RK356X")
```

After successful loading, information will be printed:

```bash
Rockchip dma heap configured path: /dev/dma_heap/system-uncached-dma32
== Load Gundam_RK356X-t3, Version: 3.2, Release: 2025-02-20 ==
Successfully loaded similarity converter config:
 	 threshold: 0.320000
 	 middle_score: 0.600000
 	 steepness: 10.000000
 	 output_min: 0.020000
 	 output_max: 1.000000
Successfully reloaded resources
True
```

Continue to create a Face Session to verify if the algorithm functions are available:

```python
# Configure a face quality detection function
opt = isf.HF_ENABLE_QUALITY
session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)
```

## More Usage Examples

After completing the above steps, the task of installing the InspireFace-Rockchip version in the Python environment is complete. If you want to know more usage cases of the Python API, you can check: [InspireFace Python](https://www.google.com/search?q=https://github.com/HyperInspire/InspireFace/tree/master/python)