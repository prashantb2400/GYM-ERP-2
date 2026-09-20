/**
 * Vision Watchdog for Android Tablet Kiosk.
 * Hardware-accelerated continuous face detection and local descriptor Euclidean matching.
 */

let faceapiInstance: any = null;

async function getFaceApi() {
  if (typeof window === 'undefined') return null;
  if (!faceapiInstance) {
    faceapiInstance = await import('@vladmandic/face-api');
  }
  return faceapiInstance;
}

export interface WatchdogMatchResult {
  matchType: 'member' | 'guest' | 'none';
  member?: {
    id: string;
    name: string;
    memberCode: string;
    photoUrl?: string;
    totalDue: number;
    daysRemaining: number;
    lockerNumber?: string;
  };
  distance?: number;
}

export class VisionWatchdog {
  private isRunning: boolean = false;
  private videoEl: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;
  private modelsLoaded: boolean = false;
  private enrolledRoster: Array<{
    id: string;
    name: string;
    memberCode: string;
    photoUrl?: string;
    totalDue: number;
    daysRemaining: number;
    lockerNumber?: string;
    descriptor: Float32Array;
  }> = [];

  private consecutiveFaceFrames: number = 0;
  private lastMatchTime: number = 0;
  private matchCooldownMs: number = 5000; // 5 seconds between matches

  public async loadModels(modelUri = '/models'): Promise<boolean> {
    if (this.modelsLoaded) return true;
    try {
      const faceapi = await getFaceApi();
      if (!faceapi) return false;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUri),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUri),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUri),
      ]);
      this.modelsLoaded = true;
      return true;
    } catch (err) {
      console.warn('Could not load face-api models from', modelUri, err);
      return false;
    }
  }

  public setRoster(members: any[]) {
    this.enrolledRoster = members
      .filter((m) => m.face_descriptor && Array.isArray(m.face_descriptor))
      .map((m) => ({
        id: m.id,
        name: m.name,
        memberCode: m.member_code,
        photoUrl: m.photo_url,
        totalDue: Number(m.total_due || 0),
        daysRemaining: m.days_remaining || 30,
        lockerNumber: m.locker_number,
        descriptor: new Float32Array(m.face_descriptor),
      }));
  }

  public start(
    video: HTMLVideoElement,
    onResult: (res: WatchdogMatchResult) => void
  ) {
    if (this.isRunning) return;
    this.videoEl = video;
    this.isRunning = true;
    this.consecutiveFaceFrames = 0;

    const loop = async () => {
      if (!this.isRunning || !this.videoEl) return;

      if (this.videoEl.readyState >= 2 && this.modelsLoaded) {
        try {
          const faceapi = faceapiInstance || await getFaceApi();
          if (!faceapi) return;
          const now = Date.now();
          if (now - this.lastMatchTime > this.matchCooldownMs) {
            const detection = await faceapi
              .detectSingleFace(this.videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
              .withFaceLandmarks(true)
              .withFaceDescriptor();

            if (detection) {
              this.consecutiveFaceFrames++;

              // Once a face has been stable for 3 consecutive frames
              if (this.consecutiveFaceFrames >= 3) {
                const liveDescriptor = detection.descriptor;
                let bestMatch: any = null;
                let minDistance = 1.0;

                for (const member of this.enrolledRoster) {
                  const dist = faceapi.euclideanDistance(liveDescriptor, member.descriptor);
                  if (dist < minDistance) {
                    minDistance = dist;
                    bestMatch = member;
                  }
                }

                // Distance threshold: <= 0.45 is a high confidence match
                if (bestMatch && minDistance <= 0.45) {
                  this.lastMatchTime = Date.now();
                  this.consecutiveFaceFrames = 0;
                  onResult({
                    matchType: 'member',
                    member: bestMatch,
                    distance: minDistance,
                  });
                } else if (this.consecutiveFaceFrames >= 8) {
                  // Unknown person standing in front of kiosk
                  this.lastMatchTime = Date.now();
                  this.consecutiveFaceFrames = 0;
                  onResult({ matchType: 'guest' });
                }
              }
            } else {
              this.consecutiveFaceFrames = Math.max(0, this.consecutiveFaceFrames - 1);
            }
          }
        } catch {
          // Frame error handled silently
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}

export const visionWatchdog = new VisionWatchdog();
