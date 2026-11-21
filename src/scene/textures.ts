import * as THREE from 'three';

export interface ProceduralTextures {
  roadMain: THREE.CanvasTexture;
  road300ft: THREE.CanvasTexture;
  roadService: THREE.CanvasTexture;
  metroTrack: THREE.CanvasTexture;
  runway: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  concrete: THREE.CanvasTexture;
  glassTowerCool: THREE.CanvasTexture;
  glassTowerWarm: THREE.CanvasTexture;
  glassShowroom: THREE.CanvasTexture;
  commercialFacade: THREE.CanvasTexture;
  brickFacade: THREE.CanvasTexture;
  creamFacade: THREE.CanvasTexture;
  waterNormal: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  grassGround: THREE.CanvasTexture;
  poleBanners: THREE.CanvasTexture[];
  signTextures: Record<string, THREE.CanvasTexture>;
  dispose: () => void;
}

function configureColorTex(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(anisotropy, 16);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

function createAsphaltCanvas(lanes: number, hasYellowEdge: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Realistic Dhaka bitumen asphalt base
  ctx.fillStyle = '#2d333d';
  ctx.fillRect(0, 0, 512, 512);

  // Fine mineral asphalt aggregate grain
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 34 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 7})`;
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
  }

  // Subtle dual wheel-track wear & lane crown shading
  const laneWidth = 512 / lanes;
  for (let l = 0; l < lanes; l++) {
    const cx = l * laneWidth + laneWidth * 0.5;
    const grad = ctx.createLinearGradient(cx - laneWidth * 0.42, 0, cx + laneWidth * 0.42, 0);
    grad.addColorStop(0, 'rgba(18,22,28,0)');
    grad.addColorStop(0.28, 'rgba(15,18,24,0.22)');
    grad.addColorStop(0.5, 'rgba(55,62,74,0.08)');
    grad.addColorStop(0.72, 'rgba(15,18,24,0.22)');
    grad.addColorStop(1, 'rgba(18,22,28,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(l * laneWidth, 0, laneWidth, 512);
  }

  // Crisp median-side edge line (left U=0) & outer shoulder white line (right U=1)
  ctx.fillStyle = hasYellowEdge ? '#facc15' : '#f1f5f9';
  ctx.fillRect(10, 0, 10, 512);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(492, 0, 10, 512);

  // Crisp dashed white lane dividers
  ctx.fillStyle = 'rgba(248, 250, 252, 0.96)';
  for (let l = 1; l < lanes; l++) {
    const x = l * laneWidth - 5;
    for (let y = 12; y < 512; y += 128) {
      ctx.fillRect(x, y, 10, 66);
    }
  }

  return canvas;
}

function createMetroTrackCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Light grey concrete slab trackbed
  ctx.fillStyle = '#8e96a0';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete rail sleepers (ties) for two tracks (left & right)
  ctx.fillStyle = '#646e7a';
  for (let y = 0; y < 512; y += 32) {
    ctx.fillRect(54, y + 6, 162, 14);
    ctx.fillRect(296, y + 6, 162, 14);
  }

  // Center acoustic divider strip
  ctx.fillStyle = '#475569';
  ctx.fillRect(246, 0, 20, 512);

  // Steel running rails (4 rails total)
  ctx.fillStyle = '#cbd5e1';
  for (const rx of [88, 178, 330, 420]) {
    ctx.fillRect(rx, 0, 9, 512);
    ctx.fillStyle = '#334155';
    ctx.fillRect(rx + 9, 0, 4, 512);
    ctx.fillStyle = '#cbd5e1';
  }

  return canvas;
}

function createSidewalkCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b8e93';
  ctx.fillRect(0, 0, 256, 256);

  const tile = 32;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const jitter = Math.floor((Math.random() - 0.5) * 14);
      const v = 136 + jitter;
      ctx.fillStyle = `rgb(${v}, ${v - 2}, ${v - 5})`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  for (let y = 0; y < 256; y += 64) {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, y, 10, 32);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, y + 32, 10, 32);
  }

  return canvas;
}

function createConcreteCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a3aab3';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const v = 148 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${v}, ${v}, ${v + 3})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  return canvas;
}

function createGlassFacadeCanvas(warmGlow: boolean, showroom = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  if (showroom) {
    bg.addColorStop(0, '#1c2a3a');
    bg.addColorStop(0.5, '#2b3e52');
    bg.addColorStop(1, '#3b2b20');
  } else if (warmGlow) {
    bg.addColorStop(0, '#2c3d55');
    bg.addColorStop(0.6, '#64524e');
    bg.addColorStop(1, '#b07b51');
  } else {
    bg.addColorStop(0, '#1e293b');
    bg.addColorStop(0.65, '#334155');
    bg.addColorStop(1, '#475569');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  const cols = showroom ? 6 : 8;
  const rows = showroom ? 4 : 10;
  const cw = 512 / cols;
  const rh = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = showroom ? true : Math.random() > 0.32;
      if (lit) {
        ctx.fillStyle = showroom
          ? 'rgba(253, 224, 155, 0.48)'
          : warmGlow
            ? `rgba(251, 191, 96, ${0.24 + Math.random() * 0.45})`
            : `rgba(186, 230, 253, ${0.18 + Math.random() * 0.34})`;
        ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
      }
      ctx.strokeStyle = showroom ? '#1e293b' : '#0f172a';
      ctx.lineWidth = showroom ? 5 : 4;
      ctx.strokeRect(c * cw + 1, r * rh + 1, cw - 2, rh - 2);
    }
  }

  return canvas;
}

function createCommercialConcreteFacadeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c2bab0';
  ctx.fillRect(0, 0, 512, 512);

  const cols = 6;
  const rows = 8;
  const cw = 512 / cols;
  const rh = 512 / rows;

  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = '#a39b91';
    ctx.fillRect(0, r * rh, 512, 8);
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() > 0.38;
      ctx.fillStyle = lit ? 'rgba(253, 210, 125, 0.85)' : '#1e293b';
      ctx.fillRect(c * cw + 10, r * rh + 14, cw - 20, rh - 24);
      ctx.fillStyle = '#475569';
      ctx.fillRect(c * cw + 8, r * rh + rh - 10, cw - 16, 4);
    }
  }

  return canvas;
}

function createBrickApartmentFacadeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9a4f3d';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle terracotta brick texture
  for (let i = 0; i < 3200; i++) {
    const shade = Math.random() > 0.5 ? 'rgba(255,220,200,0.08)' : 'rgba(30,10,5,0.12)';
    ctx.fillStyle = shade;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 10, 4);
  }

  const cols = 5;
  const rows = 8;
  const cw = 512 / cols;
  const rh = 512 / rows;

  for (let r = 0; r < rows; r++) {
    // Concrete balcony slab band
    ctx.fillStyle = '#d6cfc7';
    ctx.fillRect(0, r * rh + rh - 10, 512, 10);
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() > 0.35;
      ctx.fillStyle = lit ? 'rgba(254, 215, 130, 0.88)' : '#1e293b';
      ctx.fillRect(c * cw + 12, r * rh + 10, cw - 24, rh - 24);
      // Balcony grill bar
      ctx.fillStyle = '#334155';
      ctx.fillRect(c * cw + 8, r * rh + rh - 16, cw - 16, 4);
    }
  }
  return canvas;
}

function createCreamResidentialFacadeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ddd3c4';
  ctx.fillRect(0, 0, 512, 512);

  const cols = 6;
  const rows = 9;
  const cw = 512 / cols;
  const rh = 512 / rows;

  for (let r = 0; r < rows; r++) {
    // Vertical architectural fins
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = '#b6aa99';
      ctx.fillRect(c * cw, 0, 8, 512);
      const lit = Math.random() > 0.42;
      ctx.fillStyle = lit ? 'rgba(253, 224, 150, 0.84)' : '#283548';
      ctx.fillRect(c * cw + 14, r * rh + 10, cw - 24, rh - 18);
    }
  }
  return canvas;
}

function createWaterNormalCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 18 + Math.random() * 34;
    const r = 115 + Math.floor(Math.random() * 28);
    const g = 118 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${r}, ${g}, 248)`;
    ctx.fillRect(x, y, w, 3);
  }
  return canvas;
}

function createContactShadowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

function createGrassGroundCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#315e35';
  ctx.fillRect(0, 0, 256, 256);

  // Soft natural lawn patches
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 12 + Math.random() * 28;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(67, 122, 66, 0.28)' : 'rgba(35, 72, 39, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grass blade texture grain
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const g = 78 + Math.floor(Math.random() * 44);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.56)}, ${g}, ${Math.floor(g * 0.52)})`;
    ctx.fillRect(x, y, 2, 2);
  }

  return canvas;
}

function createBilingualSignCanvas(opts: {
  bg: string;
  accent?: string;
  titleBn: string;
  titleEn: string;
  subText?: string;
  textColor?: string;
  width?: number;
  height?: number;
}): HTMLCanvasElement {
  const w = opts.width ?? 768;
  const h = opts.height ?? 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = opts.accent ?? '#f8fafc';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  if (opts.accent) {
    ctx.fillStyle = opts.accent;
    ctx.fillRect(8, 8, 22, h - 16);
  }

  ctx.fillStyle = opts.textColor ?? '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hasSub = Boolean(opts.subText);
  ctx.font = `700 ${Math.floor(h * 0.25)}px "Noto Sans Bengali", "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(opts.titleBn, w * 0.5, hasSub ? h * 0.29 : h * 0.36);

  ctx.font = `700 ${Math.floor(h * 0.2)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(opts.titleEn, w * 0.5, hasSub ? h * 0.58 : h * 0.72);

  if (opts.subText) {
    ctx.fillStyle = '#fde68a';
    ctx.font = `600 ${Math.floor(h * 0.135)}px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif`;
    ctx.fillText(opts.subText, w * 0.5, h * 0.83);
  }

  return canvas;
}

function createRunwayCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#242933';
  ctx.fillRect(0, 0, 512, 1024);

  for (let i = 0; i < 7000; i++) {
    const shade = 28 + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 9})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
  }

  // Rubber touchdown tire skid marks near thresholds
  ctx.fillStyle = 'rgba(12, 14, 18, 0.45)';
  ctx.fillRect(160, 90, 192, 140);
  ctx.fillRect(160, 790, 192, 140);

  // Side white edge markings
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(16, 0, 10, 1024);
  ctx.fillRect(486, 0, 10, 1024);

  // Piano-key threshold bars (both ends)
  for (let x = 44; x < 468; x += 38) {
    if (Math.abs(x - 246) < 24) continue;
    ctx.fillRect(x, 24, 22, 76);
    ctx.fillRect(x, 924, 22, 76);
  }

  // Runway numbers 14 / 32
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 46px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('14', 256, 154);
  ctx.fillText('32', 256, 892);

  // Dashed centerline
  for (let y = 180; y < 840; y += 72) {
    ctx.fillRect(249, y, 14, 42);
  }

  return canvas;
}

function createPoleBannerCanvas(opts: {
  bgTop: string;
  bgBottom: string;
  accent: string;
  badge: string;
  line1Bn: string;
  line2Bn: string;
  line3En: string;
}): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, opts.bgTop);
  grad.addColorStop(1, opts.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 496);

  ctx.fillStyle = opts.accent;
  ctx.fillRect(16, 18, 224, 52);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.badge, 128, 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 33px "Noto Sans Bengali", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(opts.line1Bn, 128, 175);

  ctx.fillStyle = '#fde047';
  ctx.font = '800 33px "Noto Sans Bengali", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(opts.line2Bn, 128, 245);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(36, 305, 184, 3);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(opts.line3En, 128, 365);

  ctx.fillStyle = opts.accent;
  ctx.fillRect(26, 420, 204, 52);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NITOL NILOY GROUP', 128, 446);

  return canvas;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // Note: repeat(1, 1) because RoadRibbonGeometry computes exact world-scale UVs!
  const roadMain = configureColorTex(createAsphaltCanvas(3, true), maxAnisotropy, 1, 1);
  const road300ft = configureColorTex(createAsphaltCanvas(4, true), maxAnisotropy, 1, 1);
  const roadService = configureColorTex(createAsphaltCanvas(2, false), maxAnisotropy, 1, 1);
  const metroTrack = configureColorTex(createMetroTrackCanvas(), maxAnisotropy, 1, 1);
  const runway = configureColorTex(createRunwayCanvas(), maxAnisotropy, 1, 1);
  const sidewalk = configureColorTex(createSidewalkCanvas(), maxAnisotropy, 1, 1);
  const concrete = configureColorTex(createConcreteCanvas(), maxAnisotropy, 1, 1);
  const glassTowerCool = configureColorTex(createGlassFacadeCanvas(false), maxAnisotropy, 2, 4);
  const glassTowerWarm = configureColorTex(createGlassFacadeCanvas(true), maxAnisotropy, 2, 4);
  const glassShowroom = configureColorTex(createGlassFacadeCanvas(true, true), maxAnisotropy, 2, 1);
  const commercialFacade = configureColorTex(createCommercialConcreteFacadeCanvas(), maxAnisotropy, 2, 3);
  const brickFacade = configureColorTex(createBrickApartmentFacadeCanvas(), maxAnisotropy, 2, 3);
  const creamFacade = configureColorTex(createCreamResidentialFacadeCanvas(), maxAnisotropy, 2, 3);

  const waterNormal = new THREE.CanvasTexture(createWaterNormalCanvas());
  waterNormal.wrapS = THREE.RepeatWrapping;
  waterNormal.wrapT = THREE.RepeatWrapping;
  waterNormal.repeat.set(8, 54);
  waterNormal.anisotropy = maxAnisotropy;

  const contactShadow = new THREE.CanvasTexture(createContactShadowCanvas());
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  const grassGround = configureColorTex(createGrassGroundCanvas(), maxAnisotropy, 150, 150);

  const poleBannerDefs: Array<Parameters<typeof createPoleBannerCanvas>[0]> = [
    {
      bgTop: '#991b1b',
      bgBottom: '#450a0a',
      accent: '#facc15',
      badge: 'সড়ক নিরাপত্তা · SAFETY',
      line1Bn: 'একটি দুর্ঘটনা,',
      line2Bn: 'সারাজীবনের কান্না',
      line3En: 'DRIVE SAFE · OBEY RULES',
    },
    {
      bgTop: '#1e293b',
      bgBottom: '#0f172a',
      accent: '#ef4444',
      badge: 'NILOY MOTORS LTD',
      line1Bn: 'নিলয় হিরো',
      line2Bn: 'মোটরসাইকেল শোরুম',
      line3En: 'HERO MOTOCORP BD',
    },
    {
      bgTop: '#0c4a6e',
      bgBottom: '#082f49',
      accent: '#38bdf8',
      badge: 'NITOL MOTORS · NITA',
      line1Bn: 'টাটা ট্রাক ও',
      line2Bn: 'বাস চেসিস অ্যাসেম্বলি',
      line3En: 'INDIA ENGINE IMPORT',
    },
    {
      bgTop: '#7f1d1d',
      bgBottom: '#1e1b4b',
      accent: '#f59e0b',
      badge: 'সচেতনতা · ALERT',
      line1Bn: 'একটি দুর্ঘটনা,',
      line2Bn: 'সারাজীবনের কান্না',
      line3En: 'WEAR HELMET ALWAYS',
    },
    {
      bgTop: '#065f46',
      bgBottom: '#022c22',
      accent: '#fbbf24',
      badge: 'NITOL-NILOY GAS LTD',
      line1Bn: 'নিটল-নিলয়',
      line2Bn: 'পেট্রোল ও সিএনজি পাম্প',
      line3En: 'OCTANE · DIESEL · CNG',
    },
    {
      bgTop: '#312e81',
      bgBottom: '#1e1b4b',
      accent: '#22d3ee',
      badge: 'NITOL ELECTRONICS',
      line1Bn: 'নিটল সিমেন্ট',
      line2Bn: 'ও নিটল ইলেকট্রনিক্স',
      line3En: 'BUILT FOR BANGLADESH',
    },
  ];
  const poleBanners = poleBannerDefs.map((def) => {
    const t = configureColorTex(createPoleBannerCanvas(def), maxAnisotropy, 1, 1);
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });

  const signDefinitions: Record<string, Parameters<typeof createBilingualSignCanvas>[0]> = {
    niloyHero: {
      bg: '#111827',
      accent: '#dc2626',
      titleBn: 'নিলয় মোটরস লিমিটেড · হিরো ফ্ল্যাগশিপ',
      titleEn: 'NILOY MOTORS LTD · HERO SHOWROOM',
      subText: 'NITOL NILOY GROUP · TEJGAON, DHAKA',
    },
    niloyHeroBranch: {
      bg: '#111827',
      accent: '#dc2626',
      titleBn: 'নিলয় হিরো মোটরসাইকেল শোরুম ও গ্যালারি',
      titleEn: 'NILOY HERO SHOWROOM · BIKE GALLERY',
      subText: 'NITOL NILOY GROUP · SALES · SERVICE · SPARES',
    },
    nitolMotors: {
      bg: '#0f172a',
      accent: '#2563eb',
      titleBn: 'নিটল মোটরস লিমিটেড · বাণিজ্যিক যানবাহন',
      titleEn: 'NITOL MOTORS LIMITED (TATA COMMERCIAL)',
      subText: 'NITOL NILOY GROUP · SERVICE CENTRE LTD',
    },
    nitolNiloyTower: {
      bg: '#1e1b4b',
      accent: '#f59e0b',
      titleBn: 'নিটল-নিলয় সেন্টার · কর্পোরেট হেডকোয়ার্টার',
      titleEn: 'NITOL NILOY GROUP · CORPORATE TOWER',
      subText: 'MOHAKHALI COMMERCIAL AREA · DHAKA',
    },
    nitolCement: {
      bg: '#1e293b',
      accent: '#10b981',
      titleBn: 'নিটল ও নিলয় সিমেন্ট ইন্ডাস্ট্রিজ লিমিটেড',
      titleEn: 'NITOL & NILOY CEMENT INDUSTRIES LTD',
      subText: 'NITOL CONSTRUCTION · CENTRAL PROPERTIES',
    },
    nitolInsurance: {
      bg: '#172554',
      accent: '#38bdf8',
      titleBn: 'নিটল ইন্স্যুরেন্স কোম্পানি লিমিটেড',
      titleEn: 'NITOL INSURANCE COMPANY LIMITED',
      subText: 'NITOL TOURS & TRAVELS · NITS SERVICES',
    },
    nitolIndustrial: {
      bg: '#3f2c1a',
      accent: '#f59e0b',
      titleBn: 'নিটল পেপার ও পাল্প মিলস · ভিআইপি নিটল',
      titleEn: 'NITOL PAPER & PULP · VIP NITOL INDUSTRIES',
      subText: 'NITA COMPANY LTD · TONGI / GAZIPUR',
    },
    nitsNreach: {
      bg: '#0f172a',
      accent: '#8b5cf6',
      titleBn: 'নিটস সার্ভিসেস ও এনরিচ-নেট লিমিটেড',
      titleEn: 'NITS SERVICES · NREACH-NET · NITOL SOFTWARE',
      subText: 'NITOL NILOY TECH DIVISION · AGARGAON',
    },
    centralProperties: {
      bg: '#1f2937',
      accent: '#eab308',
      titleBn: 'সেন্ট্রাল প্রপার্টিজ · নিটল কনস্ট্রাকশন',
      titleEn: 'CENTRAL PROPERTIES · NITOL CONSTRUCTION LTD',
      subText: 'NITOL BAY-RESORT · UTTARA HUB',
    },
    expressway: {
      bg: '#0f4c81',
      accent: '#f59e0b',
      titleBn: 'ঢাকা এলিভেটেড এক্সপ্রেসওয়ে',
      titleEn: 'DHAKA ELEVATED EXPRESSWAY',
      subText: 'TEJGAON · MOHAKHALI · BANANI · AIRPORT',
    },
    mohakhaliFlyover: {
      bg: '#065f46',
      accent: '#fbbf24',
      titleBn: 'মহাখালী ফ্লাইওভার · বনানী ↑ | তেজগাঁও ↓',
      titleEn: 'MOHAKHALI FLYOVER · BANANI / UTTARA ↑',
      subText: 'AGARGAON LINK ←  |  GULSHAN ➔',
    },
    mohakhaliMarket: {
      bg: '#7c2d12',
      accent: '#f59e0b',
      titleBn: 'মহাখালী কাঁচা বাজার ও সুপার মার্কেট',
      titleEn: 'MOHAKHALI CENTRAL MARKET & BAZAAR',
      subText: 'WHOLESALE · RETAIL · FOOD STALLS',
    },
    banani: {
      bg: '#065f46',
      accent: '#f8fafc',
      titleBn: 'বনানী · কামাল আতাতুর্ক এভিনিউ',
      titleEn: 'BANANI · ROAD 11 & KEMAL ATATURK AVE',
      subText: 'MIRPUR 10 ←  |  GULSHAN 2 ➔',
    },
    sheraton: {
      bg: '#1e1b4b',
      accent: '#eab308',
      titleBn: 'শেরাটন ঢাকা — বনানী',
      titleEn: 'SHERATON DHAKA · BANANI',
      subText: 'LUXURY HOTEL & SUITES',
    },
    radisson: {
      bg: '#0c4a6e',
      accent: '#eab308',
      titleBn: 'র‍্যাডিসন ব্লু ঢাকা ওয়াটার গার্ডেন',
      titleEn: 'RADISSON BLU WATER GARDEN',
      subText: 'AIRPORT ROAD · DHAKA CANTONMENT',
    },
    hospital: {
      bg: '#0f766e',
      accent: '#ef4444',
      titleBn: 'কুর্মিটোলা জেনারেল হাসপাতাল',
      titleEn: 'KURMITOLA GENERAL HOSPITAL',
      subText: 'EMERGENCY 24/7 · জরুরি বিভাগ',
    },
    afmc: {
      bg: '#14532d',
      accent: '#facc15',
      titleBn: 'আর্মড ফোর্সেস মেডিকেল কলেজ',
      titleEn: 'ARMED FORCES MEDICAL COLLEGE (AFMC)',
      subText: 'DHAKA CANTONMENT',
    },
    kuril: {
      bg: '#065f46',
      accent: '#f59e0b',
      titleBn: 'কুড়িল ফ্লাইওভার · উত্তরা ↑ | পূর্বাচল ৩০০ ফিট ➔',
      titleEn: 'KURIL FLYOVER · UTTARA ↑  |  300 FT PURBACHAL ➔',
      subText: 'EXPRESSWAY & SERVICE LANES',
    },
    purbachal300: {
      bg: '#065f46',
      accent: '#fbbf24',
      titleBn: 'পূর্বাচল ৩০০ ফিট এক্সপ্রেসওয়ে · নারায়ণগঞ্জ',
      titleEn: '300 FT PURBACHAL EXPRESSWAY · NARAYANGANJ',
      subText: '8 EXPRESS LANES · SERVICE ROADS · UNDERPASS',
    },
    narayanganjSign: {
      bg: '#065f46',
      accent: '#facc15',
      titleBn: 'কাঞ্চন সেতু ৫ কিমি · নারায়ণগঞ্জ ২২ কিমি ➔',
      titleEn: 'KANCHAN BRIDGE 5 KM · NARAYANGANJ 22 KM ➔',
      subText: 'U-TURN TO DHAKA / KURIL ←  |  CONTINUE PURBACHAL ➔',
    },
    neelaMarket: {
      bg: '#7f1d1d',
      accent: '#f59e0b',
      titleBn: 'নীলা মার্কেট · পূর্বাচল ৩০০ ফিট',
      titleEn: 'NEELA MARKET · PURBACHAL BAZAAR',
      subText: 'FOOD HUB · HANSER MANGSHO · BALU BRIDGE',
    },
    uttaraJasimuddin: {
      bg: '#065f46',
      accent: '#38bdf8',
      titleBn: 'উত্তরা · জসিমউদ্দিন মোড় · হাউস বিল্ডিং ↑',
      titleEn: 'UTTARA · JASIMUDDIN · HOUSE BUILDING ↑',
      subText: 'DIABARI METRO ←  |  TONGI / GAZIPUR ↑',
    },
    tongiGazipur: {
      bg: '#065f46',
      accent: '#f59e0b',
      titleBn: 'আব্দুল্লাহপুর · টঙ্গী বাজার · গাজীপুর চৌরাস্তা ↑',
      titleEn: 'ABDULLAHPUR · TONGI · GAZIPUR CHOWRASTA ↑',
      subText: 'MYMENSINGH ↑  |  TANGAIL ←  |  JOYDEBPUR ➔',
    },
    diabariMetro: {
      bg: '#047857',
      accent: '#f8fafc',
      titleBn: 'উত্তরা উত্তর (দিয়াবাড়ি) মেট্রো স্টেশন ও ডিপো',
      titleEn: 'UTTARA NORTH (DIABARI) · MRT-6 STATION',
      subText: 'DHAKA METRO RAIL · PALLABI ↓  |  MIRPUR ↓',
    },
    uttaraSouthMetro: {
      bg: '#047857',
      accent: '#f8fafc',
      titleBn: 'উত্তরা সেন্টার / উত্তরা দক্ষিণ মেট্রো স্টেশন',
      titleEn: 'UTTARA CENTER & SOUTH · MRT-6 STATION',
      subText: 'DHAKA METRO RAIL · PALLABI ↓',
    },
    pallabiMetro: {
      bg: '#047857',
      accent: '#f8fafc',
      titleBn: 'পল্লবী · মিরপুর ১১ মেট্রো স্টেশন',
      titleEn: 'PALLABI & MIRPUR 11 · MRT-6 STATION',
      subText: 'DHAKA METRO RAIL · MIRPUR 10 ↓',
    },
    mirpur10: {
      bg: '#047857',
      accent: '#fbbf24',
      titleBn: 'মিরপুর ১০ গোলচত্বর মেট্রো স্টেশন',
      titleEn: 'MIRPUR 10 ROUNDABOUT · MRT-6 STATION',
      subText: 'BANANI / CANTONMENT ➔  |  AGARGAON ↓',
    },
    shewraparaMetro: {
      bg: '#047857',
      accent: '#f8fafc',
      titleBn: 'কাজীপাড়া · শেওড়াপাড়া মেট্রো স্টেশন',
      titleEn: 'KAZIPARA & SHEWRAPARA · MRT-6 STATION',
      subText: 'DHAKA METRO RAIL · AGARGAON ↓',
    },
    agargaon: {
      bg: '#047857',
      accent: '#38bdf8',
      titleBn: 'আগারগাঁও মেট্রো স্টেশন · বিজয় সরণি ↓',
      titleEn: 'AGARGAON MRT-6 STATION · ROKEYA SARANI',
      subText: 'MOHAKHALI ➔  |  BIJOY SARANI · FARMGATE ↓',
    },
    bijoySaraniLink: {
      bg: '#047857',
      accent: '#f59e0b',
      titleBn: 'বিজয় সরণি মেট্রো স্টেশন · তেজগাঁও ওভারপাস ➔',
      titleEn: 'BIJOY SARANI MRT-6 · TEJGAON SHOWROOM ➔',
      subText: 'DIRECT FLYOVER TO NILOY HERO & MOHAKHALI',
    },
    farmgateMetro: {
      bg: '#047857',
      accent: '#f8fafc',
      titleBn: 'ফার্মগেট · কারওয়ান বাজার মেট্রো স্টেশন',
      titleEn: 'FARMGATE & KARWAN BAZAAR · MRT-6 STATION',
      subText: 'TEJGAON ➔  |  SHAHBAGH MOR ↓',
    },
    farmgateShahbagh: {
      bg: '#047857',
      accent: '#f59e0b',
      titleBn: 'শাহবাগ মোড় মেট্রো স্টেশন · ঢাকা বিশ্ববিদ্যালয়',
      titleEn: 'SHAHBAGH MOR · MRT-6 STATION · BSMMU',
      subText: 'LOOP TO TEJGAON & MOHAKHALI ➔',
    },
    sangsadBhaban: {
      bg: '#1e293b',
      accent: '#10b981',
      titleBn: 'জাতীয় সংসদ ভবন · মানিক মিয়া এভিনিউ',
      titleEn: 'JATIYA SANGSAD BHABAN · MANIK MIA AVE',
      subText: 'ASAD GATE ←  |  FARMGATE ➔  |  AGARGAON ↑',
    },
    kanchanNarayanganjLoop: {
      bg: '#065f46',
      accent: '#facc15',
      titleBn: 'কাঞ্চন ব্রিজ · নারায়ণগঞ্জ রিটার্ন এক্সপ্রেসওয়ে',
      titleEn: 'KANCHAN BRIDGE · NARAYANGANJ RETURN LOOP',
      subText: 'NARAYANGANJ ↓  |  DHAKA / SHAHBAGH LOOP ↙  |  GAZIPUR ↑',
    },
    gazipurRing: {
      bg: '#065f46',
      accent: '#38bdf8',
      titleBn: 'গাজীপুর চৌরাস্তা আউটার রিং · আশুলিয়া ও কাঞ্চন লিংক',
      titleEn: 'GAZIPUR CHOWRASTA RING · ASHULIA ← | KANCHAN ➔',
      subText: 'MIRPUR RING ←  |  300 FT PURBACHAL ➔',
    },
    mirpur60ft: {
      bg: '#0f4c81',
      accent: '#fbbf24',
      titleBn: 'মিরপুর ১০ ও ৬০ ফিট রোড · শ্যামলী ও মানিক মিয়া লিংক',
      titleEn: 'MIRPUR 10 & 60 FEET ROAD · AGARGAON LINK',
      subText: 'BERIBADH RING ←  |  SANGSAD BHABAN ↓',
    },
    hatirjheelGulshan: {
      bg: '#0f766e',
      accent: '#facc15',
      titleBn: 'হাতিরঝিল ও গুলশান লিংক · পূর্বাচল ও শাহবাগ রিং',
      titleEn: 'HATIRJHEEL & GULSHAN RING ROAD',
      subText: 'TEJGAON ←  |  PURBACHAL ➔  |  SHAHBAGH ↓',
    },
    nitolElectronics: {
      bg: '#111827',
      accent: '#dc2626',
      titleBn: 'নিটল-নিলয় শোরুম ও ইলেকট্রনিক্স',
      titleEn: 'NITOL-NILOY SHOWROOM & ELECTRONICS',
      subText: 'HERO · TATA · NITOL ELECTRONICS · NITA',
    },
    dmchBsmmu: {
      bg: '#0f766e',
      accent: '#ef4444',
      titleBn: 'ঢাকা মেডিকেল কলেজ ও বিএসএমএমইউ হাসপাতাল',
      titleEn: 'DHAKA MEDICAL (DMCH) & BSMMU HOSPITAL',
      subText: 'SHAHBAGH MOR · EMERGENCY 24/7',
    },
    squareHospital: {
      bg: '#1e3a8a',
      accent: '#ef4444',
      titleBn: 'স্কয়ার হাসপাতাল ও হৃদরোগ ইনস্টিটিউট',
      titleEn: 'SQUARE HOSPITAL & NATIONAL HEART INSTITUTE',
      subText: 'PANTHAPATH · SHER-E-BANGLA NAGAR',
    },
    restaurantBiryani: {
      bg: '#7c2d12',
      accent: '#fbbf24',
      titleBn: 'ঢাকা কাচ্চি ও বিরিয়ানি হাউস',
      titleEn: 'DHAKA KACCHI & BIRYANI RESTAURANT',
      subText: 'DINE IN · TAKEAWAY · OPEN LATE',
    },
    restaurantCafe: {
      bg: '#1f2937',
      accent: '#f59e0b',
      titleBn: 'ক্যাফে ঢাকা ও গ্রিল লাউঞ্জ',
      titleEn: 'CAFE DHAKA · GRILL & COFFEE LOUNGE',
      subText: 'ROOFTOP DINING · FAMILY RESTAURANT',
    },
    airportHSIA: {
      bg: '#0c4a6e',
      accent: '#fbbf24',
      titleBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (HSIA)',
      titleEn: 'HAZRAT SHAHJALAL INT\'L AIRPORT · T1 · T2 · T3',
      subText: 'AIRPORT ROAD · DEPARTURE & ARRIVAL LOOP',
    },
    nitolPetrol: {
      bg: '#111827',
      accent: '#f59e0b',
      titleBn: 'নিটল-নিলয় গ্যাস লিমিটেড · পেট্রোল ও সিএনজি পাম্প',
      titleEn: 'NITOL-NILOY GAS LTD · PETROL & CNG STATION',
      subText: 'OCTANE · PETROL · DIESEL · CNG · 24/7 OPEN',
    },
    nitaAssembly: {
      bg: '#0f172a',
      accent: '#38bdf8',
      titleBn: 'নিটা কোং লিঃ · টাটা ট্রাক ও বাস চেসিস অ্যাসেম্বলি',
      titleEn: 'NITA CO LTD · TATA TRUCK & BUS CHASSIS PLANT',
      subText: 'IMPORTED ENGINE FROM INDIA · NITOL NILOY GROUP',
    },
    labaidHospital: {
      bg: '#0f766e',
      accent: '#ef4444',
      titleBn: 'ল্যাবএইড স্পেশালাইজড ও ক্যান্সার হাসপাতাল',
      titleEn: 'LABAID SPECIALIZED & CANCER HOSPITAL',
      subText: 'DHANMONDI · GREEN ROAD · EMERGENCY 24/7',
    },
    popularMedinova: {
      bg: '#1e3a8a',
      accent: '#fbbf24',
      titleBn: 'পপুলার ডায়াগনস্টিক ও মেডিনোভা মেডিকেল (ধানমন্ডি)',
      titleEn: 'POPULAR DIAGNOSTIC & MEDINOVA DHANMONDI',
      subText: 'SATMASJID ROAD · ROAD 2 · HEALTHCARE HUB',
    },
    mohakhaliCancer: {
      bg: '#065f46',
      accent: '#ef4444',
      titleBn: 'মহাখালী জাতীয় ক্যান্সার হাসপাতাল (NICRH) ও বাস টার্মিনাল',
      titleEn: 'MOHAKHALI CANCER HOSPITAL (NICRH) & TERMINAL',
      subText: 'NIDCH · ICDDR,B · MOHAKHALI HUB',
    },
    uttaraSector: {
      bg: '#065f46',
      accent: '#38bdf8',
      titleBn: 'উত্তরা মডেল টাউন · সেক্টর ১ — ১৪',
      titleEn: 'UTTARA MODEL TOWN · SECTORS 1 — 14',
      subText: 'PLANNED GRID · NITOL NILOY HUB · METRO',
    },
    safetyMotto: {
      bg: '#991b1b',
      accent: '#facc15',
      titleBn: 'একটি দুর্ঘটনা, সারাজীবনের কান্না',
      titleEn: 'ONE ACCIDENT IS A LIFETIME OF TEARS · DRIVE SAFE',
      subText: 'হেলমেট পরুন · গতিসীমা মেনে চলুন · NITOL NILOY ROAD SAFETY',
    },
    indicatorPetrol: {
      bg: '#1e293b',
      accent: '#fbbf24',
      titleBn: '⛽ সামনে নিটল-নিলয় পেট্রোল ও সিএনজি পাম্প (২০০ মি.)',
      titleEn: 'NITOL-NILOY PETROL & CNG STATION AHEAD 200M',
      subText: 'OCTANE · PETROL · DIESEL · CNG · BOTH SIDES',
    },
    indicatorPetrolEntry: {
      bg: '#064e3b',
      accent: '#facc15',
      titleBn: '⛽ পেট্রোল ও সিএনজি পাম্প প্রবেশপথ ➔',
      titleEn: 'PETROL · OCTANE · CNG ENTRY ➔ DRIVE IN',
      subText: 'NITOL-NILOY GAS LTD · 24/7 REFUELING BAY',
    },
    indicatorHeroShowroom: {
      bg: '#7f1d1d',
      accent: '#fbbf24',
      titleBn: '🏍️ সামনে নিলয় হিরো শোরুম ও বাইক গ্যালারি',
      titleEn: 'NILOY HERO SHOWROOM AHEAD · BIKE GALLERY',
      subText: 'DRIVE IN · NITOL NILOY GROUP AUTHORIZED DEALER',
    },
    indicatorSchool: {
      bg: '#1e3a8a',
      accent: '#facc15',
      titleBn: '🏫 সামনে স্কুল — গতি কমান · সাবধানে চালান',
      titleEn: 'SCHOOL ZONE AHEAD · SLOW DOWN · PEDESTRIANS',
      subText: 'একটি দুর্ঘটনা, সারাজীবনের কান্না',
    },
    indicatorCollege: {
      bg: '#14532d',
      accent: '#fbbf24',
      titleBn: '🎓 সামনে কলেজ ও বিশ্ববিদ্যালয় ক্যাম্পাস',
      titleEn: 'COLLEGE & UNIVERSITY ZONE AHEAD · DRIVE CAREFULLY',
      subText: 'SPEED LIMIT 40 KM/H · NO OVERTAKING',
    },
    indicatorHospital: {
      bg: '#0f766e',
      accent: '#ef4444',
      titleBn: '🏥 সামনে হাসপাতাল এলাকা — হর্ন বাজাবেন না',
      titleEn: 'HOSPITAL ZONE AHEAD · SILENCE PLEASE · NO HORN',
      subText: 'EMERGENCY AMBULANCE CORRIDOR',
    },
    schoolCampus: {
      bg: '#1e3a8a',
      accent: '#fbbf24',
      titleBn: 'ঢাকা মডেল সরকারি স্কুল ও কলেজ',
      titleEn: 'DHAKA MODEL SCHOOL & COLLEGE CAMPUS',
      subText: 'EDUCATION ZONE · SLOW TRAFFIC',
    },
  };

  const signTextures: Record<string, THREE.CanvasTexture> = {};
  for (const [key, def] of Object.entries(signDefinitions)) {
    const tex = configureColorTex(createBilingualSignCanvas(def), maxAnisotropy, 1, 1);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    signTextures[key] = tex;
  }

  return {
    roadMain,
    road300ft,
    roadService,
    metroTrack,
    runway,
    sidewalk,
    concrete,
    glassTowerCool,
    glassTowerWarm,
    glassShowroom,
    commercialFacade,
    brickFacade,
    creamFacade,
    waterNormal,
    contactShadow,
    grassGround,
    poleBanners,
    signTextures,
    dispose: () => {
      roadMain.dispose();
      road300ft.dispose();
      roadService.dispose();
      metroTrack.dispose();
      runway.dispose();
      sidewalk.dispose();
      concrete.dispose();
      glassTowerCool.dispose();
      glassTowerWarm.dispose();
      glassShowroom.dispose();
      commercialFacade.dispose();
      brickFacade.dispose();
      creamFacade.dispose();
      waterNormal.dispose();
      contactShadow.dispose();
      grassGround.dispose();
      poleBanners.forEach((t) => t.dispose());
      Object.values(signTextures).forEach((t) => t.dispose());
    },
  };
}
