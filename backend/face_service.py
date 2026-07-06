"""Face recognition using OpenCV + face_recognition (dlib).

Generates 128-d face encodings and matches probe encodings against stored
ones using Euclidean distance. OpenCV YuNet is used for ultra-fast, robust face detection.
"""
import os
import urllib.request
from typing import List, Optional, Tuple
import numpy as np
import cv2
import face_recognition

# A typical good match has distance < 0.6 (face_recognition recommended).
MATCH_THRESHOLD = 0.55

YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
YUNET_MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_detection_yunet_2023mar.onnx")

_yunet_detector = None
_yunet_size = (0, 0)


def _download_yunet():
    if not os.path.exists(YUNET_MODEL_PATH):
        print("Downloading YuNet face detection model...")
        try:
            # Add headers to avoid potential block/filtering
            req = urllib.request.Request(
                YUNET_MODEL_URL, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req) as response, open(YUNET_MODEL_PATH, 'wb') as out_file:
                out_file.write(response.read())
            print("YuNet model downloaded successfully.")
        except Exception as e:
            print(f"Error downloading YuNet model: {e}")
            # Raise exception so we don't try to load empty/broken model
            raise e


def _get_yunet_detector(width: int, height: int):
    global _yunet_detector, _yunet_size
    _download_yunet()
    if _yunet_detector is None or _yunet_size != (width, height):
        _yunet_detector = cv2.FaceDetectorYN.create(
            model=YUNET_MODEL_PATH,
            config="",
            input_size=(width, height),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000
        )
        _yunet_size = (width, height)
    return _yunet_detector


def _detect_faces_yunet(bgr_image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """Detect faces using YuNet and return boxes in (top, right, bottom, left) format."""
    h, w = bgr_image.shape[:2]
    detector = _get_yunet_detector(w, h)
    retval, faces = detector.detect(bgr_image)
    if faces is None:
        return []
    
    boxes = []
    for face in faces:
        # YuNet face layout: [x, y, w, h, x_re, y_re, ...]
        x, y, width, height = map(int, face[0:4])
        # Convert to dlib format: (top, right, bottom, left)
        top = max(0, y)
        left = max(0, x)
        bottom = min(h, y + height)
        right = min(w, x + width)
        boxes.append((top, right, bottom, left))
    return boxes


def encode_from_image_bytes(image_bytes: bytes) -> Optional[List[float]]:
    """Decode an uploaded image and return the first 128-d face encoding."""
    arr = np.frombuffer(image_bytes, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        return None
    boxes = _detect_faces_yunet(bgr)
    if not boxes:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb, boxes)
    if not encodings:
        return None
    return encodings[0].tolist()


def average_encodings(encodings: List[List[float]]) -> List[float]:
    """Average multiple 128-d encodings into a single robust encoding."""
    if not encodings:
        return []
    arr = np.array(encodings, dtype=np.float64)
    return arr.mean(axis=0).tolist()


def encode_from_frame(frame_bgr: np.ndarray) -> List[Tuple[Tuple[int, int, int, int], List[float]]]:
    """Detect & encode all faces in a single BGR frame.

    Returns list of ((top, right, bottom, left), encoding).
    """
    boxes = _detect_faces_yunet(frame_bgr)
    if not boxes:
        return []
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb, boxes)
    return list(zip(boxes, [e.tolist() for e in encodings]))


def find_best_match(
    probe: List[float],
    enrolled: List[Tuple[str, List[float]]],
    threshold: float = MATCH_THRESHOLD,
) -> Optional[Tuple[str, float]]:
    """Return (student_id, distance) of the best match or None."""
    if not enrolled or not probe:
        return None
    probe_np = np.array(probe)
    best = None
    for sid, enc in enrolled:
        dist = float(np.linalg.norm(probe_np - np.array(enc)))
        if best is None or dist < best[1]:
            best = (sid, dist)
    if best and best[1] <= threshold:
        return best
    return None
