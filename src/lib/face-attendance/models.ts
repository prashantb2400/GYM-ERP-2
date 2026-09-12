/**
 * Biometric Face Analysis & Recognition Engine
 * Production ResNet-34 (128-D) + 68-Landmark Net + TinyFaceDetector
 * Powered by @vladmandic/face-api
 */

import type * as FaceApiType from '@vladmandic/face-api';

let faceApiInstance: typeof FaceApiType | null = null;
let loadPromise: Promise<typeof FaceApiType> | null = null;
let modelsLoaded = false;

/**
 * Initializes and warms up the Face-API neural models (WebGL / WASM).
 * Safe for Next.js SSR (guards against server execution).
 */
export async function loadFaceApiModels(modelsUri = '/models/face'): Promise<typeof FaceApiType> {
  if (typeof window === 'undefined') {
    throw new Error('Face-api models can only be initialized in browser client environments');
  }

  if (faceApiInstance && modelsLoaded) {
    return faceApiInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelsUri),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsUri),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsUri),
      ]);
      modelsLoaded = true;
      faceApiInstance = faceapi;
      return faceapi;
    } catch (err) {
      loadPromise = null;
      modelsLoaded = false;
      throw new Error(`Failed to load face recognition models: ${err instanceof Error ? err.message : String(err)}`);
    }
  })();

  return loadPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}
