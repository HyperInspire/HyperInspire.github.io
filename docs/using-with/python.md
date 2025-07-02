# Using InspireFace in Python

The python version of inspireface is based on ctypes and the standard edition of InspireFaceSDK libraries, and usually requires **python >= 3.7**.

::: warning
If you install inspireface from pypi, it is usually a regular version that **only supports the cpu** version. If you want to build python based on CUDA, Rockchip NPU, ANE inference backend, you will need to re-adapt the corresponding version of the library to the Python project. See the repository for [more details](https://github.com/HyperInspire/InspireFace/tree/master/python).
:::

## Installation and Setup

You can use pip to install the InspireFace Python package:

```bash
pip install -U inspireface
```

## Initialization

Global initialization of InspireFace is necessary. You only need to perform it once when the program starts. The initialization includes functions such as configuration reading and model loading.

```python
import inspireface as isf

# The simplest way - will automatically download and use the Pikachu model
isf.launch()

# Or specify a model name
isf.launch("Pikachu")

# Or use a custom model path
isf.launch(resource_path="/path/to/your/model")
```

You can also check the launch status and terminate when needed:

```python
# Check if InspireFace is already launched
if isf.query_launch_status():
    print("InspireFace is already launched")

# Terminate InspireFace (optional, usually not needed)
isf.terminate()
```

## How to switch models

You can start or restart global initialization with the reload function. You can use model_name to specify the model to use, such as Pikachu or Megatron, or you can use the resource_path parameter to specify a model path.

```python
import inspireface as isf

# Will download automatically
isf.reload(model_name='Pikachu')

# Direct use path
isf.reload(model_name=None, resource_path="/home/user/Pikachu")
```

## Face Algorithm Session

InspireFace's facial analysis algorithms are all concentrated in the session. You can use the session instance to perform **face recognition**, **face embedding extraction**, **face detection**, **face tracking**, **landmark localization**, **liveness detection**, **head pose estimation**, **attribute recognition**, and other functions.

Since the session contains some cache, **we recommend** using one session within a thread, and **we don't recommend** cross-using internal data from multiple sessions in tracking mode, as this can easily cause confusion. Sessions can be freely created and destroyed anywhere.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pipeline.png">

### Create Session

When creating a session, there are some important parameters that need to be specified:

- **Option**: Features that need to be turned on, such as face recognition, mask detection, face attributes. This step will increase the memory used by the session
- **Detect Mode**:
    - **Always Detection**: Face detection is performed each time, usually for image input or scenes where faces do not need to be tracked
    - **Light Tracking**: Lightweight face tracking algorithm, support input frame sequence tracking face, tracking speed is extremely fast
    - **Tracking by Detection**: With detector-dependent tracking, detection is performed every frame, with low speed and high precision
- **Max Faces**: Limit the maximum number of faces to detect, if the number of faces is too large, the algorithm will be slow
- **Detect Pixel Level**: Face detector level, the higher the more accurate, but also affect the execution speed, usually 160, 192, 256, 320, 640

::: warning
When creating a session, it will use device memory, and as more options are enabled, the memory usage increases. Appropriately disabling some unnecessary features can save memory.
:::

```python
import inspireface as isf

# Enable the functions: face recognition, mask detection, live detection, and face quality detection
opt = isf.HF_ENABLE_FACE_RECOGNITION | isf.HF_ENABLE_QUALITY | isf.HF_ENABLE_MASK_DETECT | isf.HF_ENABLE_LIVENESS

# Create session with options
session = isf.InspireFaceSession(
    param=opt,  # Features to enable
    detect_mode=isf.HF_DETECT_MODE_ALWAYS_DETECT,  # Detection mode
    max_detect_num=20,  # Maximum number of faces to detect
    detect_pixel_level=160,  # Detection precision level
    track_by_detect_mode_fps=-1  # FPS for tracking mode (optional)
)

# Alternative: Using SessionCustomParameter for more control
custom_param = isf.SessionCustomParameter()
custom_param.enable_recognition = True
custom_param.enable_liveness = True
custom_param.enable_mask_detect = True
custom_param.enable_face_quality = True

session = isf.InspireFaceSession(
    param=custom_param,
    detect_mode=isf.HF_DETECT_MODE_ALWAYS_DETECT,
    max_detect_num=20
)
```

### Face Detection

Face detection is the first step in the analysis of faces, which requires the input of an image or frame:

```python
import cv2
import inspireface as isf

# Create session
opt = isf.HF_ENABLE_FACE_RECOGNITION
session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

# Set detection confidence threshold
session.set_detection_confidence_threshold(0.5)

# Load image
image = cv2.imread("path/to/image.jpg")

# Detect faces
faces = session.face_detection(image)
print(f"Detected {len(faces)} faces")

# Access face information
for idx, face in enumerate(faces):
    print(f"Face {idx}:")
    print(f"  Track ID: {face.track_id}")
    print(f"  Location: {face.location}")  # (x1, y1, x2, y2)
    print(f"  Detection confidence: {face.detection_confidence}")
    print(f"  Euler angles - Roll: {face.roll}, Yaw: {face.yaw}, Pitch: {face.pitch}")
```

![landmark](https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/lmk.jpg)

### Face Landmark

Face landmark prediction can be used in any detection mode state, but it should be noted that if the detection mode is in **TRACK** state, you will get smoother facial landmark points. We provide two solutions: 5 basic key points and denser key points (more than 100 points).

```python
# Get 5 key points (eyes, nose, mouth corners)
five_points = session.get_face_five_key_points(face)
print(f"Five key points shape: {five_points.shape}")  # (5, 2)

# Get dense landmarks (100+ points)
dense_landmarks = session.get_face_dense_landmark(face)
print(f"Dense landmarks shape: {dense_landmarks.shape}")  # (N, 2)

# Draw landmarks on image
for x, y in dense_landmarks.astype(int):
    cv2.circle(image, (x, y), 1, (0, 255, 0), -1)
```

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/out-8.gif" width="200" height="200">

For tracking mode, you can set smoothing parameters:

```python
# Set tracking mode parameters for smoother landmarks
session.set_track_mode_smooth_ratio(0.05)
session.set_track_mode_num_smooth_cache_frame(5)
```

### Face Embedding

Get face embedding is an important step in face recognition, comparison or face swap, which usually needs to be carried out after face detection or tracking.

```python
# Extract face features
feature = session.face_feature_extract(image, face)
print(f"Feature vector shape: {feature.shape}")  # Usually (512,) or similar

# Compare two face features
similarity = isf.feature_comparison(feature1, feature2)
print(f"Similarity score: {similarity}")

# Check if they are the same person
threshold = isf.get_recommended_cosine_threshold()
is_same_person = similarity > threshold
print(f"Same person: {is_same_person}")

# Convert to percentage
percentage = isf.cosine_similarity_convert_to_percentage(similarity)
print(f"Similarity percentage: {percentage:.2f}%")
```

### Face Pose Estimation

When you create a session with the **HF_ENABLE_FACE_POSE** option enabled, you can obtain face pose Euler angle values from face detection results:

- **roll**: Head rotation around the Z-axis (tilting left/right)
- **yaw**: Head rotation around the Y-axis (turning left/right)
- **pitch**: Head rotation around the X-axis (nodding up/down)

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/pose.jpg" alt="pose" style="max-width:250px;">

```python
# Enable pose estimation
opt = isf.HF_ENABLE_FACE_RECOGNITION | isf.HF_ENABLE_FACE_POSE
session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

faces = session.face_detection(image)
for face in faces:
    print(f"Pose angles - Roll: {face.roll:.2f}, Yaw: {face.yaw:.2f}, Pitch: {face.pitch:.2f}")
```

## Face Pipeline

If you want to access facial attribute functions such as Anti-Spoofing, mask detection, quality detection, and facial motion recognition, you need to call the Pipeline interface to execute these functions.

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/pip_bn.png" alt="quality" style="max-height:200px;">

### Execute the Face Pipeline

To execute the Pipeline function, you need to first perform face detection to obtain face information, select the faces you want to execute the pipeline on as input parameters, and configure the corresponding Option for the functions you want to call.

All functions require only one pipeline interface call, which simplifies frequent calling scenarios.

::: warning
Ensure that the Option is included when creating the Session. The executed Option must be a subset of or identical to the Session's Option. If the execution exceeds the configured Session Option functionality scope, it will fail to execute!
:::

```python
# Create session with multiple features enabled
opt = (isf.HF_ENABLE_FACE_RECOGNITION | isf.HF_ENABLE_QUALITY | 
       isf.HF_ENABLE_MASK_DETECT | isf.HF_ENABLE_LIVENESS | 
       isf.HF_ENABLE_INTERACTION | isf.HF_ENABLE_FACE_ATTRIBUTE | 
       isf.HF_ENABLE_FACE_EMOTION)
session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

# Detect faces first
faces = session.face_detection(image)

# Execute pipeline with selected functions
pipeline_opt = (isf.HF_ENABLE_QUALITY | isf.HF_ENABLE_MASK_DETECT | 
                isf.HF_ENABLE_LIVENESS | isf.HF_ENABLE_FACE_ATTRIBUTE)
face_extensions = session.face_pipeline(image, faces, pipeline_opt)

# Access results
for idx, ext in enumerate(face_extensions):
    print(f"Face {idx} pipeline results:")
    print(f"  Quality confidence: {ext.quality_confidence}")
    print(f"  RGB liveness confidence: {ext.rgb_liveness_confidence}")
    print(f"  Mask confidence: {ext.mask_confidence}")
```

### Face RGB Anti-Spoofing

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_LIVENESS**, you can obtain the RGB Anti-Spoofing detection confidence:

<img src="https://inspireface-1259028827.cos.ap-singapore.myqcloud.com/docs/feature/liveness.jpg" alt="liveness" style="max-width:220px;">

```python
# Enable liveness detection
opt = isf.HF_ENABLE_LIVENESS
session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

faces = session.face_detection(image)
extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_LIVENESS)

for ext in extensions:
    liveness_score = ext.rgb_liveness_confidence
    print(f"RGB Liveness confidence: {liveness_score}")
    is_real = liveness_score > 0.5  # Adjust threshold as needed
    print(f"Is real person: {is_real}")
```

### Face Mask Detection

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_MASK_DETECT**, you can obtain the face mask detection confidence:

```python
extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_MASK_DETECT)

for ext in extensions:
    mask_score = ext.mask_confidence
    print(f"Mask confidence: {mask_score}")
    wearing_mask = mask_score > 0.5  # Adjust threshold as needed
    print(f"Wearing mask: {wearing_mask}")
```

### Face Quality Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_QUALITY**, you can obtain face quality. This is a comprehensive confidence score based on attributes that affect clarity such as blur, occlusion, and lighting:

```python
extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_QUALITY)

for ext in extensions:
    quality_score = ext.quality_confidence
    print(f"Face quality: {quality_score}")
    good_quality = quality_score > 0.5  # Adjust threshold as needed
    print(f"Good quality: {good_quality}")
```

### Eyes State Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_INTERACTION**, you can obtain the static action state of the current frame (currently only supports eye state):

- **left_eye_status_confidence**: Left eye state: confidence close to 1 means open, close to 0 means closed
- **right_eye_status_confidence**: Right eye state: confidence close to 1 means open, close to 0 means closed

```python
extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_INTERACTION)

for ext in extensions:
    left_eye_open = ext.left_eye_status_confidence > 0.5
    right_eye_open = ext.right_eye_status_confidence > 0.5
    print(f"Left eye open: {left_eye_open}, Right eye open: {right_eye_open}")
```

### Face Interactions Action Detection

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_INTERACTION** and are in **TRACK** mode, you can obtain a series of facial actions calculated through consecutive sequence frames. These are typically used for interactive scenarios such as combining with liveness detection:

- **action_normal**: Normal state, no special actions
- **action_shake**: Head shaking action, moving head left and right
- **action_jaw_open**: Mouth opening action, opening the mouth
- **action_head_raise**: Head raising action, lifting the head upward
- **action_blink**: Blinking action, closing and opening the eyes

```python
# Use tracking mode for action detection
session = isf.InspireFaceSession(isf.HF_ENABLE_INTERACTION, isf.HF_DETECT_MODE_LIGHT_TRACK)

extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_INTERACTION)

for ext in extensions:
    actions = []
    if ext.action_normal:
        actions.append("Normal")
    if ext.action_shake:
        actions.append("Head Shake")
    if ext.action_jaw_open:
        actions.append("Jaw Open")
    if ext.action_head_raise:
        actions.append("Head Raise")
    if ext.action_blink:
        actions.append("Blink")
    print(f"Detected actions: {actions}")
```

### Face Emotion Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_FACE_EMOTION**, you can obtain facial expression recognition results:

- **emotion**: Detected facial emotion type, returns corresponding integer values:
  - 0: Neutral
  - 1: Happy
  - 2: Sad
  - 3: Surprise
  - 4: Fear
  - 5: Disgust
  - 6: Anger

```python
emotion_tags = ["Neutral", "Happy", "Sad", "Surprise", "Fear", "Disgust", "Anger"]

extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_FACE_EMOTION)

for ext in extensions:
    emotion_label = emotion_tags[ext.emotion]
    print(f"Detected emotion: {emotion_label}")
```

### Face Attribute Prediction

When you configure and execute a Pipeline with the Option containing **HF_ENABLE_FACE_ATTRIBUTE**, you can obtain facial attribute recognition results, including race, gender, and age bracket:

- **race**: Detected facial race type, returns corresponding integer values:
  - 0: Black
  - 1: Asian
  - 2: Latino/Hispanic
  - 3: Middle Eastern
  - 4: White

- **gender**: Detected facial gender, returns corresponding integer values:
  - 0: Female
  - 1: Male

- **age_bracket**: Detected facial age bracket, returns corresponding integer values:
  - 0: 0-2 years old
  - 1: 3-9 years old
  - 2: 10-19 years old
  - 3: 20-29 years old
  - 4: 30-39 years old
  - 5: 40-49 years old
  - 6: 50-59 years old
  - 7: 60-69 years old
  - 8: More than 70 years old

```python
race_tags = ["Black", "Asian", "Latino/Hispanic", "Middle Eastern", "White"]
gender_tags = ["Female", "Male"]
age_bracket_tags = ["0-2 years old", "3-9 years old", "10-19 years old", "20-29 years old", "30-39 years old",
                    "40-49 years old", "50-59 years old", "60-69 years old", "more than 70 years old"]

extensions = session.face_pipeline(image, faces, isf.HF_ENABLE_FACE_ATTRIBUTE)

for ext in extensions:
    race = race_tags[ext.race]
    gender = gender_tags[ext.gender]
    age = age_bracket_tags[ext.age_bracket]
    print(f"Attributes: {gender}, {race}, {age}")
```

## Face Embedding Database

We provide a lightweight face embedding vector database (**FeatureHub**) storage solution that includes basic functions such as adding, deleting, modifying, and searching, while supporting both **memory** and **persistent** storage modes.

::: tip
Although we provide a lightweight vector storage and retrieval function, it is not necessary. If it cannot meet your performance requirements, we encourage you to manage the face embeddings yourself.
:::

Before starting FeatureHub, you need to be familiar with the following parameters:

- **primary_key_mode**: Primary key mode, with two modes available. It's recommended to use HF_PK_AUTO_INCREMENT by default
  - HF_PK_AUTO_INCREMENT: Auto-increment mode for primary keys
  - HF_PK_MANUAL_INPUT: Manual input mode for primary keys, requiring users to avoid duplicate primary keys themselves
- **enable_persistence**: Whether to enable persistent database storage mode
  - If True: The database will write to local files for persistent storage during usage
  - If False: High-speed memory management mode, dependent on program lifecycle
- **persistence_db_path**: Storage path required only for persistent mode, defined by the user. If the input is a folder rather than a file, the system default file naming will be used
- **search_threshold**: Face search threshold, using floating-point numbers. During search, only embeddings above the threshold are searched. Different models and scenarios require manual threshold settings
- **search_mode**: Search mode, **effective only when searching for top-1 face**, with EAGER and EXHAUSTIVE modes
  - HF_SEARCH_MODE_EAGER: Complete search immediately upon encountering the first face above the threshold
  - HF_SEARCH_MODE_EXHAUSTIVE: Search all similar faces and return the one with the highest similarity

### Enable/Disable FeatureHub

Using thread-safe singleton pattern design, it has global scope and only needs to be opened once:

```python
import inspireface as isf

# Configure FeatureHub
config = isf.FeatureHubConfiguration(
    primary_key_mode=isf.HF_PK_AUTO_INCREMENT,  # Recommended auto increment
    enable_persistence=True,  # Enable persistent storage
    persistence_db_path="face_database.db",  # Database file path
    search_threshold=0.48,  # Search threshold
    search_mode=isf.HF_SEARCH_MODE_EXHAUSTIVE  # Search mode
)

# Enable FeatureHub
ret = isf.feature_hub_enable(config)
assert ret, "Failed to enable FeatureHub"

# ... use FeatureHub for operations ...

# Disable when not needed (optional)
isf.feature_hub_disable()
```

### Insert Face Embedding

Insert a face embedding feature vector into FeatureHub. If in HF_PK_AUTO_INCREMENT mode, the input identity.id will be ignored. If in HF_PK_MANUAL_INPUT mode, the input identity.id is the ID the user expects to insert.

```python
# Extract face feature
faces = session.face_detection(image)
feature = session.face_feature_extract(image, faces[0])

# Create face identity
face_identity = isf.FaceIdentity(feature, id=-1)  # id will be auto-assigned

# Insert into FeatureHub
success, allocated_id = isf.feature_hub_face_insert(face_identity)
if success:
    print(f"Face inserted with ID: {allocated_id}")
else:
    print("Failed to insert face")
```

### Search Most Similar Face

Input a face embedding to be queried and search for a face ID from FeatureHub that is above the threshold (Cosine similarity).

```python
# Extract query feature
query_faces = session.face_detection(query_image)
query_feature = session.face_feature_extract(query_image, query_faces[0])

# Search for similar face
search_result = isf.feature_hub_face_search(query_feature)

if search_result.similar_identity.id != -1:
    print(f"Found similar face with ID: {search_result.similar_identity.id}")
    print(f"Confidence: {search_result.confidence:.4f}")
else:
    print("No similar face found")
```

### Search Top-K Faces

Search for the top K faces with the highest similarity:

```python
# Search top 10 most similar faces
top_k_results = isf.feature_hub_face_search_top_k(query_feature, top_k=10)

print(f"Found {len(top_k_results)} similar faces:")
for idx, (confidence, face_id) in enumerate(top_k_results):
    print(f"  Rank {idx+1}: ID={face_id}, Confidence={confidence:.4f}")
```

### Delete Face Embedding

Specify a face ID to delete that face from FeatureHub:

```python
# Remove face by ID
success = isf.feature_hub_face_remove(face_id)
if success:
    print(f"Face with ID {face_id} removed successfully")
else:
    print(f"Failed to remove face with ID {face_id}")
```

### Update Face Embedding

You can replace the existing feature vectors in the database through the update interface:

```python
# Update existing face with new feature
new_feature = session.face_feature_extract(new_image, new_face)
updated_identity = isf.FaceIdentity(new_feature, id=existing_id)

success = isf.feature_hub_face_update(updated_identity)
if success:
    print(f"Face with ID {existing_id} updated successfully")
else:
    print(f"Failed to update face with ID {existing_id}")
```

### Get Face Embedding from ID

You can quickly obtain FaceIdentity related information through a face ID:

```python
# Retrieve face identity by ID
face_identity = isf.feature_hub_get_face_identity(face_id)
if face_identity:
    print(f"Retrieved face with ID: {face_identity.id}")
    print(f"Feature shape: {face_identity.feature.shape}")
else:
    print(f"Face with ID {face_id} not found")
```

### Dynamic Search Threshold Adjustment

You can dynamically modify FeatureHub's search threshold in different scenarios:

```python
# Set new search threshold
isf.feature_hub_set_search_threshold(0.6)
```

### Database Management

Additional utility functions for database management:

```python
# Get total face count
total_faces = isf.feature_hub_get_face_count()
print(f"Total faces in database: {total_faces}")

# Get list of all face IDs
face_ids = isf.feature_hub_get_face_id_list()
print(f"Face IDs: {face_ids}")

# View database table in terminal (for debugging)
isf.view_table_in_terminal()
```

## [Example]Face Detect and Pipeline

Face detection and some use cases of face attribute analysis:

```python
import os
import cv2
import inspireface as isf
import click
import numpy as np

race_tags = ["Black", "Asian", "Latino/Hispanic", "Middle Eastern", "White"]
gender_tags = ["Female", "Male", ]
age_bracket_tags = ["0-2 years old", "3-9 years old", "10-19 years old", "20-29 years old", "30-39 years old",
                    "40-49 years old", "50-59 years old", "60-69 years old", "more than 70 years old"]

@click.command()
@click.argument('image_path')
def case_face_detection_image(image_path):
    """
    This is a sample application for face detection and tracking using an image.
    It also includes pipeline extensions such as RGB liveness, mask detection, and face quality evaluation.
    """
    # Optional features, loaded during session creation based on the modules specified.
    opt = isf.HF_ENABLE_FACE_RECOGNITION | isf.HF_ENABLE_QUALITY | isf.HF_ENABLE_MASK_DETECT | isf.HF_ENABLE_LIVENESS | isf.HF_ENABLE_INTERACTION | isf.HF_ENABLE_FACE_ATTRIBUTE
    session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

    # Set detection confidence threshold
    session.set_detection_confidence_threshold(0.5)

    # Load the image using OpenCV.
    image = cv2.imread(image_path)
    assert image is not None, "Please check that the image path is correct."

    # Perform face detection on the image.
    faces = session.face_detection(image)
    print(f"face detection: {len(faces)} found")
    
    # Copy the image for drawing the bounding boxes.
    draw = image.copy()
    for idx, face in enumerate(faces):
        print(f"{'==' * 20}")
        print(f"idx: {idx}")
        print(f"detection confidence: {face.detection_confidence}")
        # Print Euler angles of the face.
        print(f"roll: {face.roll}, yaw: {face.yaw}, pitch: {face.pitch}")

        # Get face bounding box
        x1, y1, x2, y2 = face.location

        # Calculate center, size, and angle
        center = ((x1 + x2) / 2, (y1 + y2) / 2)
        size = (x2 - x1, y2 - y1)
        angle = face.roll

        # Apply rotation to the bounding box corners
        rect = ((center[0], center[1]), (size[0], size[1]), angle)
        box = cv2.boxPoints(rect)
        box = box.astype(int)

        # Draw the rotated bounding box
        cv2.drawContours(draw, [box], 0, (100, 180, 29), 2)

        # Draw landmarks
        lmk = session.get_face_dense_landmark(face)
        for x, y in lmk.astype(int):
            cv2.circle(draw, (x, y), 0, (220, 100, 0), 2)

    # Features must be enabled during session creation to use them here.
    select_exec_func = isf.HF_ENABLE_QUALITY | isf.HF_ENABLE_MASK_DETECT | isf.HF_ENABLE_LIVENESS | isf.HF_ENABLE_INTERACTION | isf.HF_ENABLE_FACE_ATTRIBUTE
    # Execute the pipeline to obtain richer face information.
    extends = session.face_pipeline(image, faces, select_exec_func)
    for idx, ext in enumerate(extends):
        print(f"{'==' * 20}")
        print(f"idx: {idx}")
        # For these pipeline results, you can set thresholds based on the specific scenario to make judgments.
        print(f"quality: {ext.quality_confidence}")
        print(f"rgb liveness: {ext.rgb_liveness_confidence}")
        print(f"face mask: {ext.mask_confidence}")
        print(
            f"face eyes status: left eye: {ext.left_eye_status_confidence} right eye: {ext.right_eye_status_confidence}")
        print(f"gender: {gender_tags[ext.gender]}")
        print(f"race: {race_tags[ext.race]}")
        print(f"age: {age_bracket_tags[ext.age_bracket]}")

    # Save the annotated image to the 'tmp/' directory.
    save_path = os.path.join("tmp/", "det.jpg")
    cv2.imwrite(save_path, draw)
    print(f"\nSave annotated image to {save_path}")


if __name__ == '__main__':
    os.makedirs("tmp", exist_ok=True)
    case_face_detection_image()
```

## [Example]Face Comparison

Face comparison 1:1 use case: 

```python
import cv2
import inspireface as isf
import click

@click.command()
@click.argument('image_path1')
@click.argument('image_path2') 
def case_face_comparison(image_path1, image_path2):
    """
    This is a sample application for comparing two face images.
    Args:
        image_path1 (str): Path to the first face image
        image_path2 (str): Path to the second face image
    """
    # Enable face recognition features
    opt = isf.HF_ENABLE_FACE_RECOGNITION
    session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

    # Load and check the first image
    image1 = cv2.imread(image_path1)
    assert image1 is not None, "Failed to load first image"
    
    # Load and check the second image  
    image2 = cv2.imread(image_path2)
    assert image2 is not None, "Failed to load second image"

    # Detect faces in first image
    faces1 = session.face_detection(image1)
    assert faces1, "No face detected in first image"
    face1 = faces1[0]  # Use the first detected face

    # Detect faces in second image
    faces2 = session.face_detection(image2)
    assert faces2, "No face detected in second image"
    face2 = faces2[0]  # Use the first detected face

    # Extract features
    feature1 = session.face_feature_extract(image1, face1)
    feature2 = session.face_feature_extract(image2, face2)

    # Calculate similarity score between the two faces
    similarity = isf.feature_comparison(feature1, feature2)
    
    print(f"The cosine similarity score: {similarity:.4f}")
    print(f"{'Same person' if similarity > isf.get_recommended_cosine_threshold() else 'Different person'}")

    percentage = isf.cosine_similarity_convert_to_percentage(similarity)
    print(f"The percentage similarity: {percentage:.4f}")


if __name__ == '__main__':
    case_face_comparison()

```

## [Example]Face Recognition with FeatureHub

Face recognition system using FeatureHub for face database management:

```python
import os
import cv2
import inspireface as isf
import click

@click.command()
@click.argument('test_data_folder')
def case_face_recognition(test_data_folder):
    """
    Launches the face recognition system, inserts face features into a database, and performs searches.
    """
    # Enable face recognition features
    opt = isf.HF_ENABLE_FACE_RECOGNITION
    session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_ALWAYS_DETECT)

    # Configure the feature management system
    feature_hub_config = isf.FeatureHubConfiguration(
        primary_key_mode=isf.HF_PK_AUTO_INCREMENT,
        enable_persistence=False,  # Use memory mode for this example
        persistence_db_path="",
        search_threshold=0.48,
        search_mode=isf.HF_SEARCH_MODE_EAGER,
    )
    ret = isf.feature_hub_enable(feature_hub_config)
    assert ret, "Failed to enable FeatureHub."

    # Insert face features from 'bulk' directory
    bulk_path = os.path.join(test_data_folder, "bulk")
    assert os.path.exists(bulk_path), "Bulk directory does not exist."

    insert_images = [os.path.join(bulk_path, path) for path in os.listdir(bulk_path) if path.endswith(".jpg")]
    for idx, image_path in enumerate(insert_images):
        image = cv2.imread(image_path)
        assert image is not None, f"Failed to load image {image_path}"
        faces = session.face_detection(image)
        if faces:
            face = faces[0]  # Assume the most prominent face is what we want
            feature = session.face_feature_extract(image, face)
            identity = isf.FaceIdentity(feature, id=idx)
            ret, alloc_id = isf.feature_hub_face_insert(identity)
            assert ret, "Failed to insert face."

    count = isf.feature_hub_get_face_count()
    print(f"Number of faces inserted: {count}")

    # Search for a similar face using a query image
    query_image_path = os.path.join(test_data_folder, "query.jpg")
    query_image = cv2.imread(query_image_path)
    assert query_image is not None, f"Failed to load query image"
    
    faces = session.face_detection(query_image)
    assert faces, "No faces detected in query image."
    face = faces[0]
    feature = session.face_feature_extract(query_image, face)

    # Single search
    search_result = isf.feature_hub_face_search(feature)
    if search_result.similar_identity.id != -1:
        print(f"Found similar identity with ID: {search_result.similar_identity.id}")
        print(f"Confidence: {search_result.confidence:.2f}")
    else:
        print("No similar identity found.")

    # Top-k search
    print("Top-k similar identities:")
    search_top_k = isf.feature_hub_face_search_top_k(feature, 5)
    for idx, (conf, _id) in enumerate(search_top_k):
        print(f"  Top-{idx + 1}: ID: {_id}, Confidence: {conf:.2f}")


if __name__ == '__main__':
    case_face_recognition()
```

## [Example]Video Face Tracking

Real-time face tracking from video source with action detection:

```python
import time
import click
import cv2
import inspireface as isf
import numpy as np

def generate_color(id):
    """Generate a bright color based on the given integer ID."""
    if id < 0:
        return (128, 128, 128)  # Gray for invalid ID
        
    max_id = 50
    id = id % max_id
    hue = int((id * 360 / max_id) % 360)
    saturation = 200 + (55 * id) % 55
    value = 200 + (55 * id) % 55

    hsv_color = np.uint8([[[hue, saturation, value]]])
    rgb_color = cv2.cvtColor(hsv_color, cv2.COLOR_HSV2BGR)[0][0]
    return (int(rgb_color[0]), int(rgb_color[1]), int(rgb_color[2]))

@click.command()
@click.argument('source')
@click.option('--show', is_flag=True, help='Display the video stream.')
@click.option('--out', type=str, default=None, help='Path to save processed video.')
def case_face_tracker_from_video(source, show, out):
    """
    Launch face tracking from video source.
    Args:
        source: Webcam index (0, 1, ...) or path to video file
        show: Display video window if set
        out: Output video file path if provided
    """
    # Enable interaction features for action detection
    opt = isf.HF_ENABLE_NONE | isf.HF_ENABLE_INTERACTION
    session = isf.InspireFaceSession(opt, isf.HF_DETECT_MODE_LIGHT_TRACK, max_detect_num=25, detect_pixel_level=320)
    
    # Configure tracking parameters
    session.set_track_mode_smooth_ratio(0.06)
    session.set_track_mode_num_smooth_cache_frame(15)
    session.set_filter_minimum_face_pixel_size(0)
    session.set_track_model_detect_interval(0)

    # Open video source
    try:
        source_index = int(source)
        print(f"Using webcam at index {source_index}.")
        cap = cv2.VideoCapture(source_index)
    except ValueError:
        print(f"Opening video file at {source}.")
        cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print("Error: Could not open video source.")
        return

    # Setup video writer if output path provided
    out_video = None
    if out:
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        fps = cap.get(cv2.CAP_PROP_FPS) if cap.get(cv2.CAP_PROP_FPS) > 0 else 30
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out_video = cv2.VideoWriter(out, fourcc, fps, (frame_width, frame_height))
        print(f"Saving video to: {out}")

    # Main processing loop
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Detect and track faces
        faces = session.face_detection(frame)
        
        # Execute pipeline for action detection
        exts = session.face_pipeline(frame, faces, isf.HF_ENABLE_INTERACTION)

        # Draw results
        for idx, face in enumerate(faces):
            x1, y1, x2, y2 = face.location
            center = ((x1 + x2) / 2, (y1 + y2) / 2)
            size = (x2 - x1, y2 - y1)
            angle = face.roll

            # Create rotated bounding box
            rect = ((center[0], center[1]), (size[0], size[1]), angle)
            box = cv2.boxPoints(rect).astype(int)
            
            # Get unique color for this track ID
            color = generate_color(face.track_id)
            
            # Draw bounding box
            cv2.drawContours(frame, [box], 0, color, 4)
            
            # Draw landmarks
            lmk = session.get_face_dense_landmark(face)
            for x, y in lmk.astype(int):
                cv2.circle(frame, (x, y), 0, color, 4)

            # Detect and display actions
            if idx < len(exts):
                ext = exts[idx]
                actions = []
                if ext.action_normal:
                    actions.append("Normal")
                if ext.action_jaw_open:
                    actions.append("Jaw Open")
                if ext.action_shake:
                    actions.append("Shake")
                if ext.action_blink:
                    actions.append("Blink")
                if ext.action_head_raise:
                    actions.append("Head Raise")
                
                # Display actions text
                if actions:
                    action_text = ", ".join(actions)
                    cv2.putText(frame, action_text, (x1, y1 - 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # Display track ID
            text = f"ID: {face.track_id}, Count: {face.track_count}"
            cv2.putText(frame, text, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Show frame
        if show:
            cv2.imshow("Face Tracker", frame)
            if cv2.waitKey(25) & 0xFF == ord('q'):
                break

        # Write frame to output video
        if out_video:
            out_video.write(frame)

    # Cleanup
    cap.release()
    if out_video:
        out_video.release()
    cv2.destroyAllWindows()
    print("Released all resources and closed windows.")


if __name__ == '__main__':
    case_face_tracker_from_video()
```

## Advanced Configuration

### Session Parameters

You can fine-tune session behavior using various parameters:

```python
# Create session with custom parameters
session = isf.InspireFaceSession(
    param=opt,
    detect_mode=isf.HF_DETECT_MODE_LIGHT_TRACK,
    max_detect_num=20,
    detect_pixel_level=320
)

# Configure detection thresholds
session.set_detection_confidence_threshold(0.7)
session.set_filter_minimum_face_pixel_size(64)

# Configure tracking smoothing (for tracking modes)
session.set_track_mode_smooth_ratio(0.05)
session.set_track_mode_num_smooth_cache_frame(10)
session.set_track_model_detect_interval(10)

# Configure landmark processing
session.set_landmark_augmentation_num(3)
```

### Utility Functions

Additional utility functions for system management:

```python
# Version information
print(f"InspireFace version: {isf.version()}")

# Logging control
isf.set_logging_level(isf.HF_LOG_INFO)
isf.disable_logging()  # Disable all logging

# Resource monitoring
isf.show_system_resource_statistics()

# Hardware configuration (if applicable)
if isf.check_cuda_device_support():
    print(f"CUDA devices available: {isf.get_num_cuda_devices()}")
    isf.set_cuda_device_id(0)  # Use first CUDA device
    isf.print_cuda_device_info()
```

### Image Format Support

InspireFace supports various image formats and rotations:

```python
# Different image formats
stream_bgr = isf.ImageStream.load_from_cv_image(image, isf.HF_STREAM_BGR)
stream_rgb = isf.ImageStream.load_from_cv_image(image, isf.HF_STREAM_RGB)

# Image rotation
stream_rotated = isf.ImageStream.load_from_cv_image(image, isf.HF_STREAM_BGR, isf.HF_CAMERA_ROTATION_90)

# From raw buffer
buffer_data = image.tobytes()
stream_buffer = isf.ImageStream.load_from_buffer(
    buffer_data, image.shape[1], image.shape[0], 
    isf.HF_STREAM_BGR, isf.HF_CAMERA_ROTATION_0
)

# Use custom image stream with session
faces = session.face_detection(stream_bgr)
```

This comprehensive documentation covers all major functionality of InspireFace Python API, from basic face detection to advanced features like face database management and real-time video tracking. Refer to the example code for practical implementation patterns.