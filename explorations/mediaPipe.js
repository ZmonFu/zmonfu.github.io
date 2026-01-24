import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

// make an object to export
const mediaPipe = {
  handednesses: [],
  landmarks: [],
  worldLandmarks: [],
};

let handLandmarker;
let runningMode = "VIDEO";
let lastVideoTime = -1;

// Before we can use HandLandmarker class we must wait for it to finish loading.
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },

    runningMode: runningMode,

    // ✅ beide Hände
    numHands: 2,

    // ✅ hilft oft, wenn die 2. Hand “wegfällt”
    // (zum Test ruhig niedriger lassen, später ggf. wieder hoch)
    minHandDetectionConfidence: 0.3,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
};

createHandLandmarker();

const predictWebcam = async (video) => {
  const startTimeMs = performance.now();

  if (handLandmarker && lastVideoTime !== video.elt.currentTime) {
    lastVideoTime = video.elt.currentTime;

    const results = handLandmarker.detectForVideo(video.elt, startTimeMs);

    mediaPipe.handednesses = results.handednesses || [];
    mediaPipe.landmarks = results.landmarks || [];
    mediaPipe.worldLandmarks = results.worldLandmarks || [];

    // Debug optional:
    console.log("hands:", mediaPipe.landmarks.length);
  }

  window.requestAnimationFrame(() => {
    predictWebcam(video);
  });
};

// add the predictWebcam function to the mediaPipe object
mediaPipe.predictWebcam = predictWebcam;

// export our object so we can use it globally
export { mediaPipe };
