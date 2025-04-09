# Using InspireFace in Python

The python version of inspireface is based on ctypes and the standard edition of InspireFaceSDK libraries, and usually requires **python >= 3.7**.

## Installation and Setup

You can use pip to install the InspireFace Python package:

```bash
pip install -U inspireface
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