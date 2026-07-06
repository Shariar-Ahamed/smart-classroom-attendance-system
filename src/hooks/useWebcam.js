import { useEffect, useRef, useState } from "react";

/**
 * Manage a webcam MediaStream bound to a <video> element.
 * Returns { videoRef, ready, error, start, stop }.
 */
export function useWebcam(autoStart = false) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setReady(false);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (e) {
      const msg = e.message || "Unable to access webcam";
      setError(
        msg.includes("Permission") || msg.includes("denied")
          ? "Camera permission denied. Please allow camera access."
          : msg.includes("NotFound")
            ? "No camera detected on this device."
            : msg,
      );
      setReady(false);
    }
  };

  useEffect(() => {
    if (autoStart) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, ready, error, start, stop };
}