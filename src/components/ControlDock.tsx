import { ChevronDown, ChevronUp, Compass, Eye, Navigation } from 'lucide-react';
import { CameraMode } from '../scene/DhakaSceneEngine';
import { LANDMARKS, LandmarkPreset } from '../scene/landmarks';

interface ControlDockProps {
  activeLandmark: LandmarkPreset;
  cameraMode: CameraMode;
  dockCollapsed: boolean;
  showDetails: boolean;
  altitude: number;
  coords: [number, number];
  onSelectLandmark: (id: string) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onToggleCollapse: () => void;
  onToggleDetails: () => void;
}

export function ControlDock({
  activeLandmark,
  cameraMode,
  dockCollapsed,
  showDetails,
  altitude,
  coords,
  onSelectLandmark,
  onChangeCameraMode,
  onToggleCollapse,
  onToggleDetails,
}: ControlDockProps) {
  return (
    <>
      {/* Minimal Top-Left Corridor Zone Title (Unobtrusive, No Pills, No Pulsing Dots) */}
      <header className="fixed top-4 left-4 z-20 pointer-events-auto max-w-[90vw]">
        <div className="border border-white/12 bg-[#0f131c]/90 px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-slate-50 whitespace-nowrap">
              Dhaka Corridor 3D
            </h1>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-sm font-medium text-amber-400 whitespace-nowrap">
              {activeLandmark.zoneBn}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span className="truncate max-w-[260px] sm:max-w-none">{activeLandmark.nameEn}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-slate-300 whitespace-nowrap">
              {activeLandmark.chainageKm}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden sm:inline font-mono-tabular text-slate-400 whitespace-nowrap">
              Alt {altitude}m ({coords[0]}, {coords[1]})
            </span>
          </div>
        </div>
      </header>

      {/* Collapsible Bottom Control Dock (Zero Center Viewport Occlusion) */}
      <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px] pointer-events-none flex flex-col items-center">
        {/* Collapse / Expand Handle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="pointer-events-auto flex items-center gap-1.5 border border-b-0 border-white/15 bg-[#0f131c]/92 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-amber-300 transition-colors rounded-t-md whitespace-nowrap shrink-0"
          aria-expanded={!dockCollapsed}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls · কন্ট্রোল দেখুন (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls · লুকান (H)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full border border-white/15 bg-[#0f131c]/92 shadow-2xl rounded-lg overflow-hidden">
            {/* Expandable Bilingual Landmark Description Drawer */}
            {showDetails && (
              <div className="border-b border-white/10 px-4 py-3 bg-[#141926]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    {activeLandmark.nameBn}
                    <span className="mx-2 text-slate-500">·</span>
                    <span className="text-amber-300 font-medium">{activeLandmark.nameEn}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {activeLandmark.highlights.join(' · ')}
                  </div>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  {activeLandmark.descriptionBn}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {activeLandmark.descriptionEn}
                </p>
              </div>
            )}

            {/* Landmark Preset Selector Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2.5 border-b border-white/10">
              {LANDMARKS.map((lm) => {
                const active = lm.id === activeLandmark.id;
                return (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => onSelectLandmark(lm.id)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 border ${
                      active
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                        : 'bg-[#171d2b] text-slate-300 border-white/10 hover:bg-[#1f2738] hover:text-white'
                    }`}
                  >
                    <span className="font-mono-tabular mr-1.5 opacity-75">{lm.index}.</span>
                    <span>{lm.nameBn.split(',')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Action Bar: Camera Mode, Traffic Speed, Landmark Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
              {/* Camera Mode Segmented Control */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#171d2b] p-0.5 rounded-md border border-white/10">
                  <button
                    type="button"
                    onClick={() => onChangeCameraMode('orbit')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      cameraMode === 'orbit'
                        ? 'bg-slate-100 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Orbit · অরবিট</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeCameraMode('fly')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      cameraMode === 'fly'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Free Fly · ফ্রি ফ্লাই (F)</span>
                  </button>
                </div>

                {cameraMode === 'fly' && (
                  <span className="hidden md:inline text-xs text-amber-300/90 font-mono-tabular whitespace-nowrap">
                    WASD · Q/E · Shift · Drag Look
                  </span>
                )}
              </div>

              {/* Landmark Info Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleDetails}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    showDetails
                      ? 'bg-slate-100 text-slate-950 border-slate-100'
                      : 'bg-[#171d2b] text-slate-200 border-white/10 hover:bg-[#1f2738]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details · তথ্য</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
