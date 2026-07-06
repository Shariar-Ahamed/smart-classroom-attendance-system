"""Camera abstraction.

Today: webcam via OpenCV VideoCapture(0).
Later: swap to an RTSP/IP/CCTV URL by setting CAMERA_SOURCE in .env, e.g.
  CAMERA_SOURCE=rtsp://user:pass@192.168.1.10:554/stream
"""
import os
import threading
import time
from typing import Optional

import cv2


class CameraStream:
    """Thread-safe, single-instance camera reader."""

    _instance: Optional["CameraStream"] = None
    _lock = threading.Lock()

    def __init__(self, source=None):
        self.source = source if source is not None else _resolve_source()
        self.cap: Optional[cv2.VideoCapture] = None
        self.frame = None
        self.running = False
        self._thread: Optional[threading.Thread] = None

    @classmethod
    def instance(cls) -> "CameraStream":
        with cls._lock:
            if cls._instance is None:
                cls._instance = CameraStream()
            return cls._instance

    def start(self):
        if self.running:
            return
        self.cap = cv2.VideoCapture(self.source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Unable to open camera source: {self.source}")
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self):
        while self.running and self.cap is not None:
            ok, frame = self.cap.read()
            if ok:
                self.frame = frame
            else:
                time.sleep(0.05)

    def read(self):
        return self.frame

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join(timeout=1.0)
        if self.cap:
            self.cap.release()
        self.cap = None
        self.frame = None


def _resolve_source():
    src = os.getenv("CAMERA_SOURCE", "0")
    try:
        return int(src)
    except ValueError:
        return src  # treat as URL string (RTSP/HTTP)
