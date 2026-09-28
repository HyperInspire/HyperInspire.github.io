# Architecture and lifetime

An application works with four main objects: a loaded resource pack, a session, an image stream and the results of each call. The resource pack is shared across the process; each worker manages its session, frames and results.

<div class="doc-flow" aria-label="Processing flow">
  <div><strong>Resource pack</strong><span>Load once per process</span></div>
  <div><strong>Session</strong><span>Models and tracking state</span></div>
  <div><strong>Image stream</strong><span>One frame's pixels and format</span></div>
  <div><strong>Face results</strong><span>Geometry, analysis, embeddings</span></div>
</div>

## Process-wide state

`HFLaunchInspireFace` loads a resource pack for subsequent session creation. The Python equivalent is `launch`. Select the landmark engine and image-processing backend before creating sessions.

FeatureHub provides process-wide embedding storage and search, with its own enable/disable lifecycle. Sessions handle feature extraction; enable FeatureHub when the application also needs a gallery.

Load resources at application startup and release them after workers stop. When changing packs, create new sessions and prepare gallery embeddings compatible with the new recognition model.

## Session state

A session owns the inference modules selected at creation, working buffers and tracking history. A still-image worker can reuse one session for many unrelated images in always-detect mode. A video worker should reuse a tracking session for one ordered sequence.

Use one session per worker or camera sequence. Each session then keeps the tracking history and working buffers for that input.

## Frames and results

The C API's raw-buffer stream borrows memory owned by the application. Retain the camera buffer until every consumer has finished. For queued work, keep the buffer alive or copy the pixels before returning it to the camera.

<figure>
<a href="/images/sdk-result-lifetime.svg" target="_blank" rel="noopener"><img class="doc-diagram" src="/images/sdk-result-lifetime.svg" alt="The separate lifetimes of frame pixels, a borrowed C detection view and an owned snapshot" loading="lazy" /></a>
<figcaption>For deferred feature extraction, retain the detection result and its matching frame pixels.</figcaption>
</figure>

| Data | Safe handling |
| --- | --- |
| Camera bytes | Retain until every operation using that frame has finished. |
| C detection view | Consume before the next tracking call, or copy/use an owned snapshot. |
| Owned detection snapshot | Retains detection data until released; keep the source pixels separately. |
| Borrowed feature cache | Copy it before another extraction, or extract into an owned feature. |
| Python face/feature objects | The wrapper copies tokens and feature arrays; keep the corresponding image separately. |
| Capture candidate | Use its frame ID to find the original frame retained by your application. |

::: warning Choosing how to keep results
Snapshots copy detection results into owned storage. Their explicit lifetime makes them easier to retain or process later and reduces lifetime mistakes, at the cost of copying work and added latency. Keep the matching frame pixels separately.

When using the C API directly, a single video stream processed in order can use the borrowed results from `HFExecuteFaceTrack` to avoid this copy. Finish reading them before the next tracking call. Later calls may overwrite these results, so do not retain them across frames or reuse them between interleaved calls.
:::

## A useful worker layout

```text
application startup
  load resource pack
  enable gallery if needed
  create one session per worker

camera worker
  receive frame
  create/update stream
  detect or track
  run analysis / extract features for that frame
  copy results needed by another worker
  release stream / return camera buffer

application shutdown
  stop incoming frames and join workers
  release capture objects and sessions
  disable gallery
  terminate SDK
```

The application handles camera capture and queue scheduling. Use a bounded queue; for an interactive preview, discard old unprocessed frames to keep up with the live input.

## Where InspireCV fits

InspireCV provides image storage, geometry, drawing and preprocessing. Its `task::Pipeline` can write camera inputs into image or tensor buffers. InspireFace also has its own `FrameProcess` wrapper under the `inspirecv` namespace.

To use Task preprocessing inside InspireFace, build the SDK with `ISF_ENABLE_INSPIRECV_TASK_PREPROCESS=ON`.

## Backends

Choose an MNN, TensorRT, CoreML or Rockchip RKNN build together with its matching model pack and runtime libraries. Configure image preprocessing separately; Rockchip RGA handles supported image conversion and transform operations.

See [models and builds](./models-and-builds.md), [image inputs](./image-inputs.md) and [recognition](./recognition.md) for the practical setup details.

<figure>
<a href="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/mem_model.drawio.png" target="_blank" rel="noopener"><img class="doc-diagram" src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/mem_model.drawio.png" alt="InspireFace architecture map showing sessions, images, App Context, FeatureHub and the underlying engine" width="692" height="552" loading="lazy" /></a>
<figcaption>Module relationships at a glance. Available language wrappers and hardware paths depend on the package version and build configuration.</figcaption>
</figure>
