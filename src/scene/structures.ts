import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SceneMaterials } from './materials';
import { ProceduralTextures } from './textures';

const cachedSignMats = new Map<string, THREE.MeshStandardMaterial>();
const cachedAccentMats = new Map<string, THREE.MeshStandardMaterial>();
let cachedInteriorDeckMat: THREE.MeshStandardMaterial | null = null;
let cachedGalleryWallMat: THREE.MeshStandardMaterial | null = null;
let cachedFobRoofMat: THREE.MeshStandardMaterial | null = null;

export function disposeCachedStructureMaterials(): void {
  cachedSignMats.forEach((m) => m.dispose());
  cachedSignMats.clear();
  cachedAccentMats.forEach((m) => m.dispose());
  cachedAccentMats.clear();
  if (cachedInteriorDeckMat) {
    cachedInteriorDeckMat.dispose();
    cachedInteriorDeckMat = null;
  }
  if (cachedGalleryWallMat) {
    cachedGalleryWallMat.dispose();
    cachedGalleryWallMat = null;
  }
  if (cachedFobRoofMat) {
    cachedFobRoofMat.dispose();
    cachedFobRoofMat = null;
  }
}

function getSignMaterial(
  tex: THREE.CanvasTexture,
  emissiveIntensity: number,
): THREE.MeshStandardMaterial {
  const key = `${tex.uuid}:${emissiveIntensity.toFixed(2)}`;
  let mat = cachedSignMats.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity,
      roughness: 0.35,
      metalness: 0.1,
    });
    cachedSignMats.set(key, mat);
  }
  return mat;
}

function getAccentMaterial(
  colorHex: number,
  roughness: number,
  metalness: number,
): THREE.MeshStandardMaterial {
  const key = `${colorHex}:${roughness}:${metalness}`;
  let mat = cachedAccentMats.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness,
    });
    cachedAccentMats.set(key, mat);
  }
  return mat;
}

function makeSignMesh(
  tex: THREE.CanvasTexture,
  width: number,
  height: number,
  emissiveIntensity = 0.5,
): THREE.Mesh {
  const mat = getSignMaterial(tex, emissiveIntensity);
  const geo = new THREE.PlaneGeometry(width, height);
  return new THREE.Mesh(geo, mat);
}

function mergeGroupMeshesByMaterial(group: THREE.Group): void {
  group.updateMatrixWorld(true);
  const keepChildren: THREE.Object3D[] = [];
  const buckets = new Map<
    string,
    { mat: THREE.Material; castShadow: boolean; receiveShadow: boolean; geos: THREE.BufferGeometry[] }
  >();

  group.traverse((obj) => {
    if ((obj as THREE.Light).isLight) {
      if (obj !== group) keepChildren.push(obj);
      return;
    }
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const mat = mesh.material;
    if (mat.transparent) {
      mesh.geometry.applyMatrix4(mesh.matrixWorld);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      keepChildren.push(mesh);
      return;
    }
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    mesh.geometry.dispose();
    const key = `${mat.uuid}:${mesh.castShadow ? 1 : 0}:${mesh.receiveShadow ? 1 : 0}`;
    let b = buckets.get(key);
    if (!b) {
      b = { mat, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, geos: [] };
      buckets.set(key, b);
    }
    b.geos.push(g);
  });

  group.clear();
  for (const child of keepChildren) {
    group.add(child);
  }
  for (const b of buckets.values()) {
    if (!b.geos.length) continue;
    let merged: THREE.BufferGeometry | null = null;
    if (b.geos.length === 1) {
      merged = b.geos[0];
    } else {
      const normalized = b.geos.map((g) => (g.index ? g.toNonIndexed() : g));
      merged = mergeGeometries(normalized, false);
      b.geos.forEach((g) => g.dispose());
      normalized.forEach((g) => g.dispose());
    }
    if (!merged) continue;
    const mergedMesh = new THREE.Mesh(merged, b.mat);
    mergedMesh.castShadow = b.castShadow;
    mergedMesh.receiveShadow = b.receiveShadow;
    group.add(mergedMesh);
  }
}

function ensureGalleryInteriorMats(): {
  deckMat: THREE.MeshStandardMaterial;
  wallMat: THREE.MeshStandardMaterial;
} {
  if (!cachedInteriorDeckMat) {
    cachedInteriorDeckMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.42,
      roughness: 0.25,
    });
  }
  if (!cachedGalleryWallMat) {
    cachedGalleryWallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xfde68a,
      emissiveIntensity: 0.3,
      roughness: 0.45,
    });
  }
  return { deckMat: cachedInteriorDeckMat, wallMat: cachedGalleryWallMat };
}

function createShowroomDisplayBike(mats: SceneMaterials, tankHex: number): THREE.Group {
  const bike = new THREE.Group();
  const tankMat = getAccentMaterial(tankHex, 0.22, 0.45);

  // Front & Rear wheels
  for (const wz of [-0.72, 0.72]) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.095, 8, 16), mats.heroCharcoal);
    tire.position.set(0, 0.41, wz);
    tire.rotation.y = Math.PI / 2;
    bike.add(tire);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 10), mats.steelBridge);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(0, 0.41, wz);
    bike.add(hub);
  }

  // Engine & chassis frame
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.82), mats.steelDark);
  engine.position.set(0, 0.62, 0.02);
  bike.add(engine);

  // Sculpted Hero fuel tank & front cowl fairing
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.76), tankMat);
  tank.position.set(0, 0.96, 0.18);
  tank.rotation.x = 0.12;
  bike.add(tank);

  // Rider saddle seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.74), mats.heroCharcoal);
  seat.position.set(0, 0.88, -0.38);
  seat.rotation.x = -0.1;
  bike.add(seat);

  // Front fork + handlebars + glowing LED headlight
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.88, 8), mats.steelBridge);
  fork.position.set(0, 0.82, 0.56);
  fork.rotation.x = -0.35;
  bike.add(fork);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 8), mats.steelDark);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.18, 0.44);
  bike.add(handlebar);

  const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.14), mats.headlightGlow);
  headlight.position.set(0, 1.04, 0.7);
  bike.add(headlight);

  // Chrome exhaust muffler
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.92, 8), mats.steelBridge);
  exhaust.rotation.x = Math.PI / 2 - 0.12;
  exhaust.position.set(0.24, 0.46, -0.34);
  bike.add(exhaust);

  return bike;
}

/**
 * 1. Flagship Niloy Motors / Hero Showroom (Tejgaon, Nitol Niloy Group)
 */
export function createNiloyHeroShowroom(
  mats: SceneMaterials,
  textures: ProceduralTextures,
): THREE.Group {
  const group = new THREE.Group();
  const { deckMat, wallMat } = ensureGalleryInteriorMats();

  // Flush concrete/paving plaza with front drive-in customer motorcycle parking apron
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(40, 0.16, 54), mats.sidewalk);
  plaza.position.set(-1, 0.08, 0);
  plaza.receiveShadow = true;
  group.add(plaza);

  const parkingApron = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 40), mats.asphaltService);
  parkingApron.rotation.x = -Math.PI / 2;
  parkingApron.position.set(-16.2, 0.17, -2);
  group.add(parkingApron);

  // Painted white motorcycle parking bay lines in front of the glass gallery
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.16), mats.hospitalWhite);
    line.rotation.x = -Math.PI / 2;
    line.position.set(-15.5, 0.18, -2 + i * 4.2);
    group.add(line);
  }

  const rearCore = new THREE.Mesh(new THREE.BoxGeometry(15, 12.5, 36), mats.heroCharcoal);
  rearCore.position.set(6.5, 6.3, -2);
  rearCore.castShadow = true;
  rearCore.receiveShadow = true;
  group.add(rearCore);

  // Illuminated gallery backdrop wall behind the motorcycles
  const galleryBackdrop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.6, 32), wallMat);
  galleryBackdrop.position.set(-1.1, 5.0, -2);
  group.add(galleryBackdrop);

  const interiorDeck = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.24, 33.4), deckMat);
  interiorDeck.position.set(-6.0, 0.28, -2);
  group.add(interiorDeck);

  // Upper rear display gallery riser for 2 showcase Hero bikes
  const upperRiser = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.35, 22), mats.heroCharcoal);
  upperRiser.position.set(-3.2, 1.05, -2);
  group.add(upperRiser);
  const riserTrim = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 22.1), mats.heroRed);
  riserTrim.position.set(-3.2, 1.72, -2);
  group.add(riserTrim);

  // 7 detailed multi-part Hero motorcycles inside the illuminated gallery (front row + upper tier)
  const bikeColors = [0xdc2626, 0x2563eb, 0x111827, 0xdc2626, 0x059669];
  for (let i = 0; i < 5; i++) {
    const pz = -14 + i * 6.0;
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.34, 16), mats.heroCharcoal);
    plinth.position.set(-7.6, 0.56, pz);
    group.add(plinth);

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.82, 1.82, 0.08, 16), mats.heroRed);
    ring.position.set(-7.6, 0.74, pz);
    group.add(ring);

    const bike = createShowroomDisplayBike(mats, bikeColors[i % bikeColors.length]);
    bike.position.set(-7.6, 0.78, pz);
    bike.rotation.y = -Math.PI * 0.38;
    bike.scale.setScalar(1.22);
    group.add(bike);
  }
  for (let j = 0; j < 2; j++) {
    const rz = -7.5 + j * 11;
    const bike = createShowroomDisplayBike(mats, j === 0 ? 0xdc2626 : 0xf59e0b);
    bike.position.set(-3.2, 1.82, rz);
    bike.rotation.y = -Math.PI / 2;
    bike.scale.setScalar(1.25);
    group.add(bike);
  }

  // Panoramic crystal-clear glass gallery walls (depthWrite: false so bikes inside shine clearly!)
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(33, 9.8), mats.glassGalleryClear);
  frontGlass.position.set(-11.2, 5.1, -2);
  frontGlass.rotation.y = -Math.PI / 2;
  frontGlass.renderOrder = 2;
  group.add(frontGlass);

  for (const gz of [-18.5, 14.5]) {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 9.8), mats.glassGalleryClear);
    sideGlass.position.set(-6.1, 5.1, gz);
    if (gz < 0) sideGlass.rotation.y = Math.PI;
    sideGlass.renderOrder = 2;
    group.add(sideGlass);
  }

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1.8, 37), mats.heroRed);
  canopy.position.set(-4.2, 11.4, -2);
  canopy.castShadow = true;
  group.add(canopy);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(18, 1.6, 36.6), mats.heroCharcoal);
  crown.position.set(3.5, 13.0, -2);
  group.add(crown);

  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 10.6, 0.45), mats.steelDark);
    fin.position.set(-11.25, 5.5, -17.5 + i * 6.2);
    group.add(fin);
  }

  // Hero Red Fascia Header Band + Street-level Signboards
  const frontSign = makeSignMesh(textures.signTextures.niloyHero, 22, 3.4, 0.85);
  frontSign.position.set(-11.8, 8.6, -2);
  frontSign.rotation.y = -Math.PI / 2;
  group.add(frontSign);

  const southSign = makeSignMesh(textures.signTextures.niloyHero, 14, 2.8, 0.78);
  southSign.position.set(2, 4.8, 24.75);
  group.add(southSign);

  const northSign = makeSignMesh(textures.signTextures.niloyHero, 14, 2.8, 0.78);
  northSign.position.set(2, 4.8, -20.2);
  northSign.rotation.y = Math.PI;
  group.add(northSign);

  const serviceWing = new THREE.Mesh(new THREE.BoxGeometry(18, 7.2, 11), mats.towerStone);
  serviceWing.position.set(2, 3.7, 19);
  serviceWing.castShadow = true;
  group.add(serviceWing);

  const serviceHeader = new THREE.Mesh(new THREE.BoxGeometry(18.4, 1.2, 11.4), mats.heroRed);
  serviceHeader.position.set(2, 7.4, 19);
  group.add(serviceHeader);

  const showroomGlow = new THREE.PointLight(0xffb74d, 18, 45, 1.5);
  showroomGlow.position.set(-14, 9, -2);
  group.add(showroomGlow);

  mergeGroupMeshesByMaterial(group);
  return group;
}

/**
 * 1B. Regional Niloy Hero Motorcycle Showroom & Bike Gallery (Zero PointLights for fast multi-branch placement)
 * Front (-X) features panoramic crystal-clear gallery glass displaying 5 Hero motorcycles + paved bike parking bay.
 */
export function createNiloyHeroBranchShowroom(
  mats: SceneMaterials,
  textures: ProceduralTextures,
): THREE.Group {
  const group = new THREE.Group();
  const { deckMat, wallMat } = ensureGalleryInteriorMats();

  const plaza = new THREE.Mesh(new THREE.BoxGeometry(34, 0.16, 40), mats.sidewalk);
  plaza.position.set(-1, 0.08, 0);
  plaza.receiveShadow = true;
  group.add(plaza);

  const parkingApron = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 32), mats.asphaltService);
  parkingApron.rotation.x = -Math.PI / 2;
  parkingApron.position.set(-13.8, 0.17, 0);
  group.add(parkingApron);

  for (let i = -2; i <= 2; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.15), mats.hospitalWhite);
    line.rotation.x = -Math.PI / 2;
    line.position.set(-13.4, 0.18, i * 4.4);
    group.add(line);
  }

  const rearHall = new THREE.Mesh(new THREE.BoxGeometry(12, 9.6, 32), mats.heroCharcoal);
  rearHall.position.set(7.5, 4.9, 0);
  rearHall.castShadow = true;
  rearHall.receiveShadow = true;
  group.add(rearHall);

  const galleryBackdrop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.2, 29), wallMat);
  galleryBackdrop.position.set(1.3, 4.2, 0);
  group.add(galleryBackdrop);

  const interiorDeck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.22, 30), deckMat);
  interiorDeck.position.set(-3.6, 0.26, 0);
  group.add(interiorDeck);

  // Rear elevated display deck inside gallery
  const riser = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.25, 18), mats.heroCharcoal);
  riser.position.set(-0.6, 0.95, 0);
  group.add(riser);
  const riserLip = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.16, 18.2), mats.heroRed);
  riserLip.position.set(-0.6, 1.58, 0);
  group.add(riserLip);

  const branchColors = [0xdc2626, 0x2563eb, 0x059669, 0xdc2626];
  for (let i = 0; i < 4; i++) {
    const bz = -10.5 + i * 7.0;
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.85, 0.32, 14), mats.heroCharcoal);
    plinth.position.set(-5.2, 0.5, bz);
    group.add(plinth);

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.08, 14), mats.heroRed);
    ring.position.set(-5.2, 0.68, bz);
    group.add(ring);

    const bike = createShowroomDisplayBike(mats, branchColors[i]);
    bike.position.set(-5.2, 0.72, bz);
    bike.rotation.y = -Math.PI * 0.36;
    bike.scale.setScalar(1.2);
    group.add(bike);
  }
  for (let j = 0; j < 2; j++) {
    const rz = -4.5 + j * 9.0;
    const bike = createShowroomDisplayBike(mats, j === 0 ? 0xdc2626 : 0xf59e0b);
    bike.position.set(-0.6, 1.66, rz);
    bike.rotation.y = -Math.PI / 2;
    bike.scale.setScalar(1.22);
    group.add(bike);
  }

  // Crystal-clear front & side glass panes so riders see the bike gallery from the road
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(30, 8.0), mats.glassGalleryClear);
  frontGlass.position.set(-8.4, 4.2, 0);
  frontGlass.rotation.y = -Math.PI / 2;
  frontGlass.renderOrder = 2;
  group.add(frontGlass);

  for (const gz of [-15, 15]) {
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 8.0), mats.glassGalleryClear);
    sideGlass.position.set(-3.5, 4.2, gz);
    if (gz < 0) sideGlass.rotation.y = Math.PI;
    sideGlass.renderOrder = 2;
    group.add(sideGlass);
  }

  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.4, 0.38), mats.steelDark);
    fin.position.set(-8.45, 4.3, -13.5 + i * 6.75);
    group.add(fin);
  }

  // Hero Red Fascia Canopy + Dark Crown
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(12.8, 1.55, 33), mats.heroRed);
  fascia.position.set(-2.8, 9.0, 0);
  fascia.castShadow = true;
  group.add(fascia);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(13.5, 1.4, 33.4), mats.heroCharcoal);
  crown.position.set(6.8, 10.4, 0);
  group.add(crown);

  const signFront = makeSignMesh(textures.signTextures.niloyHeroBranch, 19, 3.0, 0.85);
  signFront.position.set(-9.35, 7.3, 0);
  signFront.rotation.y = -Math.PI / 2;
  group.add(signFront);

  const signSouth = makeSignMesh(textures.signTextures.niloyHeroBranch, 12.5, 2.5, 0.78);
  signSouth.position.set(2.5, 4.5, 16.25);
  group.add(signSouth);

  const signNorth = makeSignMesh(textures.signTextures.niloyHeroBranch, 12.5, 2.5, 0.78);
  signNorth.position.set(2.5, 4.5, -16.25);
  signNorth.rotation.y = Math.PI;
  group.add(signNorth);

  mergeGroupMeshesByMaterial(group);
  return group;
}

/**
 * 2. Nitol-Niloy Group Branded Corporate / Industrial Building
 */
export function createNitolNiloyBuilding(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
  width: number,
  depth: number,
  height: number,
  accentHex = 0x2563eb,
): THREE.Group {
  const group = new THREE.Group();
  const accentMat = getAccentMaterial(accentHex, 0.32, 0.45);

  // Ground stone & illuminated showroom podium with projecting entry portico
  const podium = new THREE.Mesh(new THREE.BoxGeometry(width + 4.2, 5.8, depth + 4.2), mats.heroCharcoal);
  podium.position.y = 2.9;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  const groundGlass = new THREE.Mesh(
    new THREE.BoxGeometry(width + 4.4, 3.8, depth + 4.4),
    mats.glassShowroom,
  );
  groundGlass.position.y = 2.3;
  group.add(groundGlass);

  const portico = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.9, depth * 0.52), accentMat);
  portico.position.set(-width / 2 - 3.8, 5.2, 0);
  group.add(portico);

  // Main corporate glazed shaft with structural stone pilasters & horizontal spandrel bands
  const shaftH = height - 8.2;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, shaftH, depth), mats.glassTowerWarm);
  shaft.position.y = 5.8 + shaftH / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  for (const px of [-width * 0.48, -width * 0.18, width * 0.18, width * 0.48]) {
    for (const pz of [-depth * 0.48, depth * 0.48]) {
      const pilaster = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, shaftH + 1.2, 1.1),
        mats.towerCream,
      );
      pilaster.position.set(px, 5.8 + shaftH / 2, pz);
      group.add(pilaster);
    }
  }

  // Stepped architectural crown + mechanical penthouse + rooftop communication mast
  const crown = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 3.2, depth * 0.84), mats.towerStone);
  crown.position.y = height - 0.8;
  group.add(crown);

  const band = new THREE.Mesh(new THREE.BoxGeometry(width + 1.6, 2.2, depth + 1.6), accentMat);
  band.position.y = height - 2.2;
  group.add(band);

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.6, 12), mats.towerCream);
  tank.position.set(width * 0.24, height + 2.0, depth * 0.2);
  group.add(tank);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 6.5, 8), mats.steelBridge);
  mast.position.set(-width * 0.15, height + 3.8, -depth * 0.15);
  group.add(mast);

  // Bilingual company signboards mounted at road/pedestrian eye-level on all 4 lower podium walls
  const signW = Math.min(width + 1.6, 20);
  const signH = signW * 0.22;
  const wallY = 4.6;

  const signWest = makeSignMesh(signTex, signW, signH, 0.82);
  signWest.position.set(-width / 2 - 2.28, wallY, 0);
  signWest.rotation.y = -Math.PI / 2;
  group.add(signWest);

  const signEast = makeSignMesh(signTex, signW, signH, 0.82);
  signEast.position.set(width / 2 + 2.28, wallY, 0);
  signEast.rotation.y = Math.PI / 2;
  group.add(signEast);

  const signSouth = makeSignMesh(signTex, signW, signH, 0.82);
  signSouth.position.set(0, wallY, depth / 2 + 2.28);
  group.add(signSouth);

  const signNorth = makeSignMesh(signTex, signW, signH, 0.82);
  signNorth.position.set(0, wallY, -depth / 2 - 2.28);
  signNorth.rotation.y = Math.PI;
  group.add(signNorth);

  return group;
}

/**
 * 3. Overhead Bilingual Highway Gantry Sign
 */
export function createSignGantry(
  tex: THREE.CanvasTexture,
  mats: SceneMaterials,
  spanWidth: number,
  height = 8.6,
): THREE.Group {
  const group = new THREE.Group();
  const half = spanWidth / 2;

  const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, height, 10), mats.steelBridge);
  leftPost.position.set(-half, height / 2, 0);
  group.add(leftPost);

  const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, height, 10), mats.steelBridge);
  rightPost.position.set(half, height / 2, 0);
  group.add(rightPost);

  const truss = new THREE.Mesh(new THREE.BoxGeometry(spanWidth + 1.2, 0.55, 0.6), mats.steelBridge);
  truss.position.set(0, height - 0.3, 0);
  group.add(truss);

  const signW = Math.min(spanWidth * 0.78, 21);
  const signH = signW * 0.25;
  const boardBack = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.3, signH + 0.3, 0.22), mats.steelDark);
  boardBack.position.set(0, height + 0.4, 0);
  group.add(boardBack);

  const frontFace = makeSignMesh(tex, signW, signH, 0.58);
  frontFace.position.set(0, height + 0.4, 0.14);
  group.add(frontFace);

  const backFace = makeSignMesh(tex, signW, signH, 0.58);
  backFace.position.set(0, height + 0.4, -0.14);
  backFace.rotation.y = Math.PI;
  group.add(backFace);

  mergeGroupMeshesByMaterial(group);
  return group;
}

/**
 * 3B. Full-Span Overhead Street Banner & Lighting Portal Arch
 * Both support columns stand strictly outside the outer road curbs/sidewalks while
 * the overhead steel truss & Nitol-Niloy banners span high above all traffic lanes.
 */
export function createOverheadBannerPortal(
  mats: SceneMaterials,
  bannerMatA: THREE.MeshStandardMaterial,
  bannerMatB: THREE.MeshStandardMaterial,
  spanWidth: number,
  clearanceHeight = 9.4,
): THREE.Group {
  const group = new THREE.Group();
  const half = spanWidth / 2;
  const topY = clearanceHeight + 2.9;

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.38, topY, 10),
      mats.steelBridge,
    );
    post.position.set(side * half, topY / 2, 0);
    group.add(post);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.7, 1.1),
      mats.concreteBarrier,
    );
    plinth.position.set(side * half, 0.35, 0);
    group.add(plinth);
  }

  // Twin high overhead truss chords spanning completely from left curb to right curb
  const lowerChord = new THREE.Mesh(
    new THREE.BoxGeometry(spanWidth + 1.4, 0.36, 0.44),
    mats.steelBridge,
  );
  lowerChord.position.set(0, clearanceHeight, 0);
  group.add(lowerChord);

  const upperChord = new THREE.Mesh(
    new THREE.BoxGeometry(spanWidth + 1.4, 0.36, 0.44),
    mats.heroRed,
  );
  upperChord.position.set(0, topY - 0.18, 0);
  group.add(upperChord);

  // Overhead truss vertical struts + down-facing highway lamps
  const nStruts = Math.max(4, Math.round(spanWidth / 6));
  for (let i = 1; i < nStruts; i++) {
    const sx = -half + (i / nStruts) * spanWidth;
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, topY - clearanceHeight, 0.22),
      mats.steelDark,
    );
    strut.position.set(sx, (clearanceHeight + topY) * 0.5, 0);
    group.add(strut);
  }

  for (const lx of [-half * 0.45, half * 0.45]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.5), mats.lampGlow);
    lamp.position.set(lx, clearanceHeight - 0.24, 0);
    group.add(lamp);
  }

  // High overhead Nitol-Niloy / Hero double-sided banners mounted cleanly on the upper arch (y >= clearanceHeight)
  const bannerGeo = new THREE.PlaneGeometry(2.1, 3.3);
  const bannerPositions = [-spanWidth * 0.26, 0, spanWidth * 0.26];
  bannerPositions.forEach((bx, idx) => {
    const bMat = idx % 2 === 0 ? bannerMatA : bannerMatB;
    const banner = new THREE.Mesh(bannerGeo, bMat);
    banner.position.set(bx, clearanceHeight + 1.45, 0);
    group.add(banner);
  });

  mergeGroupMeshesByMaterial(group);
  return group;
}

/**
 * 4. Roadside Highway Billboard (Purbachal / Gazipur / Metro Corridor)
 */
export function createRoadsideBillboard(
  tex: THREE.CanvasTexture,
  mats: SceneMaterials,
  width = 16,
  height = 4.2,
  poleHeight = 9.5,
): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, poleHeight, 10), mats.steelDark);
  pole.position.y = poleHeight / 2;
  group.add(pole);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, height + 0.5, 0.35), mats.heroCharcoal);
  frame.position.y = poleHeight + height / 2 - 0.4;
  group.add(frame);

  const f1 = makeSignMesh(tex, width, height, 0.65);
  f1.position.set(0, poleHeight + height / 2 - 0.4, 0.22);
  group.add(f1);

  const f2 = makeSignMesh(tex, width, height, 0.65);
  f2.position.set(0, poleHeight + height / 2 - 0.4, -0.22);
  f2.rotation.y = Math.PI;
  group.add(f2);

  return group;
}

/**
 * 5. Dhaka Pedestrian Foot Overbridge
 */
export function createFootOverbridge(
  mats: SceneMaterials,
  spanWidth: number,
  signTex?: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();
  const deckY = 6.6;
  const half = spanWidth / 2;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(spanWidth + 2, 0.45, 3.4), mats.concreteViaduct);
  deck.position.set(0, deckY, 0);
  deck.castShadow = true;
  group.add(deck);

  for (const sz of [-1.6, 1.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanWidth + 2, 1.1, 0.14), mats.steelBridge);
    rail.position.set(0, deckY + 0.75, sz);
    group.add(rail);
  }

  if (!cachedFobRoofMat) {
    cachedFobRoofMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.45,
    });
  }
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(spanWidth + 1.5, 0.18, 4.0),
    cachedFobRoofMat,
  );
  roof.position.set(0, deckY + 2.75, 0);
  group.add(roof);

  for (const side of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, deckY, 10), mats.concreteViaduct);
    pier.position.set(side * half, deckY / 2, 0);
    group.add(pier);

    const stairLen = 9.5;
    const stair = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, stairLen), mats.concreteViaduct);
    stair.position.set(side * (half + 1.8), deckY / 2, 3.8);
    stair.rotation.x = Math.atan2(deckY, 7.6);
    group.add(stair);

    for (const sz of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), mats.steelDark);
      post.position.set(side * (half * 0.45), deckY + 1.4, sz);
      group.add(post);
    }
  }

  if (signTex) {
    const s1 = makeSignMesh(signTex, Math.min(spanWidth * 0.55, 13), 2.3, 0.52);
    s1.position.set(0, deckY + 1.35, 1.72);
    group.add(s1);
    const s2 = makeSignMesh(signTex, Math.min(spanWidth * 0.55, 13), 2.3, 0.52);
    s2.position.set(0, deckY + 1.35, -1.72);
    s2.rotation.y = Math.PI;
    group.add(s2);
  }

  return group;
}

/**
 * 6. Grade-Separated Vehicular Underpass
 */
export function createRoadUnderpass(
  mats: SceneMaterials,
  expressWidth: number,
  crossRoadLength: number,
  roadMat: THREE.Material = mats.asphaltMain,
): THREE.Group {
  const group = new THREE.Group();

  const bridgeSlab = new THREE.Mesh(
    new THREE.BoxGeometry(20.6, 1.2, expressWidth),
    mats.concreteViaduct,
  );
  bridgeSlab.position.set(0, -0.52, 0);
  bridgeSlab.receiveShadow = true;
  group.add(bridgeSlab);

  for (const sx of [-9.8, 9.8]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 4.4, crossRoadLength),
      mats.concreteBarrier,
    );
    wall.position.set(sx, -1.6, 0);
    group.add(wall);
  }

  const underRoad = new THREE.Mesh(
    new THREE.BoxGeometry(18.5, 0.2, crossRoadLength),
    roadMat,
  );
  underRoad.position.set(0, -3.5, 0);
  group.add(underRoad);

  for (const side of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.25, 28), roadMat);
    ramp.position.set(0, -1.75, side * (crossRoadLength / 2 + 12));
    ramp.rotation.x = side * -0.13;
    group.add(ramp);

    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(21.0, 0.9, 0.6),
      mats.concreteBarrier,
    );
    parapet.position.set(0, 0.58, side * (expressWidth / 2 + 0.45));
    group.add(parapet);

    const beacon = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 0.35), mats.lampGlow);
    beacon.position.set(0, 0.95, side * (expressWidth / 2 + 0.65));
    group.add(beacon);
  }

  return group;
}

/**
 * 7. Multi-Story Commercial Tower (with rooftop tank & ground retail base)
 */
export function createModernTower(
  mats: SceneMaterials,
  width: number,
  depth: number,
  height: number,
  style: 'cool' | 'warm' | 'concrete' = 'warm',
): THREE.Group {
  const group = new THREE.Group();

  const podiumH = Math.min(5.8, height * 0.22);
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(width + 1.8, podiumH, depth + 1.8),
    mats.heroCharcoal,
  );
  podium.position.y = podiumH / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  // Glowing ground-level storefront glass band
  const shopfront = new THREE.Mesh(
    new THREE.BoxGeometry(width + 2.0, 2.4, depth + 2.0),
    mats.glassShowroom,
  );
  shopfront.position.y = 1.6;
  group.add(shopfront);

  const shaftH = height - podiumH - 2.2;
  const shaftMat =
    style === 'cool'
      ? mats.glassTowerCool
      : style === 'concrete'
        ? mats.commercialFacade
        : mats.glassTowerWarm;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, shaftH, depth), shaftMat);
  shaft.position.y = podiumH + shaftH / 2;
  shaft.castShadow = true;
  group.add(shaft);

  const finGeo = new THREE.BoxGeometry(0.85, shaftH + 1.0, 0.85);
  for (const fx of [-width / 2, width / 2]) {
    for (const fz of [-depth / 2, depth / 2]) {
      const fin = new THREE.Mesh(finGeo, mats.towerCream);
      fin.position.set(fx, podiumH + shaftH / 2, fz);
      group.add(fin);
    }
  }

  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.72, 2.0, depth * 0.72),
    mats.towerStone,
  );
  crown.position.y = podiumH + shaftH + 1.0;
  group.add(crown);

  // Iconic Dhaka rooftop water tank
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 10), mats.heroCharcoal);
  tank.position.set(width * 0.2, podiumH + shaftH + 3.0, -depth * 0.15);
  group.add(tank);

  return group;
}

/**
 * 8. Realistic Dhaka Multi-Story Market & Street Bazaar Complex
 * Features concrete market hall with arched corrugated shed roofs, ground-level
 * roll-up shopfronts, projecting vendor canopies, umbrellas, and warm stall lights.
 */
export function createMarketCluster(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  // Paved market apron
  const apron = new THREE.Mesh(new THREE.BoxGeometry(36, 0.35, 52), mats.sidewalk);
  apron.position.set(0, 0.175, 0);
  apron.receiveShadow = true;
  group.add(apron);

  // Multi-story market plaza building (rear)
  const plazaBody = new THREE.Mesh(new THREE.BoxGeometry(20, 12.5, 44), mats.commercialFacade);
  plazaBody.position.set(6, 6.45, 0);
  plazaBody.castShadow = true;
  group.add(plazaBody);

  // Ground-floor illuminated retail arcade shutters + glass bays
  for (let i = 0; i < 7; i++) {
    const sz = -18 + i * 6;
    const shopBay = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 4.8), mats.glassShowroom);
    shopBay.position.set(-4.2, 2.1, sz);
    group.add(shopBay);

    const shutterFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 5.2), mats.heroCharcoal);
    shutterFrame.position.set(-4.3, 4.1, sz);
    group.add(shutterFrame);
  }

  // Corrugated steel kacha-bazaar market shed hall in front
  const shedRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.2, 42, 12, 1, false, 0, Math.PI),
    mats.hospitalTeal,
  );
  shedRoof.rotation.z = Math.PI / 2;
  shedRoof.rotation.y = Math.PI / 2;
  shedRoof.position.set(-8.5, 4.5, 0);
  shedRoof.scale.set(0.45, 1, 1);
  group.add(shedRoof);

  // Open bazaar stalls, colorful tarps, crates & market umbrellas along roadside
  for (let i = 0; i < 8; i++) {
    const sz = -19 + i * 5.4;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 4.2), mats.towerCream);
    counter.position.set(-10.5, 0.75, sz);
    group.add(counter);

    const tarp = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.16, 4.8),
      mats.marketAwningColors[i % mats.marketAwningColors.length],
    );
    tarp.position.set(-11.2, 3.55, sz);
    tarp.rotation.z = 0.24;
    group.add(tarp);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), mats.lampGlow);
    lamp.position.set(-10.5, 3.2, sz);
    group.add(lamp);
  }

  const sign = makeSignMesh(signTex, 20, 3.4, 0.72);
  sign.position.set(-4.35, 4.8, 0);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  return group;
}

/**
 * 9. Realistic Neela Market (Purbachal 300 Feet Culinary & Bazaar Hub)
 */
export function createNeelaMarket(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  const pad = new THREE.Mesh(new THREE.BoxGeometry(106, 0.4, 46), mats.sidewalk);
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  group.add(pad);

  // Iconic Neela Market Gateway Arch (low enough for clear road reading)
  for (const sx of [-20, 20]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8.6, 2.4), mats.heroRed);
    pillar.position.set(sx, 4.3, 19);
    group.add(pillar);
  }
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(44, 3.2, 2.8), mats.heroCharcoal);
  archBeam.position.set(0, 7.6, 19);
  group.add(archBeam);

  const archSign = makeSignMesh(signTex, 26, 4.0, 0.78);
  archSign.position.set(0, 7.6, 20.5);
  group.add(archSign);

  // Two rows of realistic dining pavilions & bazaar sheds with glowing shopfronts
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      const x = -42 + col * 12;
      const z = -12 + row * 16;
      const stallBase = new THREE.Mesh(new THREE.BoxGeometry(10.2, 3.8, 10.2), mats.towerCream);
      stallBase.position.set(x, 2.1, z);
      stallBase.castShadow = true;
      group.add(stallBase);

      const shopGlass = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.4, 10.4), mats.glassShowroom);
      shopGlass.position.set(x, 1.6, z);
      group.add(shopGlass);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(7.8, 2.6, 4),
        mats.marketAwningColors[(row * 3 + col) % mats.marketAwningColors.length],
      );
      roof.position.set(x, 5.4, z);
      roof.rotation.y = Math.PI / 4;
      group.add(roof);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), mats.lampGlow);
      lantern.position.set(x, 4.0, z + 5.6);
      group.add(lantern);
    }
  }

  return group;
}

/**
 * 10. Luxury Hotel Complex (Radisson Blu Water Garden / Sheraton Banani)
 */
export function createHotelComplex(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
  isResortStyle: boolean,
): THREE.Group {
  const group = new THREE.Group();

  if (isResortStyle) {
    const basePlaza = new THREE.Mesh(new THREE.BoxGeometry(48, 0.4, 66), mats.towerCream);
    basePlaza.position.y = 0.2;
    basePlaza.receiveShadow = true;
    group.add(basePlaza);

    const waterPool = new THREE.Mesh(new THREE.BoxGeometry(13, 0.15, 40), mats.canalWater);
    waterPool.position.set(14, 0.42, 0);
    group.add(waterPool);

    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(20, 19, 46), mats.towerCream);
    mainWing.position.set(-6, 9.8, 0);
    mainWing.castShadow = true;
    group.add(mainWing);

    const glassAtrium = new THREE.Mesh(new THREE.BoxGeometry(14, 15, 26), mats.glassTowerWarm);
    glassAtrium.position.set(3, 7.8, 0);
    group.add(glassAtrium);

    const porteCochere = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 14), mats.heroCharcoal);
    porteCochere.position.set(12, 5.2, 0);
    group.add(porteCochere);

    const marquee = makeSignMesh(signTex, 13.5, 2.6, 0.75);
    marquee.position.set(16.6, 5.2, 0);
    marquee.rotation.y = Math.PI / 2;
    group.add(marquee);
  } else {
    const podium = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 28), mats.towerCream);
    podium.position.y = 4;
    podium.castShadow = true;
    group.add(podium);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(20, 34, 22), mats.glassTowerWarm);
    tower.position.y = 25;
    tower.castShadow = true;
    group.add(tower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(21, 3, 23), mats.heroCharcoal);
    crown.position.y = 43.5;
    group.add(crown);

    const signW = makeSignMesh(signTex, 18, 3.4, 0.78);
    signW.position.set(-13.15, 5.2, 0);
    signW.rotation.y = -Math.PI / 2;
    group.add(signW);

    const signS = makeSignMesh(signTex, 18, 3.4, 0.78);
    signS.position.set(0, 5.2, 14.15);
    group.add(signS);
  }

  return group;
}

/**
 * 11. Kurmitola General Hospital Complex
 */
export function createHospitalComplex(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 52), mats.sidewalk);
  plinth.position.y = 0.25;
  group.add(plinth);

  const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(24, 20, 38), mats.hospitalWhite);
  mainBlock.position.set(3, 10.5, 0);
  mainBlock.castShadow = true;
  group.add(mainBlock);

  const glassAtrium = new THREE.Mesh(new THREE.BoxGeometry(8, 17, 18), mats.glassTowerCool);
  glassAtrium.position.set(-9, 9, 0);
  group.add(glassAtrium);

  const tealBand = new THREE.Mesh(new THREE.BoxGeometry(25, 2.2, 39), mats.hospitalTeal);
  tealBand.position.set(3, 19.5, 0);
  group.add(tealBand);

  const erCanopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 12), mats.heroRed);
  erCanopy.position.set(-13, 4.6, 10);
  group.add(erCanopy);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 6), mats.heroRed);
  crossH.position.set(-6, 21.5, 0);
  group.add(crossH);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 1.5), mats.heroRed);
  crossV.position.set(-6, 21.5, 0);
  group.add(crossV);

  const sign = makeSignMesh(signTex, 18, 3.4, 0.76);
  sign.position.set(-13.15, 4.8, -5);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  const erSign = makeSignMesh(signTex, 11, 2.2, 0.76);
  erSign.position.set(-18.12, 4.7, 10);
  erSign.rotation.y = -Math.PI / 2;
  group.add(erSign);

  return group;
}

/**
 * 12. Armed Forces Medical College (AFMC)
 */
export function createMedicalCollege(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(38, 0.5, 44), mats.towerCream);
  plinth.position.y = 0.25;
  group.add(plinth);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 12), mats.towerCream);
  leftWing.position.set(4, 7.5, -13);
  leftWing.castShadow = true;
  group.add(leftWing);

  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 12), mats.towerCream);
  rightWing.position.set(4, 7.5, 13);
  rightWing.castShadow = true;
  group.add(rightWing);

  const centerHall = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 18), mats.hospitalWhite);
  centerHall.position.set(8, 8.5, 0);
  centerHall.castShadow = true;
  group.add(centerHall);

  const portico = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 14), mats.hospitalTeal);
  portico.position.set(-6, 5.5, 0);
  group.add(portico);

  const sign = makeSignMesh(signTex, 13.5, 2.8, 0.72);
  sign.position.set(-10.15, 4.8, 0);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  return group;
}

/**
 * 13. Authentic Dhaka Metro Rail (MRT-6) Elevated Station
 * Iconic curved barrel-vault roof, DMTCL green/red fascia, glass-walled concourse,
 * 4 covered street-level escalator/stairway pavilions, and prominent bilingual station boards.
 */
export function createMetroStation(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
  withDepot = false,
): THREE.Group {
  const group = new THREE.Group();

  // 1. Wide Concourse Level spanning over the 4-lane avenue below
  const concourse = new THREE.Mesh(new THREE.BoxGeometry(22, 4.6, 76), mats.concreteViaduct);
  concourse.position.y = 8.4;
  concourse.castShadow = true;
  group.add(concourse);

  // Illuminated glass concourse windows along East & West sides
  const concourseGlass = new THREE.Mesh(new THREE.BoxGeometry(22.4, 3.2, 68), mats.glassShowroom);
  concourseGlass.position.y = 8.4;
  group.add(concourseGlass);

  // 2. Platform Level (train floor)
  const platform = new THREE.Mesh(new THREE.BoxGeometry(24, 1.4, 84), mats.concreteViaduct);
  platform.position.y = 12.8;
  group.add(platform);

  // 3. Iconic Dhaka MRT-6 Curved Arch Barrel-Vault Roof
  const vaultRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(13.5, 13.5, 86, 18, 1, false, 0, Math.PI),
    mats.hospitalWhite,
  );
  vaultRoof.rotation.z = Math.PI / 2;
  vaultRoof.rotation.y = Math.PI / 2;
  vaultRoof.position.y = 18.2;
  vaultRoof.scale.set(0.32, 1, 1);
  vaultRoof.castShadow = true;
  group.add(vaultRoof);

  // Signature Dhaka Metro DMTCL Green & Red Ribbon Fascia along both sides
  const greenBand = new THREE.Mesh(new THREE.BoxGeometry(26.6, 1.35, 86.2), mats.hospitalTeal);
  greenBand.position.y = 17.6;
  group.add(greenBand);

  const redAccent = new THREE.Mesh(new THREE.BoxGeometry(26.8, 0.45, 86.4), mats.heroRed);
  redAccent.position.y = 16.7;
  group.add(redAccent);

  // Steel roof support columns along platform edges
  for (const sx of [-11.5, 11.5]) {
    for (let pz = -36; pz <= 36; pz += 18) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 4.8, 8), mats.steelBridge);
      col.position.set(sx, 15.2, pz);
      group.add(col);
    }
  }

  // 4. Four Street-Level Escalator & Stairway Entry Pavilions reaching the sidewalks
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 18), mats.concreteViaduct);
      stair.position.set(sx * 16.5, 4.1, sz * 22);
      stair.rotation.x = sz * -0.44;
      group.add(stair);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 18.5), mats.hospitalTeal);
      canopy.position.set(sx * 16.5, 6.2, sz * 22);
      canopy.rotation.x = sz * -0.44;
      group.add(canopy);
    }
  }

  // Heavy Station Support Piers Straddling the Central Median (clear of ±12m cross-street intersections)
  for (const pz of [-34, -22, 22, 34]) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 8.2, 12), mats.concreteViaduct);
    pier.position.set(0, 4.1, pz);
    group.add(pier);
  }

  // Station platforms & concourse are self-illuminated via glassShowroom emissive material

  if (withDepot) {
    // Diabari MRT-6 Maintenance Depot Sheds
    for (let d = 0; d < 3; d++) {
      const shed = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 86), mats.steelBridge);
      shed.position.set(-48 - d * 28, 6, -24);
      shed.castShadow = true;
      group.add(shed);

      const shedTrim = new THREE.Mesh(new THREE.BoxGeometry(24.4, 1.6, 86.4), mats.hospitalTeal);
      shedTrim.position.set(-48 - d * 28, 11.4, -24);
      group.add(shedTrim);
    }
  }

  // Large Prominent Bilingual Station Nameboards on elevated sides + street-level entry walls
  const sRight = makeSignMesh(signTex, 30, 4.4, 0.82);
  sRight.position.set(13.6, 15.2, 0);
  sRight.rotation.y = Math.PI / 2;
  group.add(sRight);

  const sLeft = makeSignMesh(signTex, 30, 4.4, 0.82);
  sLeft.position.set(-13.6, 15.2, 0);
  sLeft.rotation.y = -Math.PI / 2;
  group.add(sLeft);

  const sStreetR = makeSignMesh(signTex, 16, 2.8, 0.78);
  sStreetR.position.set(14.5, 4.6, 0);
  sStreetR.rotation.y = Math.PI / 2;
  group.add(sStreetR);

  const sStreetL = makeSignMesh(signTex, 16, 2.8, 0.78);
  sStreetL.position.set(-14.5, 4.6, 0);
  sStreetL.rotation.y = -Math.PI / 2;
  group.add(sStreetL);

  return group;
}

/**
 * 14. Jatiya Sangsad Bhaban (National Parliament House of Bangladesh)
 * Monumental Louis Kahn brutalist concrete + marble-inlay geometry surrounded by water moat & South Plaza
 */
export function createSangsadBhaban(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  // Outer water moat / lake surrounding the parliament island
  const moat = new THREE.Mesh(new THREE.BoxGeometry(108, 0.14, 96), mats.canalWater);
  moat.position.set(0, 0.08, 0);
  group.add(moat);

  // Grand concrete South Plaza podium
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(84, 1.8, 72), mats.towerCream);
  plaza.position.set(0, 0.9, 6);
  plaza.receiveShadow = true;
  group.add(plaza);

  const steps = new THREE.Mesh(new THREE.BoxGeometry(44, 0.9, 14), mats.concreteBarrier);
  steps.position.set(0, 0.45, 46);
  group.add(steps);

  // Central monumental octagonal Assembly Chamber drum
  const centralDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(16.5, 17.5, 32, 8),
    mats.concreteViaduct,
  );
  centralDrum.position.set(0, 17, 0);
  centralDrum.castShadow = true;
  centralDrum.receiveShadow = true;
  group.add(centralDrum);

  // Characteristic white marble horizontal inlay bands
  for (const by of [9, 17, 25, 31.5]) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(17.1, 17.1, 0.75, 8),
      mats.hospitalWhite,
    );
    band.position.set(0, by, 0);
    group.add(band);
  }

  // Dark geometric triangular / circular architectural voids on faces
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const voidMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 1.4, 3), mats.heroCharcoal);
    voidMesh.rotation.x = Math.PI / 2;
    voidMesh.rotation.z = ang;
    voidMesh.position.set(Math.sin(ang) * 16.2, 20, Math.cos(ang) * 16.2);
    voidMesh.lookAt(Math.sin(ang) * 32, 20, Math.cos(ang) * 32);
    group.add(voidMesh);
  }

  // 8 surrounding prism wings / ministerial blocks
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rx = Math.sin(ang) * 24.5;
    const rz = Math.cos(ang) * 24.5;
    const wingH = i % 2 === 0 ? 22 : 18;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, wingH, 11.5), mats.concreteViaduct);
    wing.position.set(rx, 1.8 + wingH / 2, rz);
    wing.rotation.y = ang;
    wing.castShadow = true;
    group.add(wing);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(11.9, 0.7, 11.9), mats.hospitalWhite);
    trim.position.set(rx, 1.8 + wingH - 1.2, rz);
    trim.rotation.y = ang;
    group.add(trim);
  }

  // Warm ceremonial illumination
  const domeLight = new THREE.PointLight(0xffd580, 26, 95, 1.4);
  domeLight.position.set(0, 28, 32);
  group.add(domeLight);

  const sign = makeSignMesh(signTex, 26, 4.4, 0.68);
  sign.position.set(0, 5.2, 43);
  group.add(sign);

  return group;
}

/**
 * 15. Roadside Dhaka Restaurant & Cafe Complex
 */
export function createRestaurantComplex(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
  accentHex = 0xd97706,
): THREE.Group {
  const group = new THREE.Group();
  const awningMat = getAccentMaterial(accentHex, 0.55, 0.15);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 18), mats.sidewalk);
  deck.position.y = 0.2;
  deck.receiveShadow = true;
  group.add(deck);

  const diningHall = new THREE.Mesh(new THREE.BoxGeometry(18, 6.2, 12), mats.glassShowroom);
  diningHall.position.set(1.5, 3.3, 0);
  diningHall.castShadow = true;
  group.add(diningHall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(21, 1.2, 15), mats.heroCharcoal);
  roof.position.set(0.5, 6.8, 0);
  group.add(roof);

  const fascia = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.9, 15.4), awningMat);
  fascia.position.set(0.5, 6.0, 0);
  group.add(fascia);

  // Outdoor dining terrace tables & colorful umbrellas
  for (const uz of [-4.5, 0, 4.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 6), mats.steelDark);
    pole.position.set(-9.5, 1.6, uz);
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 8), awningMat);
    umbrella.position.set(-9.5, 3.0, uz);
    group.add(pole, umbrella);
  }

  const sign = makeSignMesh(signTex, 13.5, 2.4, 0.8);
  sign.position.set(-10.32, 5.2, 0);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  return group;
}

/**
 * 15B. Nitol-Niloy Gas Ltd — Petrol, Octane, Diesel & CNG Station
 * Flush concrete/asphalt refueling bay with 3-sided canopy signs & roadside totem pylon.
 */
export function createNitolPetrolStation(
  mats: SceneMaterials,
  textures: ProceduralTextures,
): THREE.Group {
  const group = new THREE.Group();

  // Flush concrete forecourt pad (top at y = 0.16 to meet highway asphalt cleanly)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(30, 0.16, 36), mats.sidewalk);
  pad.position.set(0, 0.08, 0);
  pad.receiveShadow = true;
  group.add(pad);

  // Asphalt drive-through refueling apron running smoothly across the pump lanes
  const pumpDriveApron = new THREE.Mesh(new THREE.PlaneGeometry(18, 35.5), mats.asphaltService);
  pumpDriveApron.rotation.x = -Math.PI / 2;
  pumpDriveApron.position.set(-5.8, 0.17, 0);
  group.add(pumpDriveApron);

  // Rear Nitol Mart & Hero Quick-Service Kiosk
  const mart = new THREE.Mesh(new THREE.BoxGeometry(10, 5.4, 24), mats.heroCharcoal);
  mart.position.set(9, 2.8, 0);
  mart.castShadow = true;
  group.add(mart);

  const martGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 20), mats.glassShowroom);
  martGlass.position.set(4.1, 2.0, 0);
  group.add(martGlass);

  // Main illuminated canopy over 4 dispensing lanes
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 26), mats.heroCharcoal);
  canopy.position.set(-4, 6.2, 0);
  canopy.castShadow = true;
  group.add(canopy);

  const redTrim = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.65, 26.4), mats.heroRed);
  redTrim.position.set(-4, 6.65, 0);
  group.add(redTrim);

  const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.22, 26.5), mats.lampGlow);
  ledStrip.position.set(-4, 5.65, 0);
  group.add(ledStrip);

  // Support columns & 4 dual fuel/CNG islands
  for (const cz of [-9.5, 0, 9.5]) {
    for (const cx of [-8.5, 0.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 5.8, 10), mats.steelBridge);
      col.position.set(cx, 3.05, cz);
      group.add(col);
    }
  }

  for (let i = 0; i < 4; i++) {
    const iz = -10.5 + i * 7;
    const island = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.42, 2.2), mats.concreteBarrier);
    island.position.set(-4, 0.38, iz);
    group.add(island);

    for (const px of [-5.2, -2.8]) {
      const pump = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 2.1, 0.9),
        i % 2 === 0 ? mats.heroRed : mats.hospitalTeal,
      );
      pump.position.set(px, 1.65, iz);
      group.add(pump);

      const meter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.96), mats.lampGlow);
      meter.position.set(px, 2.0, iz);
      group.add(meter);
    }
  }

  // Tall Backlit Price & Brand Totem Pylon facing roadside
  const totemPole = new THREE.Mesh(new THREE.BoxGeometry(1.1, 10.5, 2.4), mats.heroCharcoal);
  totemPole.position.set(-12.5, 5.25, -14.5);
  group.add(totemPole);

  const totemBoard = makeSignMesh(textures.signTextures.nitolPetrol, 15, 3.6, 0.85);
  totemBoard.position.set(-11.8, 6.4, 0);
  totemBoard.rotation.y = -Math.PI / 2;
  group.add(totemBoard);

  const canopySignSouth = makeSignMesh(textures.signTextures.nitolPetrol, 14, 2.6, 0.85);
  canopySignSouth.position.set(-4, 6.4, 13.3);
  group.add(canopySignSouth);

  const canopySignNorth = makeSignMesh(textures.signTextures.nitolPetrol, 14, 2.6, 0.85);
  canopySignNorth.position.set(-4, 6.4, -13.3);
  canopySignNorth.rotation.y = Math.PI;
  group.add(canopySignNorth);

  mergeGroupMeshesByMaterial(group);
  return group;
}

/**
 * 15C. Nitol Motors & NITA Truck/Bus Chassis Assembly & Engine Import Complex
 */
export function createNitaChassisPlant(
  mats: SceneMaterials,
  textures: ProceduralTextures,
): THREE.Group {
  const group = new THREE.Group();

  const yard = new THREE.Mesh(new THREE.BoxGeometry(66, 0.35, 58), mats.sidewalk);
  yard.position.set(0, 0.175, 0);
  yard.receiveShadow = true;
  group.add(yard);

  // Main Assembly Factory Bay
  const hall = new THREE.Mesh(new THREE.BoxGeometry(28, 13.5, 48), mats.towerStone);
  hall.position.set(16, 7.0, 0);
  hall.castShadow = true;
  group.add(hall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 1.8, 50), mats.hospitalTeal);
  roof.position.set(16, 14.3, 0);
  group.add(roof);

  const bayDoors = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.8, 36), mats.heroCharcoal);
  bayDoors.position.set(2.0, 3.7, 0);
  group.add(bayDoors);

  // 4 Static 3D Bus & Truck Ladder Chassis Frames on Assembly Cradles (Outdoor Yard Display)
  for (let i = 0; i < 4; i++) {
    const cz = -16 + i * 10.5;
    const chassisGroup = new THREE.Group();
    chassisGroup.position.set(-12, 0.35, cz);

    // Parallel C-channel steel frame rails
    for (const rz of [-1.05, 1.05]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.42, 0.22), mats.steelDark);
      rail.position.set(0, 1.15, rz);
      chassisGroup.add(rail);
    }
    // Crossmembers + Front Engine Block Crate + Steering Column
    for (const cx of [-4.2, -1.4, 1.4, 4.2]) {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 2.3), mats.steelBridge);
      cross.position.set(cx, 1.12, 0);
      chassisGroup.add(cross);
    }
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.15, 1.3), mats.heroRed);
    engineBlock.position.set(-3.6, 1.55, 0);
    chassisGroup.add(engineBlock);

    const steering = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), mats.steelDark);
    steering.position.set(-4.6, 2.1, 0.55);
    steering.rotation.z = 0.45;
    chassisGroup.add(steering);

    // 4 heavy-duty truck/bus tires on axles
    for (const ax of [-3.6, 3.2]) {
      for (const wz of [-1.35, 1.35]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 12), mats.heroCharcoal);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(ax, 0.62, wz);
        chassisGroup.add(tire);
      }
    }
    group.add(chassisGroup);
  }

  // Imported Tata Engine Crates (India Import Staging)
  for (let c = 0; c < 6; c++) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.4, 3.4),
      c % 2 === 0 ? mats.towerCream : mats.hospitalTeal,
    );
    crate.position.set(-25 + (c % 2) * 4.5, 1.55, -18 + Math.floor(c / 2) * 8);
    group.add(crate);
  }

  const sign = makeSignMesh(textures.signTextures.nitaAssembly, 26, 4.2, 0.82);
  sign.position.set(1.35, 5.4, 0);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  return group;
}

/**
 * 15D. Hazrat Shahjalal International Airport (HSIA) — Terminals, ATC Tower, Runway & Parked Planes
 */
function createParkedAircraft(mats: SceneMaterials): THREE.Group {
  const plane = new THREE.Group();

  // Fuselage + Nose + Tail Cone
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 28, 14), mats.hospitalWhite);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.position.set(0, 3.4, 0);
  fuselage.castShadow = true;
  plane.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.8, 14), mats.hospitalWhite);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(16.4, 3.3, 0);
  plane.add(nose);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 1.9), mats.heroCharcoal);
  cockpit.position.set(14.8, 4.35, 0);
  plane.add(cockpit);

  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(2.1, 5.2, 14), mats.heroRed);
  tailCone.rotation.z = -Math.PI / 2;
  tailCone.position.set(-16.6, 3.6, 0);
  plane.add(tailCone);

  // Bangladesh National Airline Red/Green Tail Fin + Horizontal Stabilizers
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(4.8, 6.2, 0.42), mats.hospitalTeal);
  tailFin.position.set(-14.2, 7.2, 0);
  tailFin.rotation.z = 0.25;
  plane.add(tailFin);

  const tailStripe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.48), mats.heroRed);
  tailStripe.position.set(-14.2, 7.6, 0);
  tailStripe.rotation.z = 0.25;
  plane.add(tailStripe);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.28, 11.5), mats.hospitalWhite);
  hStab.position.set(-15.0, 4.1, 0);
  plane.add(hStab);

  // Swept Main Wings & Twin Underwing Turbofans
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 16.5), mats.towerCream);
    wing.position.set(-1.2, 3.0, side * 9.2);
    wing.rotation.y = side * -0.28;
    wing.castShadow = true;
    plane.add(wing);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 3.4, 12), mats.steelBridge);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(0.4, 2.1, side * 6.4);
    plane.add(engine);

    const winglet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.24), mats.heroRed);
    winglet.position.set(-3.4, 3.9, side * 16.8);
    plane.add(winglet);
  }

  // Landing Gear Struts
  for (const [gx, gz] of [[11.5, 0], [-2.0, -3.2], [-2.0, 3.2]]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8), mats.steelDark);
    strut.position.set(gx, 1.3, gz);
    plane.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.45, 10), mats.heroCharcoal);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(gx, 0.48, gz);
    plane.add(wheel);
  }

  return plane;
}

export function createAirportComplex(
  mats: SceneMaterials,
  textures: ProceduralTextures,
): THREE.Group {
  const group = new THREE.Group();

  // Airport Ground Apron & Turf Perimeter (220m wide x 440m long)
  const turf = new THREE.Mesh(new THREE.BoxGeometry(224, 0.12, 444), mats.grassGreen);
  turf.position.set(0, 0.06, 0);
  turf.receiveShadow = true;
  group.add(turf);

  // Main Runway 14/32 along the west side of the airport zone
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(36, 420), mats.runwayMat);
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(-74, 0.16, 0);
  runway.receiveShadow = true;
  group.add(runway);

  // Parallel Taxiway + Concrete Terminal Apron
  const taxiway = new THREE.Mesh(new THREE.PlaneGeometry(14, 360), mats.asphaltDark);
  taxiway.rotation.x = -Math.PI / 2;
  taxiway.position.set(-34, 0.15, 0);
  group.add(taxiway);

  const apron = new THREE.Mesh(new THREE.PlaneGeometry(76, 280), mats.sidewalk);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(16, 0.15, 0);
  apron.receiveShadow = true;
  group.add(apron);

  // Glowing Runway Edge Beacons (Instanced)
  const beaconGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
  const beaconPositions: Array<[number, number]> = [];
  for (let z = -195; z <= 195; z += 30) {
    for (const rx of [-92, -56]) {
      beaconPositions.push([rx, z]);
    }
  }
  const beaconsInst = new THREE.InstancedMesh(beaconGeo, mats.lampGlow, beaconPositions.length);
  const beaconDummy = new THREE.Object3D();
  beaconPositions.forEach(([rx, bz], idx) => {
    beaconDummy.position.set(rx, 0.32, bz);
    beaconDummy.updateMatrix();
    beaconsInst.setMatrixAt(idx, beaconDummy.matrix);
  });
  beaconsInst.instanceMatrix.needsUpdate = true;
  beaconsInst.computeBoundingSphere();
  group.add(beaconsInst);

  // Modern Terminal 3 Curved Wave Roof + Terminal 1/2 Concourse facing Airport Road (East)
  const concourse = new THREE.Mesh(new THREE.BoxGeometry(34, 15, 240), mats.glassTowerCool);
  concourse.position.set(74, 7.8, 0);
  concourse.castShadow = true;
  group.add(concourse);

  const canopyWave = new THREE.Mesh(
    new THREE.CylinderGeometry(24, 24, 252, 18, 1, false, 0, Math.PI),
    mats.hospitalWhite,
  );
  canopyWave.rotation.z = Math.PI / 2;
  canopyWave.rotation.y = Math.PI / 2;
  canopyWave.position.set(74, 15.6, 0);
  canopyWave.scale.set(0.28, 1, 1);
  canopyWave.castShadow = true;
  group.add(canopyWave);

  // Airport Road-facing Departure Canopy & Drop-Off Portico
  const dropCanopy = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 160), mats.heroCharcoal);
  dropCanopy.position.set(96, 7.5, 0);
  group.add(dropCanopy);

  // Air Traffic Control (ATC) Tower
  const atcShaft = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.8, 42, 8), mats.concreteViaduct);
  atcShaft.position.set(62, 21, -150);
  atcShaft.castShadow = true;
  group.add(atcShaft);

  const atcCab = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 5.2, 6.2, 8), mats.glassShowroom);
  atcCab.position.set(62, 44.5, -150);
  group.add(atcCab);

  const atcDome = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 10), mats.hospitalWhite);
  atcDome.position.set(62, 50.2, -150);
  group.add(atcDome);

  const atcBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), mats.taillightGlow);
  atcBeacon.position.set(62, 53.5, -150);
  group.add(atcBeacon);

  // 4 Telescopic Jetbridges + 4 Parked Commercial Aircraft at the Apron Gates
  for (let i = 0; i < 4; i++) {
    const gz = -84 + i * 56;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(22, 2.8, 3.4), mats.hospitalWhite);
    bridge.position.set(46, 5.2, gz + 3.5);
    group.add(bridge);

    const aircraft = createParkedAircraft(mats);
    aircraft.position.set(22, 0.16, gz);
    aircraft.rotation.y = Math.PI; // Facing west toward taxiway/runway
    group.add(aircraft);
  }

  const termSign = makeSignMesh(textures.signTextures.airportHSIA, 40, 5.6, 0.85);
  termSign.position.set(104.2, 7.5, 0);
  termSign.rotation.y = Math.PI / 2;
  group.add(termSign);

  return group;
}

/**
 * 15E. Dhaka School & College Campus Complex
 */
export function createSchoolCollegeCampus(
  mats: SceneMaterials,
  signTex: THREE.CanvasTexture,
): THREE.Group {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.BoxGeometry(38, 0.25, 44), mats.grassGreen);
  ground.position.y = 0.125;
  group.add(ground);

  const mainHall = new THREE.Mesh(new THREE.BoxGeometry(18, 13, 34), mats.brickFacade);
  mainHall.position.set(6, 6.7, 0);
  mainHall.castShadow = true;
  group.add(mainHall);

  const wingN = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 10), mats.creamFacade);
  wingN.position.set(-2, 5.2, -14);
  group.add(wingN);

  const gate = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.8, 12), mats.hospitalTeal);
  gate.position.set(-16, 2.9, 0);
  group.add(gate);

  const sign = makeSignMesh(signTex, 11.6, 2.4, 0.72);
  sign.position.set(-17.7, 4.4, 0);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  return group;
}

/**
 * 15F. Roadside Advance Indicator Board (Petrol Ahead / School / College / Hospital / Safety Motto)
 */
export function createRoadIndicatorSign(
  tex: THREE.CanvasTexture,
  mats: SceneMaterials,
  width = 11.5,
  height = 3.2,
  poleH = 5.4,
): THREE.Group {
  const group = new THREE.Group();
  for (const px of [-width * 0.34, width * 0.34]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, poleH, 8), mats.steelBridge);
    pole.position.set(px, poleH / 2, 0);
    group.add(pole);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.2), mats.heroCharcoal);
  board.position.set(0, poleH + height / 2 - 0.2, 0);
  group.add(board);

  const f1 = makeSignMesh(tex, width, height, 0.72);
  f1.position.set(0, poleH + height / 2 - 0.2, 0.14);
  group.add(f1);

  const f2 = makeSignMesh(tex, width, height, 0.72);
  f2.position.set(0, poleH + height / 2 - 0.2, -0.14);
  f2.rotation.y = Math.PI;
  group.add(f2);

  mergeGroupMeshesByMaterial(group);
  return group;
}

/**
 * 15G. Iconic Hatirjheel Red Steel Bowstring Arch Bridge
 */
export function createHatirjheelArchBridge(
  mats: SceneMaterials,
  spanLength = 305,
  deckWidth = 22,
  roadMat: THREE.Material = mats.asphaltService,
): THREE.Group {
  const group = new THREE.Group();
  const rampLen = 46;
  const flatLen = spanLength - rampLen * 2;
  const deckY = 3.8;

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(deckWidth, 1.35, flatLen),
    mats.concreteViaduct,
  );
  deck.position.set(0, deckY - 0.65, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const laneW = (deckWidth - 4.0) * 0.5;
  for (const dirSign of [-1, 1]) {
    const roadSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(laneW, flatLen),
      roadMat,
    );
    roadSurface.rotation.x = -Math.PI / 2;
    roadSurface.position.set(dirSign * (laneW * 0.5 + 0.9), deckY + 0.05, 0);
    group.add(roadSurface);
  }
  const flatMedian = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.32, flatLen),
    mats.concreteBarrier,
  );
  flatMedian.position.set(0, deckY + 0.16, 0);
  group.add(flatMedian);

  // Smooth sloped north & south approach ramps down to y = 0.14
  const rampAngle = Math.atan2(deckY - 0.14, rampLen);
  const rampHyp = Math.hypot(rampLen, deckY - 0.14);
  for (const side of [-1, 1]) {
    const zCenter = side * (flatLen * 0.5 + rampLen * 0.5);
    const rampDeck = new THREE.Mesh(
      new THREE.BoxGeometry(deckWidth, 1.25, rampHyp),
      mats.concreteViaduct,
    );
    rampDeck.position.set(0, (deckY + 0.14) * 0.5 - 0.6, zCenter);
    rampDeck.rotation.x = side * rampAngle;
    group.add(rampDeck);

    for (const dirSign of [-1, 1]) {
      const rampAsphalt = new THREE.Mesh(
        new THREE.PlaneGeometry(laneW, rampHyp),
        roadMat,
      );
      rampAsphalt.position.set(
        dirSign * (laneW * 0.5 + 0.9),
        (deckY + 0.14) * 0.5 + 0.05,
        zCenter,
      );
      rampAsphalt.rotation.x = -Math.PI / 2 + side * rampAngle;
      group.add(rampAsphalt);
    }
    const rampMedian = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.32, rampHyp),
      mats.concreteBarrier,
    );
    rampMedian.position.set(0, (deckY + 0.14) * 0.5 + 0.16, zCenter);
    rampMedian.rotation.x = side * rampAngle;
    group.add(rampMedian);
  }

  // Twin graceful red steel bowstring arches spanning the central 180m section
  const archSpan = 180;
  const segments = 16;
  for (const sideX of [-deckWidth * 0.44, deckWidth * 0.44]) {
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const z0 = (t0 - 0.5) * archSpan;
      const z1 = (t1 - 0.5) * archSpan;
      const y0 = deckY + Math.sin(t0 * Math.PI) * 19;
      const y1 = deckY + Math.sin(t1 * Math.PI) * 19;

      const midZ = (z0 + z1) / 2;
      const midY = (y0 + y1) / 2;
      const segLen = Math.hypot(z1 - z0, y1 - y0);

      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, segLen + 0.35), mats.heroRed);
      rib.position.set(sideX, midY, midZ);
      rib.rotation.x = Math.atan2(y1 - y0, z1 - z0);
      group.add(rib);

      if (i > 0 && i % 2 === 0) {
        const hanger = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, y0 - deckY, 6),
          mats.steelBridge,
        );
        hanger.position.set(sideX, (y0 + deckY) / 2, z0);
        group.add(hanger);
      }
    }
  }

  return group;
}

/**
 * 16. Multi-Archetype Instanced Dense Dhaka Urban Skyline Builder
 * Renders 500+ varied urban buildings across 5 distinct Dhaka architectural styles
 * (Glass Curtain Towers, Brick Apartments, Cream High-Rises, Roadside Plazas, Industrial Warehouses)
 */
export type BuildingStyle = 'commercial' | 'brick' | 'cream' | 'glass' | 'plaza' | 'industrial';

export interface BuildingBlockSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rotY?: number;
  style?: BuildingStyle;
}

export function createDenseUrbanBuildingsInstanced(
  specs: BuildingBlockSpec[],
  mats: SceneMaterials,
): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const disposables: THREE.BufferGeometry[] = [];

  const buckets: Record<BuildingStyle, BuildingBlockSpec[]> = {
    commercial: [],
    brick: [],
    cream: [],
    glass: [],
    plaza: [],
    industrial: [],
  };

  specs.forEach((b, idx) => {
    const inferred: BuildingStyle =
      b.style ??
      (['commercial', 'brick', 'cream', 'glass', 'plaza'][idx % 5] as BuildingStyle);
    buckets[inferred].push(b);
  });

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const podiumGeo = new THREE.BoxGeometry(1.06, 1, 1.06);
  const tankGeo = new THREE.CylinderGeometry(0.14, 0.14, 1, 8);
  const canopyGeo = new THREE.BoxGeometry(1.14, 1, 1.14);
  const crownGeo = new THREE.BoxGeometry(0.72, 1, 0.72);
  const gableGeo = new THREE.CylinderGeometry(0.55, 0.75, 1, 4);
  disposables.push(boxGeo, podiumGeo, tankGeo, canopyGeo, crownGeo, gableGeo);

  // 1. Commercial & Cream Concrete/Residential Towers
  for (const [key, mat] of [
    ['commercial', mats.commercialFacade],
    ['cream', mats.creamFacade],
  ] as const) {
    const list = buckets[key];
    if (!list.length) continue;
    const pInst = new THREE.InstancedMesh(podiumGeo, mats.heroCharcoal, list.length);
    const sInst = new THREE.InstancedMesh(boxGeo, mat, list.length);
    const tInst = new THREE.InstancedMesh(tankGeo, mats.towerCream, list.length);
    sInst.castShadow = true;
    sInst.receiveShadow = true;

    list.forEach((b, i) => {
      const podiumH = Math.min(4.8, b.h * 0.22);
      const shaftH = Math.max(4, b.h - podiumH);
      const rot = b.rotY ?? 0;

      dummy.position.set(b.x, podiumH / 2, b.z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(b.w, podiumH, b.d);
      dummy.updateMatrix();
      pInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, podiumH + shaftH / 2, b.z);
      dummy.scale.set(b.w, shaftH, b.d);
      dummy.updateMatrix();
      sInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x + b.w * 0.2, b.h + 1.1, b.z - b.d * 0.15);
      dummy.scale.set(Math.min(b.w, b.d), 2.2, Math.min(b.w, b.d));
      dummy.updateMatrix();
      tInst.setMatrixAt(i, dummy.matrix);

      col.setHSL(0.08 + ((i * 7) % 10) * 0.03, 0.12, 0.8 + ((i * 11) % 6) * 0.03);
      sInst.setColorAt(i, col);
    });
    pInst.instanceMatrix.needsUpdate = true;
    sInst.instanceMatrix.needsUpdate = true;
    tInst.instanceMatrix.needsUpdate = true;
    if (sInst.instanceColor) sInst.instanceColor.needsUpdate = true;
    pInst.computeBoundingSphere();
    sInst.computeBoundingSphere();
    tInst.computeBoundingSphere();
    group.add(pInst, sInst, tInst);
  }

  // 2. Terracotta Brick Dhaka Apartments (with projecting concrete slab trim & warm balconies)
  if (buckets.brick.length) {
    const list = buckets.brick;
    const pInst = new THREE.InstancedMesh(podiumGeo, mats.towerCream, list.length);
    const sInst = new THREE.InstancedMesh(boxGeo, mats.brickFacade, list.length);
    const rInst = new THREE.InstancedMesh(canopyGeo, mats.concreteBarrier, list.length);
    sInst.castShadow = true;
    sInst.receiveShadow = true;

    list.forEach((b, i) => {
      const podiumH = Math.min(4.2, b.h * 0.2);
      const shaftH = Math.max(4, b.h - podiumH);
      const rot = b.rotY ?? 0;

      dummy.position.set(b.x, podiumH / 2, b.z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(b.w, podiumH, b.d);
      dummy.updateMatrix();
      pInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, podiumH + shaftH / 2, b.z);
      dummy.scale.set(b.w, shaftH, b.d);
      dummy.updateMatrix();
      sInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, b.h + 0.4, b.z);
      dummy.scale.set(b.w, 0.8, b.d);
      dummy.updateMatrix();
      rInst.setMatrixAt(i, dummy.matrix);
    });
    pInst.instanceMatrix.needsUpdate = true;
    sInst.instanceMatrix.needsUpdate = true;
    rInst.instanceMatrix.needsUpdate = true;
    pInst.computeBoundingSphere();
    sInst.computeBoundingSphere();
    rInst.computeBoundingSphere();
    group.add(pInst, sInst, rInst);
  }

  // 3. Sleek Glass Corporate High-Rises (stepped upper crown + cool reflective curtain wall)
  if (buckets.glass.length) {
    const list = buckets.glass;
    const pInst = new THREE.InstancedMesh(podiumGeo, mats.heroCharcoal, list.length);
    const sInst = new THREE.InstancedMesh(boxGeo, mats.glassTowerCool, list.length);
    const cInst = new THREE.InstancedMesh(crownGeo, mats.glassTowerWarm, list.length);
    sInst.castShadow = true;

    list.forEach((b, i) => {
      const podiumH = Math.min(5.2, b.h * 0.18);
      const shaftH = Math.max(8, b.h - podiumH);
      const crownH = 5.5;
      const rot = b.rotY ?? 0;

      dummy.position.set(b.x, podiumH / 2, b.z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(b.w, podiumH, b.d);
      dummy.updateMatrix();
      pInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, podiumH + shaftH / 2, b.z);
      dummy.scale.set(b.w, shaftH, b.d);
      dummy.updateMatrix();
      sInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, b.h + crownH / 2, b.z);
      dummy.scale.set(b.w, crownH, b.d);
      dummy.updateMatrix();
      cInst.setMatrixAt(i, dummy.matrix);
    });
    pInst.instanceMatrix.needsUpdate = true;
    sInst.instanceMatrix.needsUpdate = true;
    cInst.instanceMatrix.needsUpdate = true;
    pInst.computeBoundingSphere();
    sInst.computeBoundingSphere();
    cInst.computeBoundingSphere();
    group.add(pInst, sInst, cInst);
  }

  // 4. Roadside Retail Shopping Plazas & Corner Markets (lit storefront + colorful awnings)
  if (buckets.plaza.length) {
    const list = buckets.plaza;
    const baseInst = new THREE.InstancedMesh(boxGeo, mats.glassShowroom, list.length);
    const upperInst = new THREE.InstancedMesh(boxGeo, mats.towerCream, list.length);
    const awnInst = new THREE.InstancedMesh(canopyGeo, mats.heroRed, list.length);

    list.forEach((b, i) => {
      const shopH = 4.6;
      const upH = Math.max(4.5, Math.min(b.h * 0.55, 14));
      const rot = b.rotY ?? 0;

      dummy.position.set(b.x, shopH / 2, b.z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(b.w, shopH, b.d);
      dummy.updateMatrix();
      baseInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, shopH + upH / 2, b.z);
      dummy.scale.set(b.w * 0.94, upH, b.d * 0.94);
      dummy.updateMatrix();
      upperInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, shopH + 0.4, b.z);
      dummy.scale.set(b.w, 0.9, b.d);
      dummy.updateMatrix();
      awnInst.setMatrixAt(i, dummy.matrix);

      col.setHex([0xdc2626, 0x0284c7, 0x059669, 0xd97706][i % 4]);
      awnInst.setColorAt(i, col);
    });
    baseInst.instanceMatrix.needsUpdate = true;
    upperInst.instanceMatrix.needsUpdate = true;
    awnInst.instanceMatrix.needsUpdate = true;
    if (awnInst.instanceColor) awnInst.instanceColor.needsUpdate = true;
    baseInst.computeBoundingSphere();
    upperInst.computeBoundingSphere();
    awnInst.computeBoundingSphere();
    group.add(baseInst, upperInst, awnInst);
  }

  // 5. Industrial Factories & Warehouses (Tejgaon / Tongi-Gazipur)
  if (buckets.industrial.length) {
    const list = buckets.industrial;
    const hallInst = new THREE.InstancedMesh(boxGeo, mats.towerStone, list.length);
    const roofInst = new THREE.InstancedMesh(gableGeo, mats.hospitalTeal, list.length);

    list.forEach((b, i) => {
      const hallH = Math.min(11, Math.max(7, b.h * 0.45));
      const rot = b.rotY ?? 0;

      dummy.position.set(b.x, hallH / 2, b.z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(b.w * 1.15, hallH, b.d * 1.2);
      dummy.updateMatrix();
      hallInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, hallH + 2.2, b.z);
      dummy.rotation.set(0, rot + Math.PI / 4, 0);
      dummy.scale.set(b.w * 1.18, 4.4, b.d * 1.24);
      dummy.updateMatrix();
      roofInst.setMatrixAt(i, dummy.matrix);
    });
    hallInst.instanceMatrix.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
    hallInst.computeBoundingSphere();
    roofInst.computeBoundingSphere();
    group.add(hallInst, roofInst);
  }

  return {
    group,
    dispose: () => {
      disposables.forEach((g) => g.dispose());
    },
  };
}
