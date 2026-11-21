import { useCallback, useEffect, useMemo, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { SceneViewport } from './components/SceneViewport';
import { CameraMode } from './scene/DhakaSceneEngine';
import { LANDMARKS } from './scene/landmarks';

export default function App() {
  const [activeLandmarkId, setActiveLandmarkId] = useState<string>(LANDMARKS[0].id);
  const [jumpNonce, setJumpNonce] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [altitude, setAltitude] = useState<number>(26);
  const [coords, setCoords] = useState<[number, number]>([-52, 398]);

  const activeLandmark = useMemo(
    () => LANDMARKS.find((l) => l.id === activeLandmarkId) ?? LANDMARKS[0],
    [activeLandmarkId],
  );

  const handleSelectLandmark = useCallback((id: string) => {
    setActiveLandmarkId(id);
    setJumpNonce((n) => n + 1);
  }, []);

  const handleTelemetry = useCallback((alt: number, xz: [number, number]) => {
    setAltitude(alt);
    setCoords(xz);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyF') {
        setCameraMode((prev) => (prev === 'orbit' ? 'fly' : 'orbit'));
      } else {
        const keyMap: Record<string, number> = {
          '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
          '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11,
        };
        if (e.key in keyMap && LANDMARKS[keyMap[e.key]]) {
          handleSelectLandmark(LANDMARKS[keyMap[e.key]].id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectLandmark]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0F17]">
      <SceneViewport
        activeLandmarkId={activeLandmarkId}
        cameraMode={cameraMode}
        jumpNonce={jumpNonce}
        onLandmarkSelect={setActiveLandmarkId}
        onTelemetry={handleTelemetry}
      />
      <ControlDock
        activeLandmark={activeLandmark}
        cameraMode={cameraMode}
        dockCollapsed={dockCollapsed}
        showDetails={showDetails}
        altitude={altitude}
        coords={coords}
        onSelectLandmark={handleSelectLandmark}
        onChangeCameraMode={setCameraMode}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        onToggleDetails={() => setShowDetails((prev) => !prev)}
      />
    </main>
  );
}
