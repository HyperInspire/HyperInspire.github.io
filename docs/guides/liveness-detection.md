# Liveness Detection

InspireFace offers several approaches to face liveness detection, from silent RGB analysis and guided facial actions to commercial **InspireFacePlus** verification services. These options support different user experiences for identity verification, mobile onboarding, and access control.

## Available Approaches

| Approach | User experience | Verification |
| --- | --- | --- |
| **Silent Liveness** | Face the camera; no prompted actions | On-device RGB anti-spoofing |
| **Cooperative Liveness** | Follow a sequence of facial action prompts | On-device action detection |
| **Passive Liveness (PLUS)** | Keep the face steady for a short capture; no prompted actions or screen flashes | Commercial InspireFacePlus service |
| **Flash Liveness (PLUS)** | Keep the face steady while the screen displays a sequence of colors | Commercial InspireFacePlus service |

### Try the Android Demos

[Download the Android example app](http://fir.tunm.top/pro/pz7b3dgv), or scan the [QR code on the Introduction page](../introduction.md#try-the-android-example-app). Open **Anti-fraud** to explore the liveness demos.

The two **PLUS** demos require an internet connection and use the front camera. After entering a PLUS demo, follow the face-positioning guide and tap **Start** when ready. The app captures the face images for that round, submits them to InspireFacePlus, and displays the verification result.

## Silent Liveness

Silent liveness uses an RGB camera to assess whether a face is live, without asking the user to blink, turn their head, or perform other actions. It analyzes facial appearance for signs of presentation attacks such as printed photos or screen replays.

The Android **Silent liveness** demo displays a live confidence score and a real/spoof result. It smooths per-frame scores over a sliding window to keep the display stable. This approach suits continuous camera flows where a simple, unobtrusive check is preferred.

For SDK integration, see **Face RGB Anti-Spoofing** in the [Python guide](../using-with/python.md#face-rgb-anti-spoofing) or [C/C++ guide](../using-with/c-cpp.md#face-rgb-anti-spoofing).

## Cooperative Liveness

Cooperative liveness guides the user through facial actions and checks their completion across consecutive video frames. The Android **Action liveness** demo generates a randomized challenge sequence using:

- Blinking
- Shaking the head
- Opening the mouth
- Raising the head

The app prompts each action in turn, checks completion within a time limit, and stops the challenge if the face is lost. This approach provides an interactive verification flow with clear guidance at each step.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/action_liveness.webp" alt="Cooperative liveness with a sequence of facial action prompts" width="1536" height="1024" style="width: 640px; height: auto;" />

For SDK integration, see **Face Interactions Action Detection** in the [Python guide](../using-with/python.md#face-interactions-action-detection) or [C/C++ guide](../using-with/c-cpp.md#face-interactions-action-detection).

## Passive Liveness (PLUS)

**Passive Liveness (PLUS)** is a commercial liveness detection service provided by **InspireFacePlus**. It evaluates a short sequence of RGB face images while the user looks at the camera, offering a verification experience without action prompts or screen flashes.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/liveness.webp" alt="Passive liveness verification while the user faces the camera" width="1536" height="1024" style="width: 640px; height: auto;" />

In the Android app, select **Passive-RGB Liveness** with the **PLUS** badge. Keep your face within the guide and hold steady during capture. The app collects a continuous sequence of valid face frames and submits the completed capture for online verification.

This option is designed for workflows that prioritize a simple user experience, such as mobile onboarding and remote identity verification.

## Flash Liveness (PLUS)

**Flash Liveness (PLUS)** is a commercial liveness detection service that uses controlled screen illumination during face capture. The screen displays a sequence of colors, and InspireFacePlus analyzes the corresponding face images to assess liveness.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/inspireface-doc-images-web/light_liveness.webp" alt="Flash liveness using colored screen illumination to distinguish a live face from a printed photo" width="1536" height="1024" style="width: 640px; height: auto;" />

In the Android app, select **Color liveness** with the **PLUS** badge. Face the front camera and keep still while the screen cycles through white, red, green, and blue. The completed capture is then submitted for online verification, without requiring a sequence of facial actions.

The demo requires a front camera that supports the capture controls used for screen illumination. If the device is unsupported, the app displays a message. Follow the on-screen guidance throughout the capture.

## Commercial Access

Try both **PLUS** demos in the [Android example app](../introduction.md#try-the-android-example-app) to explore the commercial liveness experience.

**Contact us to obtain access to the commercial versions** of Passive Liveness and Flash Liveness, or to discuss licensing and integration for your product. Please use your company email and include a brief description of your use case and target platform.

📧 [contact@insightface.ai](mailto:contact@insightface.ai?subject=InspireFace%20Commercial%20Liveness)
