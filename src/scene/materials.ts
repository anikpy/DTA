import * as THREE from 'three';
import { ProceduralTextures } from './textures';

export interface SceneMaterials {
  asphaltMain: THREE.MeshStandardMaterial;
  asphalt300ft: THREE.MeshStandardMaterial;
  asphaltService: THREE.MeshStandardMaterial;
  asphaltDark: THREE.MeshStandardMaterial;
  metroTrack: THREE.MeshStandardMaterial;
  runwayMat: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  concreteViaduct: THREE.MeshStandardMaterial;
  concreteBarrier: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  steelBridge: THREE.MeshStandardMaterial;
  heroRed: THREE.MeshPhysicalMaterial;
  heroCharcoal: THREE.MeshStandardMaterial;
  glassShowroom: THREE.MeshPhysicalMaterial;
  glassGalleryClear: THREE.MeshPhysicalMaterial;
  glassTowerCool: THREE.MeshPhysicalMaterial;
  glassTowerWarm: THREE.MeshPhysicalMaterial;
  commercialFacade: THREE.MeshStandardMaterial;
  brickFacade: THREE.MeshStandardMaterial;
  creamFacade: THREE.MeshStandardMaterial;
  towerStone: THREE.MeshStandardMaterial;
  towerCream: THREE.MeshStandardMaterial;
  hospitalWhite: THREE.MeshStandardMaterial;
  hospitalTeal: THREE.MeshStandardMaterial;
  canalWater: THREE.MeshPhysicalMaterial;
  groundUrban: THREE.MeshStandardMaterial;
  grassGreen: THREE.MeshStandardMaterial;
  lampGlow: THREE.MeshStandardMaterial;
  headlightGlow: THREE.MeshStandardMaterial;
  taillightGlow: THREE.MeshStandardMaterial;
  marketAwningColors: THREE.MeshStandardMaterial[];
  poleBannerMats: THREE.MeshStandardMaterial[];
  contactShadow: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createSceneMaterials(
  textures: ProceduralTextures,
  isSoftwareGl: boolean,
): SceneMaterials {
  const asphaltMain = new THREE.MeshStandardMaterial({
    map: textures.roadMain,
    roughness: 0.85,
    metalness: 0.06,
  });

  const asphalt300ft = new THREE.MeshStandardMaterial({
    map: textures.road300ft,
    roughness: 0.82,
    metalness: 0.08,
  });

  const asphaltService = new THREE.MeshStandardMaterial({
    map: textures.roadService,
    roughness: 0.84,
    metalness: 0.06,
  });

  const asphaltDark = new THREE.MeshStandardMaterial({
    color: 0x262a33,
    roughness: 0.88,
    metalness: 0.05,
  });

  const metroTrack = new THREE.MeshStandardMaterial({
    map: textures.metroTrack,
    roughness: 0.65,
    metalness: 0.2,
  });

  const runwayMat = new THREE.MeshStandardMaterial({
    map: textures.runway,
    roughness: 0.82,
    metalness: 0.08,
  });

  const sidewalk = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    roughness: 0.88,
    metalness: 0.04,
  });

  const concreteViaduct = new THREE.MeshStandardMaterial({
    map: textures.concrete,
    color: 0xd1d5db,
    roughness: 0.78,
    metalness: 0.08,
  });

  const concreteBarrier = new THREE.MeshStandardMaterial({
    color: 0xbec5ce,
    roughness: 0.8,
    metalness: 0.05,
  });

  const steelDark = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.36,
    metalness: 0.82,
  });

  const steelBridge = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.32,
    metalness: 0.86,
  });

  const heroRed = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    roughness: 0.24,
    metalness: 0.35,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
  });

  const heroCharcoal = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.42,
    metalness: 0.55,
  });

  const glassShowroom = new THREE.MeshPhysicalMaterial({
    map: textures.glassShowroom,
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.32,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: isSoftwareGl ? 0.58 : 0.72,
    clearcoat: 1.0,
  });

  const glassGalleryClear = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    roughness: 0.06,
    metalness: 0.1,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    clearcoat: 1.0,
  });

  const glassTowerCool = new THREE.MeshPhysicalMaterial({
    map: textures.glassTowerCool,
    emissive: 0x1e293b,
    emissiveIntensity: 0.25,
    roughness: 0.15,
    metalness: 0.65,
    clearcoat: 0.9,
  });

  const glassTowerWarm = new THREE.MeshPhysicalMaterial({
    map: textures.glassTowerWarm,
    emissive: 0xf59e0b,
    emissiveMap: textures.glassTowerWarm,
    emissiveIntensity: 0.45,
    roughness: 0.16,
    metalness: 0.55,
    clearcoat: 0.9,
  });

  const commercialFacade = new THREE.MeshStandardMaterial({
    map: textures.commercialFacade,
    emissive: 0xf59e0b,
    emissiveMap: textures.commercialFacade,
    emissiveIntensity: 0.22,
    roughness: 0.65,
    metalness: 0.12,
  });

  const brickFacade = new THREE.MeshStandardMaterial({
    map: textures.brickFacade,
    emissive: 0xf59e0b,
    emissiveMap: textures.brickFacade,
    emissiveIntensity: 0.16,
    roughness: 0.78,
    metalness: 0.05,
  });

  const creamFacade = new THREE.MeshStandardMaterial({
    map: textures.creamFacade,
    emissive: 0xf59e0b,
    emissiveMap: textures.creamFacade,
    emissiveIntensity: 0.18,
    roughness: 0.68,
    metalness: 0.08,
  });

  const towerStone = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.75,
    metalness: 0.08,
  });

  const towerCream = new THREE.MeshStandardMaterial({
    color: 0xd6cfc2,
    roughness: 0.72,
    metalness: 0.06,
  });

  const hospitalWhite = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.55,
    metalness: 0.08,
  });

  const hospitalTeal = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.35,
    metalness: 0.25,
  });

  const canalWater = new THREE.MeshPhysicalMaterial({
    color: 0x1e4d5c,
    normalMap: textures.waterNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.14,
    metalness: 0.18,
    clearcoat: 0.95,
    clearcoatRoughness: 0.1,
  });

  const groundUrban = new THREE.MeshStandardMaterial({
    map: textures.grassGround,
    color: 0xd9ecd4,
    roughness: 0.94,
    metalness: 0.02,
  });

  const grassGreen = new THREE.MeshStandardMaterial({
    color: 0x355e3b,
    roughness: 0.92,
    metalness: 0.02,
  });

  const lampGlow = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfbbf24,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
  });

  const headlightGlow = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef3c7,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });

  const taillightGlow = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  const marketAwningColors = [0xdc2626, 0x2563eb, 0x059669, 0xd97706, 0x7c3aed].map(
    (hex) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.72,
        metalness: 0.06,
      }),
  );

  const poleBannerMats = textures.poleBanners.map(
    (tex) =>
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.52,
        roughness: 0.42,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
  );

  const contactShadow = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.45,
  });

  const all = [
    asphaltMain,
    asphalt300ft,
    asphaltService,
    asphaltDark,
    metroTrack,
    runwayMat,
    sidewalk,
    concreteViaduct,
    concreteBarrier,
    steelDark,
    steelBridge,
    heroRed,
    heroCharcoal,
    glassShowroom,
    glassGalleryClear,
    glassTowerCool,
    glassTowerWarm,
    commercialFacade,
    brickFacade,
    creamFacade,
    towerStone,
    towerCream,
    hospitalWhite,
    hospitalTeal,
    canalWater,
    groundUrban,
    grassGreen,
    lampGlow,
    headlightGlow,
    taillightGlow,
    contactShadow,
    ...marketAwningColors,
    ...poleBannerMats,
  ];

  return {
    asphaltMain,
    asphalt300ft,
    asphaltService,
    asphaltDark,
    metroTrack,
    runwayMat,
    sidewalk,
    concreteViaduct,
    concreteBarrier,
    steelDark,
    steelBridge,
    heroRed,
    heroCharcoal,
    glassShowroom,
    glassGalleryClear,
    glassTowerCool,
    glassTowerWarm,
    commercialFacade,
    brickFacade,
    creamFacade,
    towerStone,
    towerCream,
    hospitalWhite,
    hospitalTeal,
    canalWater,
    groundUrban,
    grassGreen,
    lampGlow,
    headlightGlow,
    taillightGlow,
    marketAwningColors,
    poleBannerMats,
    contactShadow,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
