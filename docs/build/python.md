# Python package and native libraries {#python-package-and-native-libraries}

The Python API uses `ctypes` to call the native SDK. To switch from CPU to TensorRT, CoreML or Rockchip NPU, build the matching shared library first, then select it from Python or include it in a wheel. The wrapper and native library should come from the same SDK revision.

This page describes the **1.2.4 source wrapper**. Published packages and their download sources are listed in the [SDK overview](./README.md).

| What you need | Approach |
| --- | --- |
| Try a native build during development | Set `INSPIREFACE_LIBRARY_PATH`; keep the library outside the installed package. |
| Edit the Python wrapper as well | Install `python/` in editable mode and select your native library. |
| Distribute a ready-to-install package | Copy the library into the package's platform directory and build a wheel. |

## Prepare the native SDK and wrapper {#prepare-the-native-sdk-and-wrapper}

Complete [source preparation](./source.md), then follow the build chapter for [Linux](./linux.md), [macOS](./macos.md), [NVIDIA](./nvidia.md) or [Rockchip](./rockchip.md). Python needs a **shared library**, built with `ISF_BUILD_SHARED_LIBS=ON`: `libInspireFace.so` on Linux or `libInspireFace.dylib` on macOS.

On Apple platforms, the new Objective-C / Swift frameworks are an additional integration route for native apps. Python still loads the **raw macOS dylib**, not `InspireFace.xcframework`, `InspireFaceSwift.framework` or an iOS static archive. `build_macos_arm64.sh` and `build_macos_x86.sh` produce that dylib. The arm64 CoreML script produces a raw `.a`; use the [custom shared build](./macos.md#set-architecture-and-deployment-target) for Python instead.

The CMake configuration generates `python/version.txt`. If you built the SDK in this checkout, it is already in place. If you are reusing a matching SDK built elsewhere, copy its accompanying `version.txt` into this checkout before installing or packaging the wrapper:

```bash
cp /absolute/path/to/sdk/version.txt python/version.txt
```

Use the file from the same SDK as the native library; keep the Python source revision matched to that SDK.

From the InspireFace repository root, create a Python environment and install the wrapper:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ./python
```

An editable installation reads the wrapper from your checkout. It does not compile the native SDK. Choose the native library before the first import.

## Select or replace a shared library {#select-or-replace-a-shared-library}

For Linux, point to the complete `.so` file path:

```bash
export INSPIREFACE_LIBRARY_PATH=/absolute/path/to/libInspireFace.so
python -c 'import inspireface as isf; print(isf.version())'
```

On macOS, use the `.dylib` path:

```bash
export INSPIREFACE_LIBRARY_PATH=/absolute/path/to/libInspireFace.dylib
python -c 'import inspireface as isf; print(isf.version())'
```

`INSPIREFACE_LIBRARY_PATH` accepts a **file**, not a directory. A missing file raises `RuntimeError`; a library that cannot be loaded raises `ImportError` with the loader error. When an override is set, loading fails directly instead of falling back to the bundled library. Clear it with `unset INSPIREFACE_LIBRARY_PATH` to use the package's library again.

::: warning Restart after replacing a library
Set the path before importing `inspireface`. After replacing the file or selecting another build, restart the Python process or notebook kernel. Keep the wrapper and native library on the same SDK revision; an older library may lack symbols needed by the wrapper.
:::

The Python process and the native library must have the same architecture. For example, x86_64 Python under Rosetta needs an x86_64 library even on an Apple Silicon Mac.

### Check native dependencies {#check-native-dependencies}

Check the library on the target system. On Linux:

```bash
file /absolute/path/to/libInspireFace.so
ldd /absolute/path/to/libInspireFace.so
```

On macOS:

```bash
file /absolute/path/to/libInspireFace.dylib
otool -L /absolute/path/to/libInspireFace.dylib
```

Resolve any missing runtime libraries before importing Python. TensorRT/CUDA and Rockchip builds also need the backend runtime installed on the target; copying `libInspireFace.so` alone does not install those dependencies. See the corresponding platform chapter for runtime setup.

## Put the library into a wheel {#put-the-library-into-a-wheel}

The bundled library lives under `python/inspireface/modules/core/libs/`. The directory names use `x64` and `arm64`, while wheel tags use `x86_64` and `aarch64` on Linux.

| Target | Package directory | Library filename |
| --- | --- | --- |
| Linux x86_64 | `libs/linux/x64/` | `libInspireFace.so` |
| Linux aarch64 | `libs/linux/arm64/` | `libInspireFace.so` |
| macOS Apple Silicon | `libs/darwin/arm64/` | `libInspireFace.dylib` |
| macOS Intel | `libs/darwin/x64/` | `libInspireFace.dylib` |

These package paths cover 64-bit Python processes. For Rockchip packaging on this page, use the Linux aarch64 SDK, such as the RK356x/RK3588 build.

The following commands package a **Linux x86_64** library. Run them from the repository root in the activated environment. A fresh staging directory keeps files from an earlier wheel build out of the result.

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

For Linux aarch64, use `arm64` and `linux_aarch64`. For macOS, follow the [complete packaging example](#package-the-current-macos-sdk) below, including its explicit deployment tag.

The wheel version comes from `python/version.txt` plus the suffix in `python/post`. For example, `1.2.4` and an empty suffix produce `inspireface-1.2.4-py3-none-linux_x86_64.whl`.

### Choose the directory and wheel tag {#choose-the-directory-and-wheel-tag}

These three packaging variables have different jobs:

| Variable | Controls | Example |
| --- | --- | --- |
| `INSPIRE_FACE_TARGET_PLATFORM` | Which OS directory is included in the package | `linux`, `darwin` |
| `INSPIRE_FACE_TARGET_ARCH` | Which architecture directory is included | `x64`, `arm64` |
| `INSPIRE_FACE_TARGET_AARCH_MAPPING` | Platform tag written into the wheel | `linux_x86_64`, `manylinux2014_aarch64`, `macosx_11_0_arm64` |

If unset, `setup.py` chooses directories and tags from the build host. Its Linux default is `manylinux2014`; for a local build with no manylinux compatibility check, the `linux_x86_64` or `linux_aarch64` tag above is more appropriate. A portable manylinux wheel requires building against the intended compatibility baseline and checking its external dependencies.

The 1.2.4 wrapper produces a `py3-none-<platform>` wheel: `ctypes` has no CPython extension ABI dependency, but the wheel contains a native library and is platform-specific. The package declares Python 3.7 or newer. Changing a tag or renaming a library does not change its CPU architecture, libc requirements or backend dependencies.

Cross-packaging can run on a different host after you have built the target library. Set all three variables explicitly, then test the resulting wheel on the actual target. `INSPIREFACE_LIBRARY_PATH` only controls runtime loading; it does **not** select the library bundled by `setup.py`.

### Package the current macOS SDK {#package-the-current-macos-sdk}

Start with the [Develop source](./source.md#develop-source). For Apple Silicon, this complete example builds the CPU library with a macOS 14.0 deployment target and packages it with the corresponding wheel tag. Run it in the activated Python environment from the repository root. Inspect the printed architecture, minimum OS and dependencies before distributing the wheel.

<details>
<summary>Build and package an arm64 macOS wheel</summary>

```bash
MACOSX_DEPLOYMENT_TARGET=14.0 VERSION=1.2.4 \
  bash command/build_macos_arm64.sh --jobs 4

ISF_APPLE_SDK="$PWD/build/inspireface-macos-apple-silicon-arm64-1.2.4"
ISF_NATIVE="$ISF_APPLE_SDK/InspireFace/lib/libInspireFace.dylib"
xcrun lipo -info "$ISF_NATIVE"
xcrun vtool -show-build "$ISF_NATIVE"
otool -L "$ISF_NATIVE"
cp "$ISF_APPLE_SDK/version.txt" python/version.txt

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

With an empty `python/post`, the result is `inspireface-1.2.4-py3-none-macosx_14_0_arm64.whl`. For Intel, use `build_macos_x86.sh`, its `inspireface-macos-intel-x86-64-1.2.4` output directory, `x64` for the package directory / target architecture variable, and a matching `macosx_<major>_<minor>_x86_64` tag. Set the deployment target for that build explicitly too.

When packaging an existing Apple XCFramework bundle, take the raw dylib from `SDKs/macosx-arm64/InspireFace/lib/` or `SDKs/macosx-x86_64/InspireFace/lib/`, with the `version.txt` from the same slice. Package each architecture separately; including an XCFramework does not make a Python wheel universal.

::: warning Match the wheel tag to the library
`setup.py` defaults to `macosx_11_0_arm64` or `macosx_12_0_x86_64`. It does not read the binary's minimum OS. Set `INSPIRE_FACE_TARGET_AARCH_MAPPING` to match your actual build; never use an older deployment tag for a newer library. The current Apple CI targets macOS 14.0 on arm64 and 15.0 on x86_64.
:::

To package CoreML on arm64, first use the [CoreML shared CMake build](./macos.md#set-architecture-and-deployment-target). Its `install/InspireFace/lib/libInspireFace.dylib` can replace `ISF_NATIVE` above. Keep the matching minimum OS, architecture and version file, and deploy an Apple model pack for CoreML inference.

### Inspect the wheel {#inspect-the-wheel}

Replace the filename below with the wheel you just built. Check that it contains the expected native library and platform tag:

```bash
python -m zipfile -l python/dist/inspireface-1.2.4-py3-none-linux_x86_64.whl
```

Find the entry ending in `inspireface/modules/core/libs/linux/x64/libInspireFace.so`; the archive may place it under a `.data/purelib/` prefix. Model packs are separate from the wheel; deploy the matching pack alongside your application.

## Install and verify the packaged library {#install-and-verify-the-packaged-library}

Test in a new environment so the editable wrapper does not mask the installed package. Clear the local-library override and any source `PYTHONPATH` before importing:

```bash
python3 -m venv .venv-wheel-check
source .venv-wheel-check/bin/activate
python -m pip install python/dist/inspireface-1.2.4-py3-none-linux_x86_64.whl
unset INSPIREFACE_LIBRARY_PATH
unset PYTHONPATH
```

Run this from the repository root or another directory outside `python/`:

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

`native._LIBRARY_FILENAME` is an internal diagnostic value in the 1.2.4 wrapper. Use it here to confirm which file was loaded; application code should use the public API. The printed package and library paths should both point inside `.venv-wheel-check` when testing a bundled wheel.

Finally, run the [Python detection example](../using-with/python.md#detection-script) with a local model pack. A successful import checks library loading; a detection run also checks the backend, model and image-processing path.

## Existing packaging scripts {#existing-packaging-scripts}

The repository also has scripts that compile the SDK and copy its library into the Python package:

| Target | Entry point from the repository root |
| --- | --- |
| Linux x86_64, manylinux2014 | `docker compose run --rm build-manylinux2014-x86` |
| Linux aarch64, manylinux2014 | `docker compose run --rm build-manylinux2014-aarch64` |

Run Linux packaging in the provided Docker environment; the aarch64 container needs an ARM64 host or configured emulation. These scripts rebuild the native library and write wheels into `python/dist/`. For an already compiled TensorRT, CoreML or Rockchip library, use the explicit packaging steps above.

For macOS, use the [Apple SDK packaging steps](#package-the-current-macos-sdk) on this page. The existing `build_wheel_macos_arm64.sh` and `build_wheel_macos_x86.sh` still invoke a separate direct CMake build: they do not use the new Apple driver, do not explicitly select the target architecture or deployment version, and inherit `setup.py`'s default wheel tag. Their filenames alone do not establish the resulting library's compatibility.

The directory selection, tags and runtime override are implemented in [`python/setup.py`](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/python/setup.py), [`_library_path.py`](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/python/inspireface/modules/core/_library_path.py) and [`_native_loader.py`](https://github.com/HyperInspire/InspireFace/blob/8b37a2eb1e2fe61608195a979dda6cadb84f5106/python/inspireface/modules/core/_native_loader.py).
