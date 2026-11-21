import { useEffect, useRef, useState } from 'react';
import { CameraMode, DhakaSceneEngine } from '../scene/DhakaSceneEngine';
import { LANDMARKS, LandmarkPreset } from '../scene/landmarks';

interface SceneViewportProps {
  activeLandmarkId: string;
  cameraMode: CameraMode;
  jumpNonce: number;
  onLandmarkSelect: (id: string) => void;
  onTelemetry: (altitude: number, coords: [number, number]) => void;
}

export function SceneViewport({
  activeLandmarkId,
  cameraMode,
  jumpNonce,
  onLandmarkSelect,
  onTelemetry,
}: SceneViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DhakaSceneEngine | null>(null);
  const callbacksRef = useRef({ onLandmarkSelect, onTelemetry });
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onLandmarkSelect, onTelemetry };
  }, [onLandmarkSelect, onTelemetry]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const engine = new DhakaSceneEngine(container, {
        onLandmarkSelect: (id) => callbacksRef.current.onLandmarkSelect(id),
        onCameraTelemetry: (alt, coords) => callbacksRef.current.onTelemetry(alt, coords),
      });
      engineRef.current = engine;

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize Dhaka 3D scene:', err);
      setWebglError(true);
    }
  }, []);

  useEffect(() => {
    engineRef.current?.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    if (jumpNonce === 0) return;
    const lm: LandmarkPreset | undefined = LANDMARKS.find((l) => l.id === activeLandmarkId);
    if (lm) {
      engineRef.current?.flyToLandmark(lm);
    }
  }, [activeLandmarkId, jumpNonce]);

  if (webglError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0B0F17] p-8 text-center">
        <div className="max-w-md border border-white/10 bg-[#111622] p-6">
          <h2 className="text-lg font-semibold text-white">3D Viewport Unavailable</h2>
          <p className="mt-2 text-sm text-slate-400">
            WebGL rendering could not be initialized in this browser environment.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mountRef} className="fixed inset-0 w-screen h-screen cursor-grab active:cursor-grabbing" />;
}
