// Real ML-powered face detection + recognition for the browser.
//
// Uses @vladmandic/face-api (a maintained fork of face-api.js) which ships:
//   - TinyFaceDetector       → fast multi-face detection
//   - FaceLandmark68Net      → 68 facial landmarks (for alignment)
//   - FaceRecognitionNet     → 128-d FaceNet-style descriptors
//
// Model weights are loaded on demand from a CDN (~6 MB total, cached by
// the browser after first load). Descriptors are 128-d and conceptually
// equivalent to the ones produced by Python `face_recognition` on the
// server, so matching uses Euclidean distance with the standard ~0.5–0.6
// threshold.

import * as faceapi from "@vladmandic/face-api";

const LOCAL_MODEL_URL = "/models";
const CDN_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

async function testModelPath(url) {
  try {
    const res = await fetch(`${url}/tiny_face_detector_model-weights_manifest.json`);
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return false;
    }
    await res.json();
    return true;
  } catch {
    return false;
  }
}

// --------- model loading (lazy, singleton) ---------

let loadPromise = null;
let loaded = false;

export function isFaceModelLoaded() {
  return loaded;
}

export function loadFaceModel() {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    let activeUrl = LOCAL_MODEL_URL;
    const isLocalValid = await testModelPath(activeUrl);
    if (!isLocalValid) {
      activeUrl = CDN_MODEL_URL;
    }
    await faceapi.nets.tinyFaceDetector.loadFromUri(activeUrl);
    await faceapi.nets.faceLandmark68Net.loadFromUri(activeUrl);
    await faceapi.nets.faceRecognitionNet.loadFromUri(activeUrl);
    loaded = true;
  })();
  return loadPromise;
}

// --------- detection helpers ---------

const detectorOptions = () =>
  new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,      // 224 / 320 / 416 / 512 — 320 is a good speed/accuracy balance
    scoreThreshold: 0.5,
  });

/** Detect ALL faces in a frame and compute their 128-d descriptors. */
export async function detectAllFaces(video) {
  if (!loaded) return [];
  if (!video.videoWidth || !video.videoHeight) return [];

  const results = await faceapi
    .detectAllFaces(video, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r) => ({
    box: {
      x: r.detection.box.x,
      y: r.detection.box.y,
      width: r.detection.box.width,
      height: r.detection.box.height,
    },
    descriptor: Array.from(r.descriptor),
    score: r.detection.score,
  }));
}

/** Detect the single best face — used during registration. */
export async function detectSingleFace(video) {
  if (!loaded) return null;
  if (!video.videoWidth || !video.videoHeight) return null;

  const r = await faceapi
    .detectSingleFace(video, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!r) return null;
  return {
    box: {
      x: r.detection.box.x,
      y: r.detection.box.y,
      width: r.detection.box.width,
      height: r.detection.box.height,
    },
    descriptor: Array.from(r.descriptor),
    score: r.detection.score,
    landmarks: r.landmarks.positions,
  };
}

// --------- matching ---------

export function euclideanDistance(a, b) {
  if (a.length !== b.length || a.length === 0) return Infinity;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Average several 128-d descriptors into one robust encoding. */
export function averageDescriptors(descs) {
  if (descs.length === 0) return [];
  const len = descs[0].length;
  const out = new Array(len).fill(0);
  for (const d of descs) for (let i = 0; i < len; i++) out[i] += d[i];
  for (let i = 0; i < len; i++) out[i] /= descs.length;
  return out;
}

/** Best match for one probe descriptor under a distance threshold. */
export function findMatch(probe, enrolled, threshold = 0.55) {
  let best = null;
  for (const e of enrolled) {
    const d = euclideanDistance(probe, e.face_encoding);
    if (!isFinite(d)) continue;
    if (!best || d < best.distance) best = { student_id: e.student_id, distance: d };
  }
  if (!best || best.distance > threshold) return null;
  return best;
}

/**
 * Recognize EVERY face in a frame and return the best match per student
 * (so two overlapping detections can't claim the same person twice).
 */
export async function recognizeAllFaces(video, enrolled, threshold = 0.55) {
  if (enrolled.length === 0) return [];
  const faces = await detectAllFaces(video);

  const perStudent = new Map();
  for (const f of faces) {
    const m = findMatch(f.descriptor, enrolled, threshold);
    if (!m) continue;
    const prev = perStudent.get(m.student_id);
    if (!prev || m.distance < prev.match.distance) {
      perStudent.set(m.student_id, { box: f.box, match: m, score: f.score });
    }
  }
  return Array.from(perStudent.values());
}
