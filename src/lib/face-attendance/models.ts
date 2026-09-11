/**
 * Biometric Face Analysis & Recognition Engine
 * Provides dual support for:
 * 1. @vladmandic/human (3D FaceMesh, FaceRes 1024-d / InsightFace embeddings, Anti-spoofing)
 * 2. @vladmandic/face-api (Legacy 128-d fallback)
 */

let modelsLoaded = false;
let loadPromise: Promise<any> | null = null;
let humanInstance: any = null;
let humanLoadingPromise: Promise<any> | null = null;

/**
 * Initializes and warms up the Human AI engine in browser client environments.
 * Safe for Next.js SSR (guards against server execution).
 */
export async function getHumanInstance(modelBasePath = '/models/human'): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Human can only be initialized in browser client environments');
  }

  if (humanInstance) {
    return humanInstance;
  }

  if (humanLoadingPromise) {
    return humanLoadingPromise;
  }

  humanLoadingPromise = (async () => {
    try {
      const { Human } = await import('@vladmandic/human');

      const config = {
        modelBasePath,
        backend: 'webgl' as const,
        async: true,
        warmup: 'face',
        cacheSensitivity: 0.7,
        filter: {
          enabled: true,
          equalization: false,
          width: 0,
          height: 0,
          flip: false,
        },
        face: {
          enabled: true,
          detector: {
            modelPath: 'blazeface.json',
            rotation: true,
            maxDetected: 4,
            minConfidence: 0.45,
            iouThreshold: 0.2,
            return: true,
          },
          mesh: {
            enabled: true,
            modelPath: 'facemesh.json',
          },
          iris: {
            enabled: true,
            modelPath: 'iris.json',
          },
          description: {
            enabled: true,
            modelPath: 'faceres.json',
          },
          antispoof: {
            enabled: true,
            modelPath: 'antispoof.json',
          },
          liveness: {
            enabled: true,
            modelPath: 'liveness.json',
          },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      };

      const human = new Human(config as any);
      await human.load();
      await human.warmup();

      humanInstance = human;
      return human;
    } catch (err) {
      humanLoadingPromise = null;
      throw new Error(`Failed to initialize Human AI engine: ${err instanceof Error ? err.message : String(err)}`);
    }
  })();

  return humanLoadingPromise;
}

/**
 * Legacy face-api model loader for backward compatibility
 */
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
      await faceapi.nets.tinyFaceDetector.loadFromUri(modelsUri);
      await faceapi.nets.faceLandmark68Net.loadFromUri(modelsUri);
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
