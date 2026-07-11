# Integration Plan: IP Camera & CCTV Stream Deployment

If you plan to deploy **Smart Attend AI** using an IP Camera or CCTV feed instead of a standard USB laptop webcam, here is the technical architecture, changes required, and deployment plan.

---

## 1. How CCTV/IP Cameras work in Web Apps
CCTV/IP cameras broadcast video using **RTSP (Real-Time Streaming Protocol)** (e.g., `rtsp://admin:password@192.168.1.100:554/stream`).
> [!IMPORTANT]
> Web browsers **cannot natively play RTSP streams**. 
> To show a CCTV stream on a web page, you must bridge the stream.

You have two primary architectural options to implement this:

---

## 2. Option A: Browser-Side Processing (Easiest Migration)
In this option, you convert the RTSP stream into a web-friendly format in your Python backend, and send it to the React frontend.

```mermaid
graph TD
    CCTV[IP / CCTV Camera] -->|RTSP Stream| PY[Python Transcoder Server]
    PY -->|WebRTC / MJPEG Stream| React[React Frontend Video Element]
    React -->|face-api.js| ML[Browser AI Recognition]
    ML -->|Match Found| DB[(MongoDB Atlas)]
```

### What changes in the code:
1. **Remove Video Mirroring:**
   CCTV streams capture the room naturally (they do not act as a selfie mirror). You must remove the `-scale-x-100` mirroring class from the `<video>` element.
2. **Toggle Coordinate Mirroring:**
   In `LiveAttendance.jsx`, toggle the horizontal calculation in `toOverlayStyle` back to standard coordinates:
   ```javascript
   // For normal CCTV (non-mirrored) streams:
   const left = `${(box.x / vw) * 100}%`;
   ```
   > [!TIP]
   > We can easily add a checkbox or switch in the UI: **"Mirror Camera View"** which toggles this setting dynamically!

---

## 3. Option B: Server-Side Processing (Recommended for Industrial Scale)
Instead of streaming high-resolution video to the teacher's browser and running heavy ML inside React, your Python backend processes the CCTV feed directly.

![IP / CCTV Diagram](./ip-cctv-diagram.png)

### How this works:
1. **Python OpenCV Loop:**
   The Python backend connects to the RTSP stream using `opencv-python`:
   ```python
   import cv2
   cap = cv2.VideoCapture("rtsp://admin:password@192.168.1.100:554/stream1")
   ```
2. **Continuous Recognition:**
   The backend extracts frames, runs face detection, and matches embeddings using your existing backend encodings database.
3. **Real-time Frontend Push:**
   When a student is matched, the backend triggers:
   - MongoDB update (`attendance_service.py`).
   - Pushes a WebSocket message (using a library like `Socket.io`) containing the student's name and match confidence to the React app.
4. **React Toast Action:**
   The React frontend listens to the WebSocket server. When it receives a check-in event, it pops up the green toast notification and adds the student to the Live Activity Feed in real-time.

---

## 4. Key Environmental Requirements for CCTV
* **Lighting:** Since CCTV cameras are typically mounted high up or in corners, ensure the classroom doorway or scanning zone is well-lit.
* **Camera Angle & Resolution:** The camera should be positioned at head height or slightly above, pointing towards the incoming flow of students. A minimum resolution of **1080p** is recommended for accurate multi-face matching from a distance.
