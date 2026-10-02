# Python 打包与原生库 {#python-package-and-native-libraries}

Python API 通过 `ctypes` 调用原生 SDK。从 CPU 切换到 TensorRT 或 Rockchip NPU 时，可在 [SDK 下载](./README.md#prebuilt-sdks)中获取对应的 **1.2.4 动态库**，也可以按目标设备自行构建。CoreML 需要源码构建。让 Python 加载这份库，或将它装进 wheel，并保持 Python 封装与原生 SDK 配套。

使用 CPU 时，运行 `python -m pip install inspireface opencv-python` 即可安装已发布的 **1.2.4.post3** 包，其中包含 **1.2.4** 原生库。本章介绍替换原生库和自行制作 wheel 的方法；现成的安装包见 [SDK 概述](./README.md#python-and-android-packages)。

| 需求 | 做法 |
| --- | --- |
| 开发时试用自己编译的原生库 | 设置 `INSPIREFACE_LIBRARY_PATH`，库文件可以放在安装包以外。 |
| 同时修改 Python 封装 | 以 editable 模式安装 `python/`，再指定原生库。 |
| 制作可直接安装的包 | 将原生库复制到包内对应平台目录，再构建 wheel。 |

## 准备原生 SDK 与 Python 封装 {#prepare-the-native-sdk-and-wrapper}

Python 需要**动态库**：Windows 使用 `libInspireFace.dll`，Linux 使用 `libInspireFace.so`，macOS 使用 `libInspireFace.dylib`。已经安装当前 PyPI 包，并准备好配套的 1.2.4 发布库时，可以直接进入[指定动态库](#select-or-replace-a-shared-library)步骤。

需要自行编译库或修改 Python 封装时，先完成[源码准备](./source.md)，再按 [Windows](./windows.md)、[Linux](./linux.md)、[macOS](./macos.md)、[NVIDIA](./nvidia.md) 或 [Rockchip](./rockchip.md) 章节编译，启用 `ISF_BUILD_SHARED_LIBS=ON`，并按下文准备源码封装。

Apple 新增的 Objective-C / Swift framework 用于原生应用接入。Python 仍然加载 **macOS 原始 dylib**，不使用 `InspireFace.xcframework`、`InspireFaceSwift.framework` 或 iOS 静态库。`build_macos_arm64.sh` 和 `build_macos_x86.sh` 会生成该动态库；arm64 CoreML 脚本生成的原始库是 `.a`，Python 应改用[自定义动态库构建](./macos.md#set-architecture-and-deployment-target)。

`python/version.txt` 由 CMake 配置阶段生成。在当前工作区编译过 SDK 后，这个文件就已经准备好了。复用其他位置构建的同版本 1.2.4 SDK 时，Python 版本文件只填写 `1.2.4`：

```bash
python -c "from pathlib import Path; Path('python/version.txt').write_text('1.2.4\n')"
```

SDK 根目录的 `version.txt` 带有 `InspireFace Version: 1.2.4` 这样的标签，不要把标签一起复制到 Python 版本文件中。Python 源码版本应与动态库匹配；下文的 Windows wheel 脚本会自动准备这个文件。

在 InspireFace 仓库根目录创建 Python 环境并安装封装：

::: tabs #python-build-shell

@tab Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ./python
```

@tab Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ./python
```

:::

editable 安装会直接读取工作区中的 Python 代码，不会编译原生 SDK。首次 import 之前，需要先选好原生库。

## 指定或替换动态库 {#select-or-replace-a-shared-library}

Linux 下，指定 `.so` 文件的完整路径：

```bash
export INSPIREFACE_LIBRARY_PATH=/absolute/path/to/libInspireFace.so
python -c 'import inspireface as isf; print(isf.version())'
```

macOS 下使用 `.dylib` 路径：

```bash
export INSPIREFACE_LIBRARY_PATH=/absolute/path/to/libInspireFace.dylib
python -c 'import inspireface as isf; print(isf.version())'
```

Windows 在 PowerShell 中使用 `.dll` 路径：

```powershell
$env:INSPIREFACE_LIBRARY_PATH = 'C:\sdk\InspireFace\lib\libInspireFace.dll'
python -c "import inspireface as isf; print(isf.version())"
```

`INSPIREFACE_LIBRARY_PATH` 需要指向**文件**，不能只填目录。文件不存在时抛出 `RuntimeError`；动态库加载失败时抛出 `ImportError`，并附带底层加载错误。设置了这个变量后，加载失败会直接报错，不会回退到包内的库。Linux/macOS 运行 `unset INSPIREFACE_LIBRARY_PATH`，PowerShell 运行 `Remove-Item Env:INSPIREFACE_LIBRARY_PATH -ErrorAction SilentlyContinue`，即可恢复使用包内的库。

::: warning 替换动态库后重启进程
请在 import `inspireface` 之前设置路径。替换库文件或切换构建版本后，重启 Python 进程或 notebook kernel。Python 封装与原生库应保持相同的 SDK 版本，旧库可能缺少封装需要的符号。
:::

Python 进程与原生库的架构必须一致。例如，Apple Silicon Mac 上通过 Rosetta 运行的 x86_64 Python，需要加载 x86_64 库。

### 检查原生依赖 {#check-native-dependencies}

在目标系统上检查动态库。Linux 使用：

```bash
file /absolute/path/to/libInspireFace.so
ldd /absolute/path/to/libInspireFace.so
```

macOS 使用：

```bash
file /absolute/path/to/libInspireFace.dylib
otool -L /absolute/path/to/libInspireFace.dylib
```

Windows 在 Visual Studio Developer PowerShell 中执行：

```powershell
dumpbin /DEPENDENTS C:\sdk\InspireFace\lib\libInspireFace.dll
```

发布的 CPU DLL 需要 [Microsoft Visual C++ v14 x64 运行库](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist)，CPU 推理依赖已经编入 DLL，无需另外部署推理库。

先补齐缺失的运行库，再运行 Python。TensorRT/CUDA、Rockchip 构建还需要在目标设备上安装对应后端的运行环境，单独复制 `libInspireFace.so` 不会安装这些依赖。具体配置见对应平台章节。

## 将动态库装进 wheel {#put-the-library-into-a-wheel}

包内的动态库位于 `python/inspireface/modules/core/libs/`。目录使用 `x64`、`arm64`，Linux wheel 的平台标签则使用 `x86_64`、`aarch64`。

| Target | Package directory | Library filename |
| --- | --- | --- |
| Windows x64 | `libs/windows/x64/` | `libInspireFace.dll` |
| Linux x86_64 | `libs/linux/x64/` | `libInspireFace.so` |
| Linux aarch64 | `libs/linux/arm64/` | `libInspireFace.so` |
| macOS Apple Silicon | `libs/darwin/arm64/` | `libInspireFace.dylib` |
| macOS Intel | `libs/darwin/x64/` | `libInspireFace.dylib` |

以上包内路径对应 64 位 Python 进程。按本文为 Rockchip 打包时，使用 Linux aarch64 SDK，例如 RK356x/RK3588 构建。

下面以 **Linux x86_64** 动态库为例。在仓库根目录、已激活的 Python 环境中执行。使用新的临时打包目录，可以避免上一次 wheel 构建的文件混入结果。

```bash
if ! test -f python/version.txt; then
  echo "Missing python/version.txt: build the SDK or prepare its matching version number first." >&2
  exit 1
fi
python -m pip install build

export INSPIRE_FACE_TARGET_PLATFORM=linux
export INSPIRE_FACE_TARGET_ARCH=x64
export INSPIRE_FACE_TARGET_AARCH_MAPPING=linux_x86_64
ISF_NATIVE=/absolute/path/to/libInspireFace.so

ISF_WHEEL_STAGE="$(mktemp -d)"
cp -R python/inspireface "$ISF_WHEEL_STAGE/"
cp python/{setup.py,pyproject.toml,README.md,version.txt,post} "$ISF_WHEEL_STAGE/"
ISF_BUNDLE_DIR="$ISF_WHEEL_STAGE/inspireface/modules/core/libs/$INSPIRE_FACE_TARGET_PLATFORM/$INSPIRE_FACE_TARGET_ARCH"
mkdir -p "$ISF_BUNDLE_DIR"
cp "$ISF_NATIVE" "$ISF_BUNDLE_DIR/libInspireFace.so"

python -m build --wheel --outdir "$PWD/python/dist" "$ISF_WHEEL_STAGE"
```

Windows 使用下文的[专用打包脚本](#windows-wheel)。Linux aarch64 改用 `arm64` 和 `linux_aarch64`。macOS 请按下文的[完整打包示例](#package-the-current-macos-sdk)操作，并显式设置最低系统版本标签。

wheel 的版本号由 `python/version.txt` 与 `python/post` 中的后缀拼接而成。当前源码使用 `1.2.4` 和 `.post3`，生成 `inspireface-1.2.4.post3-py3-none-linux_x86_64.whl`；原生 SDK 的版本号仍为 `1.2.4`。

### 选择打包目录与 wheel 标签 {#choose-the-directory-and-wheel-tag}

三个打包变量各自控制不同的部分：

| Variable | 作用 | Example |
| --- | --- | --- |
| `INSPIRE_FACE_TARGET_PLATFORM` | 选择装入包内的系统目录 | `windows`、`linux`、`darwin` |
| `INSPIRE_FACE_TARGET_ARCH` | 选择装入包内的架构目录 | `x64`、`arm64` |
| `INSPIRE_FACE_TARGET_AARCH_MAPPING` | 写入 wheel 的平台标签 | `win_amd64`、`linux_x86_64`、`manylinux2014_aarch64`、`macosx_11_0_arm64` |

未设置时，`setup.py` 会按构建主机选择目录和标签。Linux 默认标签为 `manylinux2014`；仅在本机编译、没有检查 manylinux 兼容性的库，更适合使用上面的 `linux_x86_64` 或 `linux_aarch64` 标签。需要分发 manylinux wheel 时，应在对应兼容基线的环境中构建，并检查外部依赖。

1.2.4 封装生成的 wheel 标签为 `py3-none-<platform>`：`ctypes` 没有 CPython 扩展 ABI 依赖，但包中带有原生库，仍然区分系统和架构。包声明要求 Python 3.7 或更新版本。修改标签或文件后缀，不会改变库的 CPU 架构、libc 要求或后端依赖。

原生库已经为目标平台编译好后，可以在其他主机上打包。此时请明确设置三个变量，并在实际目标设备上测试 wheel。`INSPIREFACE_LIBRARY_PATH` 只控制运行时加载，**不会**改变 `setup.py` 收进 wheel 的库文件。

### 构建 Windows x64 wheel {#windows-wheel}

常规 CPU 使用直接安装 PyPI 包即可。需要分发修改后的 SDK 时，先准备 [Windows 构建环境](./windows.md)，再使用 x64 Python，在仓库根目录执行：

```powershell
.\command\build_wheel_windows.ps1 -PythonExecutable python
```

使用 CMake 4 时，先按 [Windows 构建选项](./windows.md#build-options)传入 policy 兼容设置，生成 SDK 后再用下面的 `-SdkDirectory` 打包；wheel 脚本不会向 CMake 传递这项设置。

脚本会构建 Release CPU 动态库，并打成 `py3-none-win_amd64` wheel。默认跳过原生测试；需要同时测试时加上 `-TestNative`。已有编译完成的 SDK 时，可以直接复用安装目录：

```powershell
.\command\build_wheel_windows.ps1 -PythonExecutable python `
  -SdkDirectory 'C:\sdk\inspireface-windows-x64-1.2.4'
```

`-SdkDirectory` 指向包含 `version.txt` 和 `InspireFace/lib/libInspireFace.dll` 的根目录。这种方式只需要 Python，不会调用 C++ 编译器；不要同时传入 `-TestNative`、`-BuildDirectory` 或 `-InspireCVSource`。

脚本会检查 SDK 版本、x64 PE 格式、Release 运行库依赖和 wheel 内容；Debug DLL 或依赖额外后端 DLL 的构建不会被打包。打包使用临时目录，不会改动源码中已有的包内库。

当前输出为 `python/dist/inspireface-1.2.4.post3-py3-none-win_amd64.whl`，同时生成记录 DLL 依赖与 SHA-256 的 `.manifest.json`。可用 `-OutputDirectory` 更换输出目录；已有同名 wheel 时，只有加上 `-Force` 才会覆盖。

在新环境中安装并检查：

```powershell
python -m venv .venv-wheel-check
.\.venv-wheel-check\Scripts\python.exe -m pip install python/dist/inspireface-1.2.4.post3-py3-none-win_amd64.whl
Remove-Item Env:INSPIREFACE_LIBRARY_PATH -ErrorAction SilentlyContinue
Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
.\.venv-wheel-check\Scripts\python.exe -I -c "import inspireface as isf; print(isf.__version__); print(isf.version()); print(isf.diagnostic_info())"
```

再使用这个环境的 Python，配合本地模型运行[完整检测示例](../using-with/python.md#detection-script)，确认推理结果。wheel 自带 CPU DLL，模型包需要另外准备，目标机器还需安装 x64 Visual C++ 运行库。

### 打包当前 macOS SDK {#package-the-current-macos-sdk}

先获取 [Develop 版本源码](./source.md#develop-source)。下面的完整示例面向 Apple Silicon，以 macOS 14.0 为最低版本构建 CPU 动态库，再使用对应的 wheel 标签打包。请在已激活的 Python 环境中，从仓库根目录运行。发布前检查命令输出中的架构、最低系统版本和依赖。

<details>
<summary>构建并打包 arm64 macOS wheel</summary>

```bash
MACOSX_DEPLOYMENT_TARGET=14.0 VERSION=1.2.4 \
  bash command/build_macos_arm64.sh --jobs 4

ISF_APPLE_SDK="$PWD/build/inspireface-macos-apple-silicon-arm64-1.2.4"
ISF_NATIVE="$ISF_APPLE_SDK/InspireFace/lib/libInspireFace.dylib"
xcrun lipo -info "$ISF_NATIVE"
xcrun vtool -show-build "$ISF_NATIVE"
otool -L "$ISF_NATIVE"
python -c "from pathlib import Path; Path('python/version.txt').write_text('1.2.4\n')"

python -m pip install build
export INSPIRE_FACE_TARGET_PLATFORM=darwin
export INSPIRE_FACE_TARGET_ARCH=arm64
export INSPIRE_FACE_TARGET_AARCH_MAPPING=macosx_14_0_arm64

ISF_WHEEL_STAGE="$(mktemp -d)"
cp -R python/inspireface "$ISF_WHEEL_STAGE/"
cp python/{setup.py,pyproject.toml,README.md,version.txt,post} "$ISF_WHEEL_STAGE/"
ISF_BUNDLE_DIR="$ISF_WHEEL_STAGE/inspireface/modules/core/libs/darwin/arm64"
mkdir -p "$ISF_BUNDLE_DIR"
cp "$ISF_NATIVE" "$ISF_BUNDLE_DIR/libInspireFace.dylib"
python -m build --wheel --outdir "$PWD/python/dist" "$ISF_WHEEL_STAGE"
```

</details>

使用当前的 `.post3` 后缀时，输出为 `inspireface-1.2.4.post3-py3-none-macosx_14_0_arm64.whl`。Intel 改用 `build_macos_x86.sh` 及其 `inspireface-macos-intel-x86-64-1.2.4` 输出目录，包内目录和目标架构变量使用 `x64`，标签使用匹配的 `macosx_<major>_<minor>_x86_64`。构建时同样应显式设置最低系统版本。

复用已有 Apple XCFramework 包时，从 `SDKs/macosx-arm64/InspireFace/lib/` 或 `SDKs/macosx-x86_64/InspireFace/lib/` 中取原始 dylib，并使用同一 slice 对应的版本号。两种架构分别打 wheel；把 XCFramework 放进 Python 包并不会让 wheel 自动支持两种架构。

::: warning wheel 标签要与动态库匹配
`setup.py` 默认使用 `macosx_11_0_arm64` 或 `macosx_12_0_x86_64`，不会读取二进制中的最低系统版本。请按实际构建设置 `INSPIRE_FACE_TARGET_AARCH_MAPPING`，不要给要求较新系统的动态库填较旧的标签。当前 Apple CI 的 arm64 目标是 macOS 14.0，x86_64 目标是 macOS 15.0。
:::

arm64 CoreML 打包前，先按 [CoreML 动态库 CMake 配置](./macos.md#set-architecture-and-deployment-target)构建，将其 `install/InspireFace/lib/libInspireFace.dylib` 用作上面的 `ISF_NATIVE`。最低系统版本、架构和版本文件应一起匹配，CoreML 推理还需要部署 Apple 模型包。

### 检查 wheel 内容 {#inspect-the-wheel}

将下面的文件名替换为刚生成的 wheel，检查包中是否包含预期的原生库与平台标签：

```bash
python -m zipfile -l python/dist/inspireface-1.2.4.post3-py3-none-linux_x86_64.whl
```

找到以 `inspireface/modules/core/libs/linux/x64/libInspireFace.so` 结尾的条目；在 wheel 中，它前面可能带有 `.data/purelib/` 前缀。模型包与 wheel 分开发放，部署时还需要为应用准备对应模型包。

## 安装并确认实际加载的库 {#install-and-verify-the-packaged-library}

Windows 使用 [Windows wheel 打包](#windows-wheel)中的检查命令，下面的 shell 命令用于 Linux/macOS。使用新环境检查安装结果，避免 editable 封装遮住已安装的包。首次 import 前，清除本地库覆盖路径及指向源码的 `PYTHONPATH`：

```bash
python3 -m venv .venv-wheel-check
source .venv-wheel-check/bin/activate
python -m pip install python/dist/inspireface-1.2.4.post3-py3-none-linux_x86_64.whl
unset INSPIREFACE_LIBRARY_PATH
unset PYTHONPATH
```

在仓库根目录或 `python/` 以外的目录运行：

```python
import platform
import sys
import inspireface as isf
from inspireface.modules.core import native

print("Python:", sys.executable)
print("Architecture:", platform.machine())
print("Wrapper:", isf.__version__)
print("Native:", isf.version())
print("Package:", isf.__file__)
print("Loaded library:", native._LIBRARY_FILENAME)
```

`native._LIBRARY_FILENAME` 是 1.2.4 封装的内部诊断值，这里用于确认实际加载的文件；业务代码应使用公开 API。测试 wheel 自带的库时，打印出的包路径和库路径都应位于 `.venv-wheel-check` 中。

最后，用本地模型包运行一次 [Python 检测示例](../using-with/python.md#detection-script)。成功 import 可以确认库已加载；完成检测还能检查后端、模型和图像处理链路。

## 仓库已有的打包脚本 {#existing-packaging-scripts}

仓库也提供了先编译 SDK、再将动态库复制到 Python 包中的脚本：

| Target | 在仓库根目录执行 |
| --- | --- |
| Windows x64 CPU | `.\command\build_wheel_windows.ps1 -PythonExecutable python` |
| Linux x86_64, manylinux2014 | `docker compose run --rm build-manylinux2014-x86` |
| Linux aarch64, manylinux2014 | `docker compose run --rm build-manylinux2014-aarch64` |

Linux 打包在仓库提供的 Docker 环境中执行，aarch64 容器需要 ARM64 主机或配置好的模拟环境。脚本会重新编译原生库，并将 wheel 写入 `python/dist/`。已有编译完成的 TensorRT、CoreML 或 Rockchip 库时，直接使用上面的独立打包步骤即可。

macOS 使用本文的 [Apple SDK 打包步骤](#package-the-current-macos-sdk)。现有 `build_wheel_macos_arm64.sh` 和 `build_wheel_macos_x86.sh` 仍然单独调用 CMake，没有使用新的 Apple 构建脚本，也没有显式指定目标架构和最低系统版本，wheel 标签沿用 `setup.py` 默认值。仅凭脚本文件名无法确认产物的兼容范围。

目录选择、wheel 标签和运行时覆盖路径的实现分别位于 [`python/setup.py`](https://github.com/HyperInspire/InspireFace/blob/41cc84d56e4cb11a03088cf8f08935eab30ae336/python/setup.py)、[`_library_path.py`](https://github.com/HyperInspire/InspireFace/blob/41cc84d56e4cb11a03088cf8f08935eab30ae336/python/inspireface/modules/core/_library_path.py) 和 [`_native_loader.py`](https://github.com/HyperInspire/InspireFace/blob/41cc84d56e4cb11a03088cf8f08935eab30ae336/python/inspireface/modules/core/_native_loader.py)。
