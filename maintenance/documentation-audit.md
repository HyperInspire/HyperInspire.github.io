# Documentation rebuild

## Scope and baseline

Audit the public APIs, build scripts, examples and tests in the local source
checkouts, then update the English developer documentation. Source repositories
are read-only inputs to this task.

- InspireFace: `1cb2c1e4` (2026-09-28), CMake version 1.2.4.
- InspireCV: `361574e` (2026-09-28), README version 1.0.2.
- Preserve existing document URLs, the default light theme, Android demo QR code
  and the recently selected cloud illustrations.
- Keep PLUS information brief and separate from the SDK learning path.
- Prefer working examples and concrete constraints over promotional claims.

## Work plan

- [x] Audit C, C++, Python, Java, platform builds and resource packs.
- [x] Audit InspireCV Image, Task, CMake integration and ownership rules.
- [x] Rebuild the introduction, first-run path and feature overview.
- [x] Update language and platform integration pages.
- [x] Add shared guides for model selection, image inputs, tracking, recognition,
  capture, deployment troubleshooting and reproducible examples.
- [x] Replace outdated InspireCV tutorial and benchmark presentation.
- [x] Improve navigation, image sizes, code readability and mobile layout.
- [x] Validate code against source, execute examples where the local runtime
  supports them, build the site and check links and browser rendering.
- [x] Leave a local preview running and record exact validation limits.

## Findings to address

| Area | Existing problem | Evidence / intended correction |
| --- | --- | --- |
| C guide | C++ expressions inside `c` blocks; inconsistent cleanup | Use complete C99 examples, check results and release owned handles. |
| Initialization | `HFReloadInspireFace` presented as normal startup | Use `HFLaunchInspireFace`; explain process-level initialization. |
| Session options | Removed landmark option appears in examples | Current `c_api/inspireface.h` defines no `HF_ENABLE_DETECT_MODE_LANDMARK`. |
| Ownership | Streams, detection views and tokens lack clear lifetime rules | Header documents borrowed raw buffers and owned detection snapshots. |
| Python | New lifecycle and capture APIs absent | Current wrapper supports context managers, explicit launch, owned snapshots and capture. |
| InspireCV | C TODO tabs, obsolete options, incorrect minimum CMake, broad thread-safety claims | Replace with current Image and Task APIs and explicit ownership rules. |
| Features | Images dominate short marketing text | Add operation/output/usage guidance; limit illustrations to relevant sections. |
| Benchmarks | Historical tables mix totals, averages and units | Separate historical measurements from a reproducible measurement procedure. |

## Validation record

Validation was performed on macOS arm64 with the local source revisions above.

| Check | Result |
| --- | --- |
| VuePress production build | 26 HTML pages, including the 404 page. |
| Generated-site references | Local pages, fragment targets, assets and image alt text checked by `check_site.py`; 1,886 local references. |
| Python syntax | 28 Markdown fences and all four downloadable Python programs parsed. |
| C/C++ programs | Both downloaded examples built through their supplied CMake project with warnings treated as errors; each detected a face. C++ saved an annotated image. |
| C API contracts | Executed API-level-2 session creation, bitmap release before stream use, snapshots surviving later tracking, landmarks, two owned features, comparison and quality processing. |
| Current Python runtime | Pipeline fields, five/dense landmarks, copied embeddings, snapshots, RGB input, no-face input and FeatureHub CRUD/search passed. |
| Downloaded Python programs | Detection, comparison, capture and benchmark ran with the 1.2.4 native build and local Pikachu-t4.0 pack. Capture reached READY at frame 33 and saved selected frame 9. |
| Released wrapper compatibility | Detection ran with the wrapper and native 1.2.3 library extracted from the official 1.2.3.post5 macOS wheel. This checks the common API, not a full pip/platform installation matrix. |
| InspireCV | Built and installed 1.0.2 into a temporary prefix; the documented `find_package` consumer compiled and ran. It wrote a resized image and RGB float CHW tensor. |
| Android | Initialization and bitmap snippets compiled against the cached official Java SDK 1.2.0 AAR and Android API 35 stubs. |
| iOS input helper | Objective-C++ BGRA stride-copy helper passed a warnings-as-errors syntax check against the local Apple SDK. |
| Cloud illustrations | All nine distinct content image URLs returned HTTP 200. Semantic landmark index map retained. |
| Browser layout | Light theme, responsive QR card, bounded illustrations, scrollable tables/code and the two-column mobile flow checked at 390 px; desktop checked at the browser's normal viewport. |

The stationary cartoon fixture detected a face but repeatedly lost its track, so
the default capture policy correctly rejected it. The capture success check used
the repository's `bulk/kun_crop.jpg` repeated into a short test video. This checks
the sample's control flow and candidate-image ownership, not capture accuracy on
real camera motion. Recognition self-comparison checks the API path, not model
accuracy or threshold quality.

Android/iOS camera behavior, HarmonyOS packaging, NVIDIA TensorRT and Rockchip
NPU/RGA execution were audited against source and build scripts, but were not run
on those target devices. Historical benchmark values were not remeasured; the
previous text is preserved in `legacy-benchmarks.md` and the public page labels
its retained numbers as historical.

## Repeat the checks

The lightweight site check is also run in the deployment workflow before the
generated site is published:

```bash
npm run docs:check
```

For native-backed Python validation, install NumPy, OpenCV, Loguru and the wrapper's
dependencies in an isolated environment. Point to a matching source and library:

```bash
ISF_SOURCE=/path/to/InspireFace
ISF_NATIVE=/path/to/libInspireFace.dylib
INSPIREFACE_LIBRARY_PATH="$ISF_NATIVE" PYTHONPATH="$ISF_SOURCE/python" \
  python -B maintenance/validate_runtime.py \
  --model "$ISF_SOURCE/test_res/pack/Pikachu" \
  --image "$ISF_SOURCE/test_res/data/bulk/kun_crop.jpg" \
  --output /tmp/inspireface-docs-validation
```

`validate_runtime.py` writes generated test images and video only to that output
directory. It does not download models or modify either source checkout.

Use the supplied example CMake projects to compile against an installed shared
InspireFace SDK and an installed InspireCV package. Keep platform-device testing
separate from the host checks above.

## Maintenance notes

- The current source API and published packages differ. Keep version requirements
  visible around snapshots, capture, diagnostics and newer wrapper lifecycle APIs.
- `INSPIRECV_ENABLE_CUDA` is the current primary switch;
  `INSPIRECV_TASK_ENABLE_CUDA` is retained upstream as a compatibility switch.
- The production HTML template explicitly uses light mode before hydration, while
  preserving a reader's saved dark-mode choice. Keep this aligned with theme config
  when upgrading VuePress.
- The build still reports an old Browserslist dataset from the existing lockfile.
  It does not prevent compilation; dependency upgrades were kept out of this content
  and example audit.


## English and Simplified Chinese (2026-09-28)

The site now contains 25 English pages at the original URLs and 25 matching
Simplified Chinese pages under `/zh/`. The root URL remains English; language
selection is explicit, without a browser-language redirect. The native theme
switcher preserves the current article, query and section. Navigation, home-page
cards, page metadata labels, accessibility labels and article prose are localized.
API identifiers and all 83 code fences remain identical across languages.

For Chinese prose, retain familiar technical names rather than translating every
label. Reference tables use English names for fields, options, modes, filters,
engines and methods, with complete Chinese sentences for explanations. Keep API
identifiers verbatim and easy to compare with the code. General navigation and
reader-oriented tables can remain Chinese. Avoid literal wording such as
“自持有”; explain who owns the memory and when to release it instead.

Chinese headings use explicit IDs, for example
`## 图像输入与坐标 {#image-inputs-and-coordinates}`. The small Markdown extension
in `docs/.vuepress/plugins/stable-heading-ids.js` removes this suffix from the
visible heading and uses it as the anchor. When editing headings, retain the
shared ID or update both languages and their incoming links together.

For a new article, add both language files and update the shared sidebar plus its
Chinese label in `.vuepress/config.js`. Keep article links relative so readers
stay in their chosen language; shared `/examples/` and `/images/` assets remain
at the site root. The checker fails on a missing translation, mismatched section
IDs, divergent code fences or Chinese article links that lead to English pages.

Validation: `npm run docs:check` passed with 51 generated HTML pages, 5,218 local
references, 56 Python fences and all 25 language pairs. Browser checks covered
English by default, home-page switching, bidirectional article/section switching,
Chinese navigation and code-copy text, and the mobile menu at a 390 px viewport.
Chinese tables and code blocks scroll within their containers without widening
the page. The default light theme remains in place.

The theme's vertical page transition moved the destination heading by 10 px after
anchor navigation, allowing its active-heading tracker to select the preceding
section. A local CSS override retains the fade while removing that translation;
bidirectional feature-page section navigation was rechecked after the change.

## Platform detail and API coverage follow-up (2026-09-28)

Restored deployment detail across all eight language/platform page pairs: SDK
layouts, runtime-library placement, Android Gradle/ABI and camera teardown, iOS
framework linkage and its setup illustration, HarmonyOS HAR dependencies,
TensorRT deployment, and Rockchip cross-compilation/board layout. These additions
use the current source and package interfaces rather than reinstating obsolete
calls from the older tutorials.

Seven feature guides now contain 16 native VuePress tab groups with C API, C++,
Android and Python choices. They cover tracking, analysis, recognition and
FeatureHub CRUD/top-k/count, landmarks, liveness/actions, capture/snapshots,
alignment, similarity display conversion and diagnostics. The selected API is
shared across groups and language changes. Unsupported wrapper operations are
explained in their tab rather than shown as fictional code.

The new public API coverage index maps developer workflows to these examples,
deployment guides and upstream declarations. It explicitly distinguishes Android
1.2.0 from the newer capture/snapshot Java source and JNI. The Android 1.2.0 JNI
copies the first pose to every detected face; the analysis example only reads
pose for face zero and explains that limitation. InspireCV now includes additional
Image operations, float storage, pipeline status handling and a device/CUDA API
map. Models and builds explains how reload affects existing sessions.

Validation performed for this follow-up:

- `npm run docs:check`: 57 HTML pages, 6,532 local references, 66 Python fences,
  28 English/Chinese page pairs and 147 identical paired code fences.
- The site checker also verifies matching API tab labels, rendered tab counts
  and each tab's target panel, preventing silent Markdown/plugin failures.
- The five expanded existing feature guides contributed 12 C, 11 C++ and 12 Java
  compiled snippets plus 12 parsed Python snippets. Extracted C/C++ guide snippets
  ran tracking, landmarks, liveness/actions, comparison, FeatureHub CRUD/top-k,
  and capture through completion with a repeated local face fixture.
- New analysis helpers compiled in C/C++/Java and ran in C/C++/Python. Analysis
  results are checked for count consistency before indexing.
- New C/C++ alignment recipes ran through aligned feature extraction. Diagnostics
  and display conversion ran in C/C++/Python; the three Java recipes compiled
  against official Java SDK 1.2.0 plus Android API 35 stubs. Resource counters
  returned to zero after the C alignment workload.
- New InspireCV crop/pad/draw, float-value normalization and checked BGR-to-RGB
  conversion helpers compiled and ran against the installed 1.0.2 library.
- The platform-page additions passed EN/ZH code parity, shell/Python/JSON syntax
  checks; the restored iOS setup illustration loaded successfully.

Android execution remains a compile check, not a device run. Newer Java capture
classes were checked against their matching source. CUDA/device pipeline contracts
were audited in headers and implementation; there was no GPU or board execution.
Host face fixtures establish API flow, not model accuracy or live-camera quality.

For future snippets, use `::: tabs #api-language` with `@tab C API`, `@tab C++`,
`@tab Android` and `@tab Python`. Regular tabs can contain explanatory paragraphs
and multiple code fences. Keep initialization/ownership assumptions next to each
snippet, and preserve identical code in both languages. Inside mobile tabs, code
blocks retain the tab padding instead of using the theme's article-edge margins.

## Preserve illustrations and explain Plus flows (2026-09-28)

The content consolidation removed too many useful illustrations and made the
Plus descriptions too brief. The follow-up restores useful visual explanations
alongside the current API text:

- Feature overview: 13 cloud illustrations, with captions and expanded passive
  and flash liveness sections.
- Introduction: the current banner, three original landmark-tracking GIFs,
  Android QR card and the mobile real-time liveness feature section.
- Platform guides: C/Python call-sequence diagrams and real detection/landmark
  examples, Python tracking GIF, C++ result illustration and iOS Xcode screenshot.
  Android includes a camera-buffer handling flow.
- InspireCV: 20 distinct original technical output images, arranged as 22 cards
  alongside their operation names, descriptions and current examples. The old
  generic banner was not restored.
- Architecture: original module map plus a result/pixel lifetime diagram.
  Image inputs and capture gain coordinate/stride and state/cache diagrams;
  InspireCV gains a preprocessing diagram. Six local SVGs provide these views.

The original cloud prefix `docs/inspireface-doc-images-web/` is correct even for
the files supplied in the local `inspireface-doc-images-B-webp` folder. All 13
cloud files matched the local B images by SHA256; the B folder name is not a
cloud URL prefix. Original technical-image URLs were fetched successfully. Image
cards link to original sizes and reflow to two/one columns on narrow screens.

Plus descriptions were checked against the current Android demonstration's
README, capture coordinator, camera controller, capture packet and service
client. They distinguish passive continuous capture, synchronized WRGB capture,
device requirements, server verdicts, recapture and retrying a frozen submission.
These are descriptions of the current demo, not a benchmark or a promise that
every native API exposes Plus flags. Contact information appears at the end of
the relevant sections. Generated illustrations are captioned as conceptual where
their UI labels or numeric examples differ from actual API fields.

Final site checks passed with 57 HTML pages, 6,594 local references, 28 language
pairs and 147 identical code fences. There are 66 article image placements per
language; the checker now requires matching image sources between translations.
Browser review covered the restored Plus sections, desktop/mobile comparison
cards, the six SVGs, mobile code-tab containment and the default light appearance.
A clipped SVG label and redundant image-link icons were corrected during review.

When reorganizing these guides, keep useful deployment screenshots, operation
comparisons and running examples. If material moves into a shared feature guide,
move its illustration and explanation together and leave a clear link from the
platform page. Avoid replacing a visual tutorial with only an API list, or
restoring large decorative images without enough text to explain their role.

## Editorial pass: direct usage descriptions (2026-09-28)

Reviewed all 28 English/Chinese page pairs. Removed the infrared-liveness section
and its API-index entry. Public guides now describe available operations, setup
requirements and result handling directly, without commentary about auditing the
implementation or warnings based only on the presence of an API declaration.
Retained concrete version, ABI/JNI, buffer-lifetime and backend requirements.

Preserved the feature illustrations, platform screenshots, native code tabs and
examples. Site validation passes: 57 HTML pages, 6,596 local references, 66 Python
fences, 28 language pairs and 147 identical shared code fences. The checker also
verifies paired headings, tab labels and image sources.

For future edits, explain what to call, what to supply and how to read the result.
Leave unavailable features out of the feature guide; record implementation gaps
in maintenance notes. Put required versions next to the relevant example, and
phrase limitations as specific setup or handling steps where possible.

## Inline complete examples (2026-09-28)

All nine example files are included in Markdown code fences. Long programs and
build configurations use native HTML details elements, closed by default. The
complete-examples page is the central file index; feature and platform guides
include the relevant complete code beside their instructions. Article links no
longer point at raw /examples/ files. The code is rendered into static HTML at
build time, with no runtime fetch from GitHub or a separate code service.

C and C++ platform pages now each include a standalone CMake configuration; both
configured and built against /private/tmp/inspireface-docs-sdk. Embedded copies
of the existing sample files match their originals. Existing API tabs and images
are preserved. Copy buttons are enabled on mobile, and nested code blocks stay
inside their details/tab containers.

Validation: 57 HTML pages, 6,598 local references, 86 Python fences, 28 bilingual
page pairs and 176 matching code fences. All details are closed in generated
HTML. Browser checks covered opening panels, the copy success feedback, API tab
switching and a narrow viewport without page overflow. The viewport override was
reset after testing. Preview continues at http://127.0.0.1:8080/.

## Benchmark coverage (2026-09-28)

Expanded the paired InspireFace performance guide from the historical record at
InspireFace revision 1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9. It now includes eight
device/pack configurations, intermediate CoreML detector sizes, Light Track,
alignment/extraction, MNet/R50 extraction, vector comparison and 1k/5k/10k search.
Recomputed historical means from the recorded totals and iteration counts,
including the RV1106 comparison unit (23 microseconds, not 0.023 microseconds).
Historical tables identify missing run metadata and are not labeled as new 1.2.4
measurements. Local ignored logs without complete chip/thread metadata were not
added to the cross-device tables.

Added source-checked commands for the four native detection/tracking/smoothing
programs, the comparison/search tests, the C/C++ latency test and the Python JSON
runner. TestCPP uses the intersection [performance][latency] to select the stated
latency comparison. FeatureHub test vectors are generated and enrolled before
timing; image feature extraction belongs to the separate comparison test. The
Python runner's fixed latency assertions and saved failed-test reports are
explained beside its metrics. SDK cost-counter snippets retain the code tabs.

Excluded the legacy test_BenchmarkFaceExtractWithAlign case from recommended
commands: its timed loop calls HFExecuteFaceTrack. The inline Python extraction
benchmark calls face_feature_extract explicitly. The disabled feature-management
test file and header-only benchmark.csv output are not presented as report tools.

A full feature_benchmark.py now lives in the English and Chinese articles in a
closed details element. It measures aligned extraction separately from prepared
embedding comparison, reports median/p95, and releases streams/sessions on both
success and failure. Runtime validation used the local 1.2.4 shared SDK, Pikachu
and repository fixtures, including a no-face failure; live session/stream handles
were zero before termination. These validation timings are not published as a
hardware benchmark. The C cost-counter snippet passes C99 compilation with
-Wall -Wextra -Werror against SDK headers; all new shell blocks pass bash -n.

Added paired image-processing-benchmarks pages using tracked InspireCV CSVs:
Ryzen 5 5600 CPU/OpenCV comparison, RTX 3060 CUDA Task preprocessing, and GPU
resident Image chains. Each table specifies versions, inputs, sampling and
whether transfers/allocation are timed. Kept examples where either library or
CPU/CUDA path is faster. Raw reports and run commands are linked beside the data.
The public InspireCV repository is tunmx/InspireCV (main); repaired the former
HyperInspire/InspireCV URLs throughout both languages. The new page's ten source
links were verified through the GitHub API.

Validation: 59 HTML pages, 7,028 local references, 90 Python fences, 29 bilingual
page pairs and 187 matching code fences. Browser checks covered the expanded
hardware tables, the new preprocessing page, language switching, closed-by-default
programs, opening the complete feature benchmark and switching the SDK timer API
tab. At a 390-pixel viewport the document had no horizontal overflow; wide tables
remain independently scrollable. Restored the normal viewport after review.
Preview is available at http://127.0.0.1:8080/.

## HarmonyOS API examples and snapshot tradeoffs (2026-09-28)

Verified the current HarmonyOS package at harmony/inspireface: version 1.2.4,
Index.ets exports, the ArkTS wrapper, native declarations, and the Node-API bridge.
The upstream build-time parity check passes with 88 exports mapped to 125 C API
symbols; the README's older 81/117 counts are not used in public documentation.
The standard module uses arm64-v8a, MNN CPU inference and raw-buffer input. This
review does not constitute a DevEco build or HarmonyOS device test; the repository
still distinguishes build/API adaptation from completed hardware validation and
release packages.

Added the HarmonyOS column to all 15 feature rows in the bilingual API index.
Added 16 HarmonyOS tabs per language across tracking, landmarks, optional
analysis, liveness/actions, recognition, capture and API recipes. The platform
page links to these examples and the homepage API list now includes ArkTS. Used
real package exports, bigint FeatureHub IDs, owned tracking snapshots, and
explicit close/release calls. Pipeline processing uses the same session and
image that produced its snapshot. The Plus service sections were not given
invented ArkTS interfaces.

Checked 17 English TypeScript blocks (the 16 new tabs plus the existing platform
example) against the actual InspireFace.ets wrapper and native index.d.ts using
TypeScript 5.8.3 with strict checking in a temporary directory. Only the session
configuration fragment needed a declared Session to supply its documented
caller context. This is a basic type check, not an ArkTS compiler/device test.

Added bilingual yellow warnings beside snapshot discussions in architecture,
the C API ownership section and face capture. They describe copied result
ownership and latency costs, using borrowed C results for sequential single-stream
processing, invalidation by subsequent calls, and retaining source pixels
separately. The warnings do not promise thread safety or cross-session reuse.

Site validation passes: 59 HTML pages, 7,080 local references, 90 Python fences,
29 language pairs and 203 matching code fences. Browser review confirmed the
HarmonyOS index column, synchronized API selection, the rendered yellow warning,
and mobile tab containment with no document overflow.

## Dedicated SDK build section (2026-09-28)

Added ten English/Chinese page pairs under build/: overview/downloads, common
source preparation, Linux, macOS, Android, iOS, HarmonyOS, NVIDIA TensorRT,
Rockchip NPU and Python packaging. Added a top-level sidebar group, navbar
entry, homepage cards and links from the existing platform usage guides.
Kept application examples, platform illustrations and integration tips. The
former models-and-builds page retains its old anchors and model illustration;
its build sections now point to the dedicated chapters.

Checked the public GitHub Releases API and PyPI JSON on this date. Native
release v1.2.3 has 13 downloadable SDK ZIP assets, all linked in the overview;
PyPI publishes 1.2.3.post5. These are distinguished from the 1.2.4 source API.
The source instructions pin SDK 1cb2c1e44bde56253fe9eb5bbc8e14dc5e72dee9 and
third-party dfb1f29c511954bc0764c232ed62e713d972844d. The current release has no
separate HarmonyOS, CoreML or Windows SDK asset. Model downloads remain separate.

Audited actual compiler variables, script flags, installed paths and packaging
behavior. Notable points include macOS script architecture depending on the
active compiler; static arm64 CoreML requiring a shared rebuild for Python;
Android native scripts not assembling a complete AAR; iOS arm64 device-only
frameworks and fixed plist metadata; HarmonyOS producing a staged HAR project;
and glibc/uClibc and NPU generation matching on Rockchip. The TensorRT container
chapter identifies the differing CUDA image, TensorRT archive and output label
so readers align these before building. CMake 3.20–3.x is specified for iOS and
HAR scripts that omit the old-dependency policy setting needed under CMake 4.

Python packaging covers strict full-file-path overrides, restarts after replacing
a loaded library, wrapper/native version matching, generated python/version.txt,
staging a wheel, the three package/tag environment variables, platform ABI and
backend dependencies. A macOS arm64 1.2.4 wheel was actually built in a temporary
staging area, inspected, installed separately, and loaded from its bundled dylib.
Wrapper and native versions both reported 1.2.4; Pikachu detection found one face
in a repository fixture. Missing-file/directory overrides raised RuntimeError;
an existing invalid library raised ImportError without falling back to the
working bundled library. No source SDK files were edited for these checks.

Validation: npm run docs:check passes with 79 HTML pages, 11,973 local references,
92 Python fences, 39 language pairs and 261 shared code fences. All 48 English
build-guide Bash blocks pass bash -n, and git diff --check passes. Cross-platform
SDK compilations were not run; script and source inspection is distinct from
device validation. Browser review covered the new navigation, download tables,
English/Chinese switching, Python version-file instructions and a closed-by-default
Android CMake example that expands correctly. Overview tables fill the article
width. At a 390-pixel viewport, both the overview and Python page fit without
document-level horizontal overflow. The viewport was restored after review.

## Tracking mode speed and latency (2026-09-28)

Expanded the bilingual Sessions and tracking mode table with the requested
qualitative ratings: LIGHT_TRACK five stars; ALWAYS_DETECT and
TRACK_BY_DETECTION two stars. Stars indicate relative processing speed, with
latency labels and a short explanation of device/model/workload dependence.
Shortened displayed modes by documenting the shared C API prefix.

Checked face_track_module.cpp: both detector-based modes run detection on every
frame; LIGHT_TRACK detects with no existing tracks or at the configured interval.
Explained detection-frame cost, new-face discovery delay, sequence-local IDs and
camera queue latency. Removed the obsolete build-support prerequisite for
TRACK_BY_DETECTION; current sources include ByteTrack without a dedicated toggle.
Existing multi-language code examples and illustration are retained unchanged.

Validation: site checks pass for 79 HTML pages, 11,979 local references, 92 Python
fences, 39 bilingual pairs and 261 matching code fences. These are qualitative
ratings requested for mode selection; no new performance measurements are claimed.

## Additional HyperLandmark models (2026-09-28)

Added a short closing section to the English and Chinese landmark guides. It
covers the requested model choices for accuracy, video stability, latency,
point counts and layouts, with the existing contact@insightface.ai address for
commercial licensing inquiries. The user-specified Linux image path was not
available here; the same-named image was found at
/Users/tunm/Downloads/g_278_colored.png and copied unchanged into the static
public/images directory. Its 1448-by-1086 dimensions are declared in both pages,
with translated alt text and captions. Source, public and rendered asset hashes
match. No cloud upload or image modification was needed.

Site checks pass: 79 HTML pages, 11,985 local references, 92 Python fences,
39 bilingual pairs and 261 shared code fences. Browser review confirmed the new
section, email link and fully loaded illustration at the end of the article.

## ARM hardware deployment (2026-09-28)

Added English/Chinese using-with/arm.md pages and placed ARM first under Hardware
deployment. Linked the new chapter from Linux builds and the InspireCV guide.
The page explains image and feature operations, repeated-frame memory work,
optional Task preprocessing, platform selection and camera latency tuning. A
responsive four-stage flow uses the existing document card styles.

Audited InspireFace 1cb2c1e and InspireCV 361574e, including the SDK's matching
third-party InspireCV checkout. Evidence includes bitmap.cpp NEON/coordinate
reuse/affine/rotation paths; Task tile_pipeline, writers and CMake selection;
feature_hub/simd.h dot products; any_net_adapter input views; detector ForwardViews;
and input/output tensor and converter caching in the SDK inference adapter.
Described CPU inference in terms of ARM adaptation without promoting a framework
brand or attributing its inference kernels to SDK-owned code.

Kept default and optional behavior distinct: ISF_ENABLE_INSPIRECV_TASK_PREPROCESS
is OFF; INSPIRECV_TASK_ENABLE_ARM_NEON is ON and controls explicit Task NEON only.
The SDK option switches stream preprocessing, while model normalization and
model-specific tensor preparation remain with the model adapter. ARM NEON is a
build-target requirement; generic operation fallback does not make a NEON-enabled
ARMv7 binary compatible with a non-NEON CPU. No zero-copy, universal speedup,
public thread-setting API or CPU results inferred from CoreML/NPU measurements
were claimed. The InspireCV M4 isolation report also shows why explicit NEON
must be measured per workload rather than presented as uniformly faster.

Validation: both shell examples pass bash -n; npm run docs:check passes for
81 HTML pages, 12,561 local references, 92 Python fences, 40 bilingual pairs and
262 matching code fences. git diff --check passes. Browser review confirmed the
ARM sidebar entry, stage cards, tables and final headings. A 390-pixel viewport
uses two columns for the cards and has no document-level horizontal overflow;
the normal viewport was restored. No new ARM hardware benchmark or cross-platform
SDK build was performed for this documentation change.

## Documentation version (2026-09-28)

Set the public documentation version to 1.2.4.d2, matching the development SDK's
1.2.4 CMake version and the requested second documentation revision. package.json
is the single version source; npm stores 1.2.4-d2 and the site derives the dotted
display form. Updated both lockfile version fields without changing dependencies.

A thin wrapper around the theme's navbar brand adds a compact version link to
every normal page. It points to the localized Introduction version explanation.
The badge, bilingual current-version sentences and HTML metadata share build-time
release data. Documented revision increments, restarting at d1 for a new SDK,
and the distinction from prebuilt-package versions. The repository README explains
how to bump both manifests without a Git commit or tag.

Validation: npm run docs:check passes for 81 HTML pages, 12,645 local references,
92 Python fences, 40 bilingual pairs and 262 shared code fences. Added checks for
manifest consistency, version metadata and localized badges across rendered pages.
Browser review confirmed the English home badge, its section link, switching to
Chinese and the version explanation. At 390 pixels the badge remains visible next
to the logo, with no document-level horizontal overflow; restored the viewport.

## Final documentation sweep (2026-09-28)

Reviewed all 40 English/Chinese page pairs, with parallel source checks for API
usage, build instructions and performance claims. Corrected these confirmed issues:

- Features still described Track by Detection as an optional build capability.
  It now states that detection runs each frame and detections are associated into
  tracks. Added the missing HarmonyOS mention in the entry-page API descriptions.
- The native benchmark build command lacked CMake 4's dependency-policy override.
  Both languages now pass CMAKE_POLICY_VERSION_MINIMUM=3.5, matching the build guide.
- Rockchip Python installation appeared to cover ARMv7/uClibc. setup.py only maps
  x64/arm64, so the guide now covers RK356x/RK3588 aarch64/glibc and points the other
  targets to native deployment. Added matching SDK version.txt preparation and
  wrapper/native version checks to avoid silently installing a 0.0.0 package.
- The video capture example only handled READY. capture.cpp can end collection
  directly in FINISHED on timeout, while retaining candidates. The example now
  stops with a specific error in that case and saves only after READY. Updated
  all four inline copies, the short cache snippet and the public script. Five
  mocked control-flow cases passed: successful selection of an older candidate,
  FINISHED with/without candidates, EOF and SDK-exception cleanup. No SDK build
  or new device benchmark was run for this sweep.
- Added SDK downloads/builds, Python packaging and ARM links to the API index;
  fixed an iOS source-guide link label. The API matrix now has a minimum table
  width inside a focusable scrolling region, keeping short labels readable on
  mobile without overflowing the document.

Also verified the latest landmark illustration uses the cloud lmk2.webp asset,
with its actual 1632 x 1684 dimensions; the old local PNG and its captions are gone.

Validation: npm run docs:check passes for 81 generated pages, 12,651 local
references, 92 Python fences, 40 bilingual pairs and 262 identical shared code
fences. A new check verifies 36 complete inline examples against the nine example
source files and requires both example-index pages to include every file.
No duplicate HTML IDs, extra/missing h1 headings or initially open details were
found. git diff --check passes.

Checked 110 unique external reading/download/image URLs, excluding generated
GitHub edit links for the unpublished working tree. 109 accepted HEAD with HTTP
200; the Plus API documentation rejected HEAD with 405 but returned HTML/200 on
GET. All 43 external image URLs returned image content types successfully.

Browser checks covered all 80 English/Chinese content pages at a 390-pixel
viewport: none had document-level horizontal overflow. Confirmed keyboard
scrolling in the API matrix and shared HarmonyOS selection across all three
capture code groups. Restored the normal viewport. The documentation release
remains 1.2.4.d2; this sweep is part of the same unpublished update.
