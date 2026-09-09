/**
 * Model loader and runner for @vladmandic/face-api
 * Ensures models are loaded once and cached in memory.
 */

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadFaceApiModels(modelsUri = '/models/face'): Promise<typeof import('@vladmandic/face-api')> {
  const faceapi = await import('@vladmandic/face-api');

  if (modelsLoaded) {
    return faceapi;
  }

  if (loadPromise) {
    await loadPromise;
    return faceapi;
  }

  loadPromise = (async () => {
    try {
      // Load Tiny Face Detector (lightweight, ~190KB)
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelsUri);

      // Load 68-point landmarks (~350KB)
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelsUri);

      // Load Face Recognition 128-d descriptor model (~6.2MB)
      await faceapi.nets.faceRecognitionNet.loadFromUri(modelsUri);

      modelsLoaded = true;
    } catch (err) {
      loadPromise = null;
      throw new Error(`Failed to load face recognition models: ${err instanceof Error ? err.message : String(err)}`);
    }
  })();

  await loadPromise;
  return faceapi;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}
