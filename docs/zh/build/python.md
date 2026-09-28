# Python 打包与原生库 {#python-package-and-native-libraries}

Python API 通过 `ctypes` 调用原生 SDK。要从 CPU 切换到 TensorRT、CoreML 或 Rockchip NPU，先编译对应的动态库，再让 Python 加载它，或把它装进 wheel。Python 封装与原生库应来自同一份 SDK 源码版本。

本文使用 **1.2.4 源码中的 Python 封装**。已发布的预编译包及下载地址见 [SDK 概述](./README.md)。

| 需求 | 做法 |
| --- | --- |
| 开发时试用自己编译的原生库 | 设置 `INSPIREFACE_LIBRARY_PATH`，库文件可以放在安装包以外。 |
| 同时修改 Python 封装 | 以 editable 模式安装 `python/`，再指定原生库。 |
| 制作可直接安装的包 | 将原生库复制到包内对应平台目录，再构建 wheel。 |

## 准备原生 SDK 与 Python 封装 {#prepare-the-native-sdk-and-wrapper}

完成[源码准备](./source.md)，再按 [Linux](./linux.md)、[macOS](./macos.md)、[NVIDIA](./nvidia.md) 或 [Rockchip](./rockchip.md) 章节编译。Python 需要设置 `ISF_BUILD_SHARED_LIBS=ON` 生成的**动态库**：Linux 使用 `libInspireFace.so`，macOS 使用 `libInspireFace.dylib`。

`python/version.txt` 由 CMake 配置阶段生成。在当前工作区编译过 SDK 后，这个文件就已经准备好了。如果复用的是在其他位置构建的同版本 SDK，请在安装或打包 Python 封装前，先复制 SDK 随附的 `version.txt`：

```bash
cp /absolute/path/to/sdk/version.txt python/version.txt
```

版本文件应与动态库来自同一份 SDK，Python 源码版本也要与之匹配。

在 InspireFace 仓库根目录创建 Python 环境并安装封装：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ./python
```

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

`INSPIREFACE_LIBRARY_PATH` 需要指向**文件**，不能只填目录。文件不存在时抛出 `RuntimeError`；动态库加载失败时抛出 `ImportError`，并附带底层加载错误。设置了这个变量后，加载失败会直接报错，不会回退到包内的库。运行 `unset INSPIREFACE_LIBRARY_PATH` 后即可恢复使用包内的库。

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

先补齐缺失的运行库，再运行 Python。TensorRT/CUDA、Rockchip 构建还需要在目标设备上安装对应后端的运行环境，单独复制 `libInspireFace.so` 不会安装这些依赖。具体配置见对应平台章节。

## 将动态库装进 wheel {#put-the-library-into-a-wheel}

包内的动态库位于 `python/inspireface/modules/core/libs/`。目录使用 `x64`、`arm64`，Linux wheel 的平台标签则使用 `x86_64`、`aarch64`。

| Target | Package directory | Library filename |
| --- | --- | --- |
| Linux x86_64 | `libs/linux/x64/` | `libInspireFace.so` |
| Linux aarch64 | `libs/linux/arm64/` | `libInspireFace.so` |
| macOS Apple Silicon | `libs/darwin/arm64/` | `libInspireFace.dylib` |
| macOS Intel | `libs/darwin/x64/` | `libInspireFace.dylib` |

以上包内路径对应 64 位 Python 进程。按本文为 Rockchip 打包时，使用 Linux aarch64 SDK，例如 RK356x/RK3588 构建。

下面以 **Linux x86_64** 动态库为例。在仓库根目录、已激活的 Python 环境中执行。使用新的临时打包目录，可以避免上一次 wheel 构建的文件混入结果。

```bash
if ! test -f python/version.txt; then
  echo "Missing python/version.txt: build the SDK or copy its matching version file first." >&2
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

Linux aarch64 改用 `arm64` 和 `linux_aarch64`。macOS 改用 `darwin`、对应架构及 macOS wheel 标签，同时将复制命令中的源文件和目标文件改为 `libInspireFace.dylib`。

wheel 的版本号由 `python/version.txt` 与 `python/post` 中的后缀拼接而成。例如，版本为 `1.2.4`、后缀为空时，会生成 `inspireface-1.2.4-py3-none-linux_x86_64.whl`。

### 选择打包目录与 wheel 标签 {#choose-the-directory-and-wheel-tag}

三个打包变量各自控制不同的部分：

| Variable | 作用 | Example |
| --- | --- | --- |
| `INSPIRE_FACE_TARGET_PLATFORM` | 选择装入包内的系统目录 | `linux`、`darwin` |
| `INSPIRE_FACE_TARGET_ARCH` | 选择装入包内的架构目录 | `x64`、`arm64` |
| `INSPIRE_FACE_TARGET_AARCH_MAPPING` | 写入 wheel 的平台标签 | `linux_x86_64`、`manylinux2014_aarch64`、`macosx_11_0_arm64` |

未设置时，`setup.py` 会按构建主机选择目录和标签。Linux 默认标签为 `manylinux2014`；仅在本机编译、没有检查 manylinux 兼容性的库，更适合使用上面的 `linux_x86_64` 或 `linux_aarch64` 标签。需要分发 manylinux wheel 时，应在对应兼容基线的环境中构建，并检查外部依赖。

1.2.4 封装生成的 wheel 标签为 `py3-none-<platform>`：`ctypes` 没有 CPython 扩展 ABI 依赖，但包中带有原生库，仍然区分系统和架构。包声明要求 Python 3.7 或更新版本。修改标签或文件后缀，不会改变库的 CPU 架构、libc 要求或后端依赖。

原生库已经为目标平台编译好后，可以在其他主机上打包。此时请明确设置三个变量，并在实际目标设备上测试 wheel。`INSPIREFACE_LIBRARY_PATH` 只控制运行时加载，**不会**改变 `setup.py` 收进 wheel 的库文件。

### 检查 wheel 内容 {#inspect-the-wheel}

将下面的文件名替换为刚生成的 wheel，检查包中是否包含预期的原生库与平台标签：

```bash
python -m zipfile -l python/dist/inspireface-1.2.4-py3-none-linux_x86_64.whl
```

找到以 `inspireface/modules/core/libs/linux/x64/libInspireFace.so` 结尾的条目；在 wheel 中，它前面可能带有 `.data/purelib/` 前缀。模型包与 wheel 分开发放，部署时还需要为应用准备对应模型包。

## 安装并确认实际加载的库 {#install-and-verify-the-packaged-library}

使用新环境检查安装结果，避免 editable 封装遮住已安装的包。首次 import 前，清除本地库覆盖路径及指向源码的 `PYTHONPATH`：

```bash
python3 -m venv .venv-wheel-check
source .venv-wheel-check/bin/activate
python -m pip install python/dist/inspireface-1.2.4-py3-none-linux_x86_64.whl
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
| Linux x86_64, manylinux2014 | `docker compose run --rm build-manylinux2014-x86` |
| Linux aarch64, manylinux2014 | `docker compose run --rm build-manylinux2014-aarch64` |
| macOS Apple Silicon | `bash command/build_wheel_macos_arm64.sh` |
| macOS Intel | `bash command/build_wheel_macos_x86.sh` |

Linux 打包在仓库提供的 Docker 环境中执行，aarch64 容器需要 ARM64 主机或配置好的模拟环境。macOS 脚本在对应架构的 Mac 上运行。脚本会重新编译原生库，并将 wheel 写入 `python/dist/`。已有编译完成的 TensorRT、CoreML 或 Rockchip 库时，直接使用上面的独立打包步骤即可。

目录选择、wheel 标签和运行时覆盖路径的实现分别位于 [`python/setup.py`](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/python/setup.py)、[`_library_path.py`](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/python/inspireface/modules/core/_library_path.py) 和 [`_native_loader.py`](https://github.com/HyperInspire/InspireFace/blob/1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9/python/inspireface/modules/core/_native_loader.py)。
