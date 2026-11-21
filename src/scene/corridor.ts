import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LANDMARKS, LandmarkPreset } from './landmarks';
import { SceneMaterials } from './materials';
import {
  buildRoadRibbonGeometry,
  sampleCurvedPathPoints,
  sampleSmoothRampPoints,
  WaypointSpec,
} from './roadBuilder';
import {
  BuildingBlockSpec,
  BuildingStyle,
  createAirportComplex,
  createDenseUrbanBuildingsInstanced,
  createFootOverbridge,
  createHatirjheelArchBridge,
  createHospitalComplex,
  createHotelComplex,
  createMarketCluster,
  createMedicalCollege,
  createMetroStation,
  createModernTower,
  createNeelaMarket,
  createNiloyHeroBranchShowroom,
  createNiloyHeroShowroom,
  createNitaChassisPlant,
  createNitolNiloyBuilding,
  createNitolPetrolStation,
  createOverheadBannerPortal,
  createRestaurantComplex,
  createRoadIndicatorSign,
  createRoadsideBillboard,
  createRoadUnderpass,
  createSangsadBhaban,
  createSchoolCollegeCampus,
  createSignGantry,
  disposeCachedStructureMaterials,
} from './structures';
import { ProceduralTextures } from './textures';

export interface CorridorBuildResult {
  root: THREE.Group;
  hitboxes: THREE.Mesh[];
  waterMaterial: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();

class StaticGeometryBatcher {
  private buckets = new Map<
    string,
    { mat: THREE.Material; castShadow: boolean; receiveShadow: boolean; geos: THREE.BufferGeometry[] }
  >();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, castShadow = false, receiveShadow = false) {
    const key = `${mat.uuid}:${castShadow ? 1 : 0}:${receiveShadow ? 1 : 0}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { mat, castShadow, receiveShadow, geos: [] };
      this.buckets.set(key, bucket);
    }
    bucket.geos.push(geo);
  }

  flush(root: THREE.Group, disposables: THREE.BufferGeometry[]) {
    for (const bucket of this.buckets.values()) {
      if (!bucket.geos.length) continue;
      const merged =
        bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (bucket.geos.length > 1) {
        bucket.geos.forEach((g) => g.dispose());
      }
      if (!merged) continue;
      disposables.push(merged);
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = bucket.receiveShadow;
      root.add(mesh);
    }
    this.buckets.clear();
  }
}

function addRibbonRoad(
  batcher: StaticGeometryBatcher,
  points: THREE.Vector3[],
  width: number,
  roadMat: THREE.Material,
  uvMetersPerTile = 22,
  structural?: { thickness: number; concreteMat: THREE.Material; barrierMat: THREE.Material },
) {
  const topGeo = buildRoadRibbonGeometry(points, width, uvMetersPerTile, 0);
  batcher.add(topGeo, roadMat, false, true);

  if (structural) {
    const deckPts = points.map((p) => new THREE.Vector3(p.x, p.y - 0.04, p.z));
    const deckGeo = buildRoadRibbonGeometry(
      deckPts,
      width + 1.0,
      18,
      structural.thickness,
    );
    batcher.add(deckGeo, structural.concreteMat, true, true);

    for (const side of [-1, 1]) {
      const wallPts: THREE.Vector3[] = [];
      for (let i = 0; i < points.length; i++) {
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(points.length - 1, i + 1)];
        const tx = next.x - prev.x;
        const tz = next.z - prev.z;
        const len = Math.hypot(tx, tz) || 1;
        const rx = -tz / len;
        const rz = tx / len;
        wallPts.push(
          new THREE.Vector3(
            points[i].x + rx * side * (width * 0.5 + 0.25),
            points[i].y + 0.85,
            points[i].z + rz * side * (width * 0.5 + 0.25),
          ),
        );
      }
      const wallGeo = buildRoadRibbonGeometry(wallPts, 0.45, 16, 0.9);
      batcher.add(wallGeo, structural.barrierMat, false, false);
    }
  }
}

function addRibbonSidewalk(
  batcher: StaticGeometryBatcher,
  mats: SceneMaterials,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  width: number,
  height = 0.28,
) {
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const len = Math.hypot(dx, dz);
  if (len < 1) return;
  const curbGeo = new THREE.BoxGeometry(width, height, len);
  curbGeo.rotateY(Math.atan2(dx, dz));
  curbGeo.translate(mid.x, height * 0.5, mid.z);
  batcher.add(curbGeo, mats.concreteBarrier, false, true);

  const topGeo = buildRoadRibbonGeometry(
    [new THREE.Vector3(p1.x, height + 0.01, p1.z), new THREE.Vector3(p2.x, height + 0.01, p2.z)],
    width,
    6,
    0,
  );
  batcher.add(topGeo, mats.sidewalk, false, true);
}

function splitIntervalByGaps(
  start: number,
  end: number,
  gaps: Array<[number, number]>,
): Array<[number, number]> {
  let segments: Array<[number, number]> = [[Math.min(start, end), Math.max(start, end)]];
  for (const [g1, g2] of gaps) {
    const nextSegs: Array<[number, number]> = [];
    for (const [s1, s2] of segments) {
      if (s2 <= g1 || s1 >= g2) {
        nextSegs.push([s1, s2]);
      } else {
        if (s1 < g1) nextSegs.push([s1, g1]);
        if (s2 > g2) nextSegs.push([g2, s2]);
      }
    }
    segments = nextSegs;
  }
  return segments;
}

const Z_CROSS_GAPS: Array<[number, number]> = [
  [-1952, -1908],
  [-1588, -1472],
  [-1442, -1398],
  [-1360, -1320],
  [-1282, -1238],
  [-1200, -1120],
  [-1040, -1000],
  [-882, -838],
  [-680, -640],
  [-482, -438],
  [-365, -215],
  [-22, 22],
  [70, 110],
  [120, 160],
  [272, 344],
  [354, 386],
  [425, 455],
  [500, 540],
  [600, 640],
  [680, 720],
  [770, 810],
  [898, 942],
];

const X_JUNCTION_GAPS: Array<[number, number]> = [
  [-584, -536],
  [-522, -488],
  [-482, -438],
  [-438, -370],
  [-304, -256],
  [-238, -202],
  [-174, -126],
  [-116, -74],
  [-26, 26],
  [48, 76],
  [75, 115],
  [162, 208],
  [245, 285],
  [318, 362],
  [656, 704],
  [1045, 1115],
  [1256, 1304],
  [1440, 1520],
  [1596, 1644],
  [2126, 2174],
];

function addStraightHighwayZ(
  batcher: StaticGeometryBatcher,
  mats: SceneMaterials,
  centerX: number,
  zStart: number,
  zEnd: number,
  laneWidth = 10.5,
  withService = true,
  extraAsphaltGaps: Array<[number, number]> = [],
) {
  const zNorth = Math.min(zStart, zEnd);
  const zSouth = Math.max(zStart, zEnd);

  const asphaltSegs =
    extraAsphaltGaps.length > 0
      ? splitIntervalByGaps(zNorth, zSouth, extraAsphaltGaps)
      : [[zNorth, zSouth] as [number, number]];

  const mainRoadMat = laneWidth >= 9.5 ? mats.asphaltMain : mats.asphaltService;
  for (const [a1, a2] of asphaltSegs) {
    if (a2 - a1 < 2) continue;
    for (const dirSign of [-1, 1]) {
      const laneX = centerX + dirSign * (laneWidth * 0.5 + 1.4);
      const pA = new THREE.Vector3(laneX, 0.14, dirSign === 1 ? a2 : a1);
      const pB = new THREE.Vector3(laneX, 0.14, dirSign === 1 ? a1 : a2);
      addRibbonRoad(batcher, [pA, pB], laneWidth, mainRoadMat, 22);

      if (withService) {
        const svcX = centerX + dirSign * (laneWidth + 4.8);
        const sA = new THREE.Vector3(svcX, 0.12, dirSign === 1 ? a2 : a1);
        const sB = new THREE.Vector3(svcX, 0.12, dirSign === 1 ? a1 : a2);
        addRibbonRoad(batcher, [sA, sB], 5.4, mats.asphaltService, 18);
      }
    }
  }

  const allGaps = [...Z_CROSS_GAPS, ...extraAsphaltGaps];
  const segments = splitIntervalByGaps(zNorth, zSouth, allGaps);
  const swOffset = withService ? laneWidth + 9.6 : laneWidth + 3.8;

  for (const [s1, s2] of segments) {
    const segLen = s2 - s1;
    if (segLen < 6) continue;
    const segCenter = (s1 + s2) / 2;

    for (const dirSign of [-1, 1]) {
      addRibbonSidewalk(
        batcher,
        mats,
        new THREE.Vector3(centerX + dirSign * swOffset, 0, s1),
        new THREE.Vector3(centerX + dirSign * swOffset, 0, s2),
        3.6,
        0.28,
      );
    }

    const medianGeo = new THREE.BoxGeometry(2.4, 0.34, segLen);
    medianGeo.translate(centerX, 0.17, segCenter);
    batcher.add(medianGeo, mats.concreteBarrier, false, false);
  }
}

function addStraightHighwayX(
  batcher: StaticGeometryBatcher,
  mats: SceneMaterials,
  centerZ: number,
  xStart: number,
  xEnd: number,
  laneWidth = 8.5,
  roadMat?: THREE.Material,
) {
  const minX = Math.min(xStart, xEnd);
  const maxX = Math.max(xStart, xEnd);

  for (const dirSign of [-1, 1]) {
    const laneZ = centerZ + dirSign * (laneWidth * 0.5 + 1.4);
    const pA = new THREE.Vector3(dirSign === 1 ? minX : maxX, 0.13, laneZ);
    const pB = new THREE.Vector3(dirSign === 1 ? maxX : minX, 0.13, laneZ);
    addRibbonRoad(batcher, [pA, pB], laneWidth, roadMat ?? mats.asphaltService, 20);
  }

  const segments = splitIntervalByGaps(minX, maxX, X_JUNCTION_GAPS);

  for (const [s1, s2] of segments) {
    const segLen = s2 - s1;
    if (segLen < 4) continue;
    const segCenter = (s1 + s2) / 2;

    for (const dirSign of [-1, 1]) {
      addRibbonSidewalk(
        batcher,
        mats,
        new THREE.Vector3(s1, 0, centerZ + dirSign * (laneWidth + 3.4)),
        new THREE.Vector3(s2, 0, centerZ + dirSign * (laneWidth + 3.4)),
        3.2,
        0.28,
      );
    }

    const medianGeo = new THREE.BoxGeometry(segLen, 0.34, 2.0);
    medianGeo.translate(segCenter, 0.17, centerZ);
    batcher.add(medianGeo, mats.concreteBarrier, false, false);
  }
}

function addCurvedCornerLoop(
  batcher: StaticGeometryBatcher,
  mats: SceneMaterials,
  waypoints: WaypointSpec[],
  laneWidth = 10.0,
  roadMat?: THREE.Material,
) {
  const centerPts = sampleCurvedPathPoints(waypoints, 22);
  const mat = roadMat ?? (laneWidth >= 9.5 ? mats.asphaltMain : mats.asphaltService);
  for (const side of [-1, 1]) {
    const offsetDist = side * (laneWidth * 0.5 + 1.4);
    const lanePts = centerPts.map((p, idx) => {
      const next = centerPts[Math.min(idx + 1, centerPts.length - 1)];
      const prev = centerPts[Math.max(idx - 1, 0)];
      const tx = next.x - prev.x;
      const tz = next.z - prev.z;
      const len = Math.hypot(tx, tz) || 1;
      return new THREE.Vector3(
        p.x + (-tz / len) * offsetDist,
        p.y,
        p.z + (tx / len) * offsetDist,
      );
    });
    addRibbonRoad(
      batcher,
      side === -1 ? lanePts.reverse() : lanePts,
      laneWidth,
      mat,
      22,
    );
  }
}

export function buildDhakaCorridor(
  mats: SceneMaterials,
  textures: ProceduralTextures,
): CorridorBuildResult {
  const root = new THREE.Group();
  const hitboxes: THREE.Mesh[] = [];
  const disposableGeos: THREE.BufferGeometry[] = [];
  const batcher = new StaticGeometryBatcher();
  const skylineSpecs: BuildingBlockSpec[] = [];
  const lampPositions: Array<{ x: number; y: number; z: number; rotY: number }> = [];
  const treeCoords: Array<[number, number]> = [];
  const occupiedBoxes: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];

  const reserveBox = (cx: number, cz: number, w: number, d: number) => {
    occupiedBoxes.push({
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
    });
  };

  // =========================================================================
  // 1. CONTINUOUS URBAN GROUND BASE & GREEN PARKS
  // =========================================================================
  const groundGeo = new THREE.PlaneGeometry(7600, 7600);
  disposableGeos.push(groundGeo);
  const ground = new THREE.Mesh(groundGeo, mats.groundUrban);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(780, 0, -520);
  ground.receiveShadow = true;
  root.add(ground);

  const greenPatches: Array<[number, number, number, number]> = [
    [-145, -560, 125, 190],    // Cantonment golf/park strip
    [-410, -1260, 175, 220],   // Diabari Lakefront park
    [-355, 145, 155, 210],     // Sher-e-Bangla Nagar / Sangsad greens
    [-65, 975, 220, 140],      // Ramna Park / DU greenbelt
    [255, 466, 260, 290],      // Hatirjheel Lakeside Greens
    [-355, 610, 170, 150],     // Dhanmondi Lake green park
  ];
  for (const [gx, gz, gw, gd] of greenPatches) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), mats.grassGreen);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(gx, 0.02, gz);
    root.add(patch);
  }

  // =========================================================================
  // 2. MAJOR NORTH-SOUTH CONNECTED ARTERIALS (CONSISTENT 3-LANE & 2-LANE TIERS)
  // =========================================================================
  // Main N3 Spine (3-Lane Main + 2-Lane Service): South Return <-> Tejgaon <-> Mohakhali <-> Airport <-> Uttara <-> Gazipur
  addStraightHighwayZ(batcher, mats, 0, 920, -1930, 11.0, true);

  // 2-Lane Inner Central Ave (X = -95)
  addStraightHighwayZ(batcher, mats, -95, -1930, -1420, 7.6, false);
  addStraightHighwayZ(batcher, mats, -95, -860, 920, 7.6, false);

  // 2-Lane Uttara East & Hatirjheel Arch Bridge Spine (X = +185)
  addStraightHighwayZ(batcher, mats, 185, -1420, 320, 7.6, false, [[-936, -784]]);
  addStraightHighwayZ(batcher, mats, 185, 620, 920, 7.6, false);
  // Hatirjheel Red Bowstring Arch Bridge seamlessly matching 2-lane X=+185 across Hatirjheel Lake (Z = +320..+620)
  const hatirjheelBridge = createHatirjheelArchBridge(mats, 300, 19.6);
  hatirjheelBridge.position.set(185, 0, 470);
  root.add(hatirjheelBridge);

  // 2-Lane Uttara Sector Internal Grid Streets cleanly joining 300ft North Service Rd
  addStraightHighwayZ(batcher, mats, 95, -1420, -880.6, 7.6, false);
  addStraightHighwayZ(batcher, mats, 265, -1420, -880.6, 7.6, false);
  addStraightHighwayZ(batcher, mats, -420, -1420, -860, 7.6, false);

  // 3-Lane Gulshan Ave & Hatirjheel East (X = +340, -1420 to +920, dips under 300ft underpass at -860)
  addStraightHighwayZ(batcher, mats, 340, -1420, 920, 10.0, false, [[-936, -784]]);

  // 2-Lane Purbachal Sector Arterials (X = +680 & +1280, -1930 to +920, dipping under 300ft underpasses!)
  addStraightHighwayZ(batcher, mats, 680, -1930, 920, 7.6, false, [[-936, -784]]);
  addStraightHighwayZ(batcher, mats, 1280, -1930, 920, 7.6, false, [[-936, -784]]);

  // 2-Lane Dhanmondi Arterials: Satmasjid Road (X = -505) & Green Road (X = -220)
  addStraightHighwayZ(batcher, mats, -505, 320, 920, 7.6, false);
  addStraightHighwayZ(batcher, mats, -220, 320, 920, 7.6, false);

  // 3-Lane Mirpur Road (X = -460) & 2-Lane 60 Feet Road (X = -390)
  addStraightHighwayZ(batcher, mats, -460, -1260, 920, 10.0, false);
  addStraightHighwayZ(batcher, mats, -390, -460, 90, 7.6, false);

  // 3-Lane Outer Circular Ring Beltways (Uniform 10.5m width matching curved loops & Gazipur/South rings!)
  addStraightHighwayZ(batcher, mats, -560, -1840, 830, 10.5, false); // West Beribadh
  addStraightHighwayZ(batcher, mats, 1620, -1840, 920, 10.5, false, [[-936, -784]]); // Kanchan Bypass
  addStraightHighwayZ(batcher, mats, 2150, -770, 830, 10.5, false);  // Narayanganj Return

  // =========================================================================
  // 3. ALL CONNECTED EAST-WEST CORRIDORS & CURVED OUTER LOOPS (MATCHED LANE TIERS)
  // =========================================================================
  // Gazipur Ring (-1930), Uttara/Purbachal North (-1420), South Return (+920)
  addStraightHighwayX(batcher, mats, -1930, -470, 1530, 10.5, mats.asphaltMain);
  addStraightHighwayX(batcher, mats, -1420, -560, 1620, 10.0, mats.asphaltMain);
  addStraightHighwayX(batcher, mats, 920, -470, 2060, 10.5, mats.asphaltMain);

  // NW, SW, NE, Far-NE & Far-SE Curved Outer Ring Corners (All matched 10.5m 3-lane!)
  addCurvedCornerLoop(batcher, mats, [
    { x: -470, y: 0.14, z: -1930 },
    { x: -535, y: 0.14, z: -1910 },
    { x: -560, y: 0.14, z: -1840 },
  ], 10.5);
  addCurvedCornerLoop(batcher, mats, [
    { x: -560, y: 0.14, z: 830 },
    { x: -535, y: 0.14, z: 895 },
    { x: -470, y: 0.14, z: 920 },
  ], 10.5);
  addCurvedCornerLoop(batcher, mats, [
    { x: 1530, y: 0.14, z: -1930 },
    { x: 1595, y: 0.14, z: -1910 },
    { x: 1620, y: 0.14, z: -1840 },
  ], 10.5);
  addCurvedCornerLoop(batcher, mats, [
    { x: 2060, y: 0.15, z: -860 },
    { x: 2125, y: 0.15, z: -835 },
    { x: 2150, y: 0.15, z: -770 },
  ], 10.5);
  addCurvedCornerLoop(batcher, mats, [
    { x: 2150, y: 0.14, z: 830 },
    { x: 2125, y: 0.14, z: 895 },
    { x: 2060, y: 0.14, z: 920 },
  ], 10.5);

  // Full City East-West Cross Highways (Matching 10.0–10.5m 3-lane arterials & 7.6m 2-lane sector streets!)
  const crossConnectors: Array<{ z: number; x1: number; x2: number; laneW: number }> = [
    // Uttara Sector 1-14 East & West 2-Lane Grids
    { z: -1340, x1: 0, x2: 340, laneW: 7.6 },
    { z: -1260, x1: -560, x2: -280, laneW: 7.6 },
    { z: -1260, x1: 0, x2: 340, laneW: 7.6 },
    { z: -1180, x1: 0, x2: 340, laneW: 7.6 },
    { z: -1140, x1: -560, x2: -280, laneW: 7.6 },
    { z: -1140, x1: 340, x2: 1620, laneW: 7.6 },
    { z: -1020, x1: -560, x2: -280, laneW: 7.6 },
    { z: -1020, x1: 0, x2: 340, laneW: 7.6 },
    // West Kuril / Pallabi 3-Lane Link -> N3
    { z: -860, x1: -560, x2: 16, laneW: 10.0 },
    // Cantonment - Mirpur 11 - Gulshan North + Purbachal South-Central 2-Lane Link
    { z: -660, x1: -560, x2: 1620, laneW: 7.6 },
    // Mirpur 10 - Banani - Gulshan 2 - Purbachal South - Kanchan - Narayanganj 3-Lane Arterial (splits cleanly for Banani Underpass at X=0)
    { z: -460, x1: -560, x2: -56, laneW: 10.0 },
    { z: -460, x1: 56, x2: 2150, laneW: 10.0 },
    // Banani Commercial & Kazipara 2-Lane Links
    { z: -345, x1: -280, x2: 340, laneW: 7.6 },
    { z: -260, x1: -560, x2: 340, laneW: 7.6 },
    { z: -235, x1: -280, x2: 2150, laneW: 7.6 },
    // Agargaon - Mohakhali - Gulshan 1 - Purbachal - Narayanganj 3-Lane Arterial
    { z: 0, x1: -560, x2: 2150, laneW: 10.0 },
    // Shyamoli - 60ft South - Agargaon - Mohakhali Medical - Gulshan 2-Lane
    { z: 90, x1: -560, x2: 340, laneW: 7.6 },
    // Sangsad East & West 2-Lane Links
    { z: 140, x1: -560, x2: -460, laneW: 7.6 },
    { z: 140, x1: -280, x2: 340, laneW: 7.6 },
    // Tejgaon Showroom - Metro Rd Curve (-235) - Hatirjheel 2-Lane Link
    { z: 292, x1: -235, x2: 340, laneW: 7.6 },
    // Straight Continuous Manik Mia Ave -> Bijoy Sarani -> Tejgaon -> Hatirjheel North -> Narayanganj 3-Lane Arterial (exact Z = 320!)
    { z: 320, x1: -560, x2: 2150, laneW: 10.5 },
    // Dhanmondi 15 / 9A -> Green Rd -> Farmgate -> Tejgaon 2-Lane
    { z: 440, x1: -560, x2: 0, laneW: 7.6 },
    { z: 520, x1: -560, x2: 62, laneW: 7.6 },
    // Hatirjheel South -> Badda -> Narayanganj Return 3-Lane Arterial
    { z: 620, x1: 0, x2: 2150, laneW: 10.0 },
    // Dhanmondi Rd 2 -> Labaid -> Karwan Bazar -> Hatirjheel South 3-Lane Arterial
    { z: 700, x1: -560, x2: 340, laneW: 10.0 },
    // Shahbagh / DU -> Satmasjid / Beribadh -> Hatirjheel 2-Lane
    { z: 790, x1: -560, x2: 340, laneW: 7.6 },
  ];
  for (const cc of crossConnectors) {
    addStraightHighwayX(
      batcher,
      mats,
      cc.z,
      cc.x1,
      cc.x2,
      cc.laneW,
      cc.laneW >= 9.5 ? mats.asphaltMain : mats.asphaltService,
    );
  }

  // Tejgaon Showroom Back-Loop Road (Divided 2-lane matching Z=292, Z=520 & X=-220!)
  addStraightHighwayX(batcher, mats, 370, -220, 62, 7.6, mats.asphaltService);
  addStraightHighwayZ(batcher, mats, 62, 292, 520, 7.6, false);

  // =========================================================================
  // 4. HAZRAT SHAHJALAL INTERNATIONAL AIRPORT (HSIA) + TERMINAL LOOP + 4 PLANES
  // =========================================================================
  const airportComplex = createAirportComplex(mats, textures);
  airportComplex.position.set(-148, 0, -1120);
  root.add(airportComplex);
  reserveBox(-148, -1120, 240, 460);

  // Curved Airport Terminal Departure Driveway Loop (from Airport Rd X=0 -> Terminal -> back to X=0)
  addCurvedCornerLoop(
    batcher,
    mats,
    [
      { x: 0, y: 0.15, z: -985 },
      { x: -32, y: 0.15, z: -1025 },
      { x: -46, y: 0.15, z: -1120 },
      { x: -32, y: 0.15, z: -1215 },
      { x: 0, y: 0.15, z: -1255 },
    ],
    7.6,
    mats.asphaltService,
  );

  // =========================================================================
  // 5. FLYOVERS, BRIDGES, KURIL INTERCHANGE & GAZIPUR CHOWRASTA LOOPS
  // =========================================================================
  // Mohakhali Flyover (gentle long approach grades, clear of Z=0 cross intersection piers)
  const mohakhaliPts = sampleSmoothRampPoints(
    [
      { x: 0, y: 0.15, z: 195 },
      { x: 0, y: 10.6, z: 45 },
      { x: 0, y: 10.6, z: -45 },
      { x: 0, y: 0.15, z: -195 },
    ],
    6,
  );
  addRibbonRoad(batcher, mohakhaliPts, 13.8, mats.asphaltMain, 22, {
    thickness: 1.3,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });
  for (const pz of [-118, -76, -38, 38, 76, 118]) {
    const py = Math.abs(pz) === 38 ? 9.8 : Math.abs(pz) === 76 ? 7.2 : 4.2;
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, py, 12), mats.concreteViaduct);
    pier.position.set(0, py / 2, pz);
    pier.castShadow = true;
    root.add(pier);
  }

  // Banani Underpass on N3 (aligned cleanly with Z = -460 east-west arterial)
  const bananiUnderpass = createRoadUnderpass(mats, 46, 62, mats.asphaltMain);
  bananiUnderpass.rotation.y = Math.PI / 2;
  bananiUnderpass.position.set(0, 0, -460);
  root.add(bananiUnderpass);

  // Kuril Multi-Loop Interchange (Smooth tangential ramps joining N3 Service & 300ft Service lanes!)
  const kurilLoopSpecs: WaypointSpec[][] = [
    // Southbound N3 -> Eastbound 300ft South Service Road
    [
      { x: -16.3, y: 0.14, z: -725 },
      { x: -12, y: 7.6, z: -795 },
      { x: 14, y: 11.4, z: -838 },
      { x: 75, y: 6.4, z: -839.4 },
      { x: 145, y: 0.14, z: -839.4 },
    ],
    // Westbound 300ft North Service Road -> Northbound N3 East Service Road
    [
      { x: 145, y: 0.14, z: -880.6 },
      { x: 75, y: 6.8, z: -880.6 },
      { x: 18, y: 11.8, z: -892 },
      { x: 16.3, y: 6.4, z: -948 },
      { x: 16.3, y: 0.14, z: -995 },
    ],
    // Northbound N3 East Service Road -> Eastbound 300ft South Service Road
    [
      { x: 16.3, y: 0.14, z: -745 },
      { x: 24, y: 6.8, z: -815 },
      { x: 64, y: 8.6, z: -839.4 },
      { x: 145, y: 0.14, z: -839.4 },
    ],
  ];
  for (const spec of kurilLoopSpecs) {
    addRibbonRoad(
      batcher,
      sampleCurvedPathPoints(spec, 32),
      8.2,
      mats.asphaltService,
      20,
      { thickness: 1.15, concreteMat: mats.concreteViaduct, barrierMat: mats.concreteBarrier },
    );
  }
  // Kuril piers placed strictly on grass medians & outer verges (never inside driving lanes)
  for (const [kx, kz, ky] of [
    [0, -834, 9.8],
    [48, -844.4, 8.2],
    [48, -875.6, 8.4],
    [22.5, -898, 10.4],
  ]) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, ky, 12), mats.concreteViaduct);
    pier.position.set(kx, ky / 2, kz);
    root.add(pier);
  }

  // Turag River & Bridges (Z = -1530)
  const turagRiver = new THREE.Mesh(new THREE.PlaneGeometry(2400, 64), mats.canalWater);
  turagRiver.rotation.x = -Math.PI / 2;
  turagRiver.position.set(450, 0.05, -1530);
  root.add(turagRiver);
  for (const bx of [-560, 0, 680, 1280, 1620]) {
    const bridgeW = bx === 0 ? 34 : 26;
    const bridgePts = sampleSmoothRampPoints(
      [
        { x: bx, y: 0.16, z: -1475 },
        { x: bx, y: 2.8, z: -1510 },
        { x: bx, y: 2.8, z: -1550 },
        { x: bx, y: 0.16, z: -1585 },
      ],
      6,
    );
    addRibbonRoad(batcher, bridgePts, bridgeW, mats.asphaltMain, 22, {
      thickness: 1.4,
      concreteMat: mats.concreteViaduct,
      barrierMat: mats.concreteBarrier,
    });
  }

  // Gazipur Chowrasta Flyover & Ring U-Loops
  const chowrastaPts = sampleSmoothRampPoints(
    [
      { x: 0, y: 0.15, z: -1810 },
      { x: 0, y: 9.8, z: -1910 },
      { x: 0, y: 9.8, z: -1950 },
      { x: 0, y: 0.15, z: -2010 },
    ],
    6,
  );
  addRibbonRoad(batcher, chowrastaPts, 13.0, mats.asphaltMain, 22, {
    thickness: 1.25,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });
  addCurvedCornerLoop(batcher, mats, [
    { x: 0, y: 0.15, z: -2010 },
    { x: 35, y: 0.15, z: -2055 },
    { x: 110, y: 0.15, z: -2040 },
    { x: 155, y: 0.15, z: -1930 },
  ], 9.5);
  addCurvedCornerLoop(batcher, mats, [
    { x: 0, y: 0.15, z: -2010 },
    { x: -35, y: 0.15, z: -2055 },
    { x: -110, y: 0.15, z: -2040 },
    { x: -155, y: 0.15, z: -1930 },
  ], 9.5);

  // Hatirjheel & Dhanmondi Lakes + Sangsad Bhaban + Crescent Lake
  const hatirjheelLake = new THREE.Mesh(new THREE.PlaneGeometry(246, 260), mats.canalWater);
  hatirjheelLake.rotation.x = -Math.PI / 2;
  hatirjheelLake.position.set(190, 0.05, 466);
  root.add(hatirjheelLake);
  reserveBox(190, 466, 276, 286);

  const dhanmondiLake = new THREE.Mesh(new THREE.PlaneGeometry(130, 114), mats.canalWater);
  dhanmondiLake.rotation.x = -Math.PI / 2;
  dhanmondiLake.position.set(-355, 0.05, 610);
  root.add(dhanmondiLake);
  reserveBox(-355, 610, 150, 135);

  const sangsad = createSangsadBhaban(mats, textures.signTextures.sangsadBhaban);
  sangsad.position.set(-355, 0, 205);
  root.add(sangsad);
  reserveBox(-355, 205, 130, 120);

  const crescentLake = new THREE.Mesh(new THREE.PlaneGeometry(140, 44), mats.canalWater);
  crescentLake.rotation.x = -Math.PI / 2;
  crescentLake.position.set(-355, 0.05, 122);
  root.add(crescentLake);
  reserveBox(-355, 122, 160, 62);

  // Bijoy Sarani -> Tejgaon -> Hatirjheel Direct Overpass (Aligned cleanly on Z = 320, passes under Elevated Expy & over N3!)
  const bijoyPts = sampleSmoothRampPoints(
    [
      { x: -235, y: 0.15, z: 320 },
      { x: -115, y: 8.4, z: 320 },
      { x: 10, y: 8.4, z: 320 },
      { x: 125, y: 0.15, z: 320 },
    ],
    8,
  );
  addRibbonRoad(batcher, bijoyPts, 10.5, mats.asphaltMain, 22, {
    thickness: 1.15,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });
  for (const [bx, bHeight] of [
    [-125, 7.2],
    [-52, 8.0],
    [36, 6.4],
  ]) {
    const bPier = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.0, bHeight, 10),
      mats.concreteViaduct,
    );
    bPier.position.set(bx, bHeight * 0.5, 320);
    root.add(bPier);
  }

  // =========================================================================
  // 6. 300 FEET PURBACHAL EXPRESSWAY (Connected Underpasses, Slip Ramps & Canal Bridges)
  // =========================================================================
  const exp300StartX = 12;
  const exp300EndX = 2060;
  const exp300Z = -860;

  const make300ftProfile = (zCoord: number, baseY: number) => {
    const baluRamp = sampleSmoothRampPoints(
      [
        { x: 1020, y: baseY, z: zCoord },
        { x: 1052, y: 2.6, z: zCoord },
        { x: 1108, y: 2.6, z: zCoord },
        { x: 1140, y: baseY, z: zCoord },
      ],
      6,
    );
    const kanchanRamp = sampleSmoothRampPoints(
      [
        { x: 1420, y: baseY, z: zCoord },
        { x: 1452, y: 3.4, z: zCoord },
        { x: 1508, y: 3.4, z: zCoord },
        { x: 1540, y: baseY, z: zCoord },
      ],
      6,
    );
    return [
      new THREE.Vector3(exp300StartX, baseY, zCoord),
      ...baluRamp,
      ...kanchanRamp,
      new THREE.Vector3(exp300EndX, baseY, zCoord),
    ];
  };

  for (const zOff of [-7.5, 7.5]) {
    const pts = make300ftProfile(exp300Z + zOff, 0.16);
    addRibbonRoad(batcher, zOff < 0 ? pts.reverse() : pts, 13.6, mats.asphalt300ft, 24);
  }

  const median300Pts = make300ftProfile(exp300Z, 0.42);
  addRibbonRoad(batcher, median300Pts, 2.0, mats.concreteBarrier, 18);

  const expGroundSpans: Array<[number, number]> = [
    [exp300StartX, 82],
    [108, 158],
    [212, 252],
    [278, 314],
    [366, 654],
    [706, 932],
    [958, 1046],
    [1114, 1254],
    [1306, 1446],
    [1514, 1594],
    [1646, exp300EndX],
  ];

  for (const side of [-1, 1]) {
    const svcPts = make300ftProfile(exp300Z + side * 20.6, 0.14);
    addRibbonRoad(
      batcher,
      side < 0 ? svcPts.reverse() : svcPts,
      7.2,
      mats.asphaltService,
      18,
    );

    for (const [sx1, sx2] of expGroundSpans) {
      const spanLen = sx2 - sx1;
      const spanCenter = (sx1 + sx2) / 2;

      const sepGeo = new THREE.BoxGeometry(spanLen, 0.35, 2.4);
      sepGeo.translate(spanCenter, 0.175, exp300Z + side * 15.6);
      batcher.add(sepGeo, mats.grassGreen, false, false);

      addRibbonSidewalk(
        batcher,
        mats,
        new THREE.Vector3(sx1, 0, exp300Z + side * 26.2),
        new THREE.Vector3(sx2, 0, exp300Z + side * 26.2),
        3.6,
        0.3,
      );

      const bankWallGeo = new THREE.BoxGeometry(spanLen, 0.65, 1.0);
      bankWallGeo.translate(spanCenter, 0.32, exp300Z + side * 28.6);
      batcher.add(bankWallGeo, mats.concreteBarrier, false, false);

      const canal = new THREE.Mesh(new THREE.PlaneGeometry(spanLen, 14.0), mats.canalWater);
      canal.rotation.x = -Math.PI / 2;
      canal.position.set(spanCenter, 0.05, exp300Z + side * 35.8);
      root.add(canal);

      const outerBankGeo = new THREE.BoxGeometry(spanLen, 0.55, 1.4);
      outerBankGeo.translate(spanCenter, 0.27, exp300Z + side * 43.0);
      batcher.add(outerBankGeo, mats.concreteBarrier, false, false);
    }
  }

  // Canal bridges for Uttara Grid streets (X = 95 & X = 265) joining 300ft North Service Road (matched 2-lane divided!)
  for (const utx of [95, 265]) {
    const bridgeDeckGeo = new THREE.BoxGeometry(19, 0.7, 17);
    bridgeDeckGeo.translate(utx, 0.12, exp300Z - 35.8);
    batcher.add(bridgeDeckGeo, mats.concreteViaduct, false, true);

    for (const dirSign of [-1, 1]) {
      const lx = utx + dirSign * 5.2;
      addRibbonRoad(
        batcher,
        [
          new THREE.Vector3(lx, 0.15, dirSign === 1 ? exp300Z - 20.6 : exp300Z - 46),
          new THREE.Vector3(lx, 0.15, dirSign === 1 ? exp300Z - 46 : exp300Z - 20.6),
        ],
        7.6,
        mats.asphaltService,
        18,
      );
    }
    const utMedianGeo = new THREE.BoxGeometry(2.0, 0.34, 25.4);
    utMedianGeo.translate(utx, 0.17, exp300Z - 33.3);
    batcher.add(utMedianGeo, mats.concreteBarrier, false, false);
  }

  // Underpasses + Surface Slip-Road Junctions at X = 185, 340, 680, 1280, 1620
  for (const ux of [185, 340, 680, 1280, 1620]) {
    const underRoadMat = ux === 340 || ux === 1620 ? mats.asphaltMain : mats.asphaltService;
    const underpass = createRoadUnderpass(mats, 54, 98, underRoadMat);
    underpass.position.set(ux, 0, exp300Z);
    root.add(underpass);

    for (const side of [-1, 1]) {
      const canalBridgeGeo = new THREE.BoxGeometry(50, 0.7, 17);
      canalBridgeGeo.translate(ux, 0.12, exp300Z + side * 35.8);
      batcher.add(canalBridgeGeo, mats.concreteViaduct, false, true);

      // Cross-tie tying main N-S lanes cleanly into surface slip-roads before underpass ramp
      addRibbonRoad(
        batcher,
        [
          new THREE.Vector3(ux - 22, 0.14, exp300Z + side * 80),
          new THREE.Vector3(ux + 22, 0.14, exp300Z + side * 80),
        ],
        8.2,
        mats.asphaltService,
        16,
      );
    }

    // Parallel surface slip-roads directly linking N-S avenues into 300ft North & South Service Roads
    for (const sx of [-19, 19]) {
      addRibbonRoad(
        batcher,
        [
          new THREE.Vector3(ux + sx, 0.14, exp300Z - 82),
          new THREE.Vector3(ux + sx, 0.14, exp300Z + 82),
        ],
        6.5,
        mats.asphaltService,
        18,
      );
    }
  }

  // River Bridges for the two Purbachal E-W cross avenues (Z = -1140 & -660) over Balu (1080) & Shitalakshya (1480)
  for (const pz of [-1140, -660]) {
    for (const rx of [1080, 1480]) {
      const bridgePts = sampleSmoothRampPoints(
        [
          { x: rx - 52, y: 0.14, z: pz },
          { x: rx - 24, y: 2.6, z: pz },
          { x: rx + 24, y: 2.6, z: pz },
          { x: rx + 52, y: 0.14, z: pz },
        ],
        6,
      );
      addRibbonRoad(batcher, bridgePts, 19.0, mats.asphaltService, 20, {
        thickness: 1.2,
        concreteMat: mats.concreteViaduct,
        barrierMat: mats.concreteBarrier,
      });
    }
  }

  for (const ox of [540, 1360]) {
    const loopPts = sampleCurvedPathPoints(
      [
        { x: ox - 56, y: 0.16, z: exp300Z + 20.6 },
        { x: ox - 28, y: 6.4, z: exp300Z + 18 },
        { x: ox, y: 8.8, z: exp300Z },
        { x: ox + 28, y: 6.4, z: exp300Z - 18 },
        { x: ox + 56, y: 0.16, z: exp300Z - 20.6 },
      ],
      28,
    );
    addRibbonRoad(batcher, loopPts, 8.2, mats.asphaltService, 18, {
      thickness: 0.95,
      concreteMat: mats.concreteViaduct,
      barrierMat: mats.concreteBarrier,
    });
  }

  for (const fx of [230, 845]) {
    const fob = createFootOverbridge(mats, 52, textures.signTextures.purbachal300);
    fob.rotation.y = Math.PI / 2;
    fob.position.set(fx, 0, exp300Z);
    root.add(fob);
  }

  // Neela Market + Direct Access Bridge over 300ft South Canal + Balu & Shitalakshya Bridges
  const neelaMarket = createNeelaMarket(mats, textures.signTextures.neelaMarket);
  neelaMarket.position.set(945, 0, exp300Z + 70);
  neelaMarket.rotation.y = Math.PI;
  root.add(neelaMarket);
  reserveBox(945, exp300Z + 70, 118, 60);

  const neelaBridgeGeo = new THREE.BoxGeometry(16, 0.7, 17);
  neelaBridgeGeo.translate(945, 0.12, exp300Z + 35.8);
  batcher.add(neelaBridgeGeo, mats.concreteViaduct, false, true);
  addRibbonRoad(
    batcher,
    [new THREE.Vector3(945, 0.15, exp300Z + 20.6), new THREE.Vector3(945, 0.15, exp300Z + 52)],
    12.0,
    mats.asphaltService,
    18,
  );

  const baluRiver = new THREE.Mesh(new THREE.PlaneGeometry(58, 720), mats.canalWater);
  baluRiver.rotation.x = -Math.PI / 2;
  baluRiver.position.set(1080, 0.06, exp300Z);
  root.add(baluRiver);
  reserveBox(1080, exp300Z, 76, 740);

  const baluSubPts = sampleSmoothRampPoints(
    [
      { x: 1020, y: 0.08, z: exp300Z },
      { x: 1052, y: 2.52, z: exp300Z },
      { x: 1108, y: 2.52, z: exp300Z },
      { x: 1140, y: 0.08, z: exp300Z },
    ],
    6,
  );
  addRibbonRoad(batcher, baluSubPts, 50, mats.concreteViaduct, 18, {
    thickness: 1.45,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });

  const shitalakshyaRiver = new THREE.Mesh(new THREE.PlaneGeometry(74, 840), mats.canalWater);
  shitalakshyaRiver.rotation.x = -Math.PI / 2;
  shitalakshyaRiver.position.set(1480, 0.06, -940);
  root.add(shitalakshyaRiver);
  reserveBox(1480, -940, 92, 860);

  const kanchanSubPts = sampleSmoothRampPoints(
    [
      { x: 1420, y: 0.08, z: exp300Z },
      { x: 1452, y: 3.32, z: exp300Z },
      { x: 1508, y: 3.32, z: exp300Z },
      { x: 1540, y: 0.08, z: exp300Z },
    ],
    6,
  );
  addRibbonRoad(batcher, kanchanSubPts, 50, mats.concreteViaduct, 18, {
    thickness: 1.65,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });

  // =========================================================================
  // 7. DHAKA ELEVATED EXPRESSWAY VIADUCT & NON-BLOCKING PARALLEL SLIP RAMPS
  // =========================================================================
  // Continuous main viaduct strictly outside N3 Service Road (X = -32), touching down seamlessly at BOTH ends (Farmgate Z=685 & HSIA Z=-1012)!
  const elevWaypoints: WaypointSpec[] = [
    { x: -16.3, y: 0.14, z: 685 },
    { x: -23.5, y: 0.14, z: 665 },
    { x: -23.5, y: 7.4, z: 585 },
    { x: -25.0, y: 13.5, z: 520 },
    { x: -32, y: 15.8, z: 455 },
    { x: -32, y: 16.4, z: 320 },
    { x: -32, y: 16.4, z: 0 },
    { x: -31, y: 16.0, z: -340 },
    { x: -29, y: 16.2, z: -790 },
    { x: -24.5, y: 14.4, z: -860 },
    { x: -23.5, y: 6.8, z: -945 },
    { x: -23.5, y: 0.14, z: -995 },
    { x: -16.3, y: 0.14, z: -1012 },
  ];
  const elevPts = sampleCurvedPathPoints(elevWaypoints, 96);
  const elevCurve = new THREE.CatmullRomCurve3(elevPts);
  addRibbonRoad(batcher, elevPts, 13.8, mats.asphaltMain, 22, {
    thickness: 1.5,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });

  // Dedicated mid-corridor parallel slip ramps along X = -23.5 -> -16.3 (never blocking cross-streets or N3 Service Road!)
  const elevRamps: WaypointSpec[][] = [
    // Tejgaon Mid-Corridor Ramp (clears Z=90 & Z=140 overhead, touches down cleanly before Z=292)
    [
      { x: -32, y: 16.2, z: 25 },
      { x: -24.5, y: 12.8, z: 90 },
      { x: -23.5, y: 9.6, z: 140 },
      { x: -23.5, y: 0.14, z: 258 },
      { x: -16.3, y: 0.14, z: 276 },
    ],
    // Banani / Cantonment Ramp (clears Z=-460 high at 14.4m, touches down cleanly before Z=-660)
    [
      { x: -30.5, y: 16.0, z: -430 },
      { x: -24.5, y: 14.4, z: -460 },
      { x: -23.5, y: 6.8, z: -545 },
      { x: -23.5, y: 0.14, z: -618 },
      { x: -16.3, y: 0.14, z: -638 },
    ],
  ];
  for (const rSpec of elevRamps) {
    addRibbonRoad(batcher, sampleCurvedPathPoints(rSpec, 28), 7.2, mats.asphaltService, 18, {
      thickness: 0.95,
      concreteMat: mats.concreteViaduct,
      barrierMat: mats.concreteBarrier,
    });
  }

  const pierCount = 44;
  const pierColGeo = new THREE.CylinderGeometry(1.15, 1.35, 14.5, 12);
  const pierCapGeo = new THREE.BoxGeometry(11.0, 1.4, 2.5);
  disposableGeos.push(pierColGeo, pierCapGeo);
  const pierCols = new THREE.InstancedMesh(pierColGeo, mats.concreteViaduct, pierCount);
  const pierCaps = new THREE.InstancedMesh(pierCapGeo, mats.concreteViaduct, pierCount);

  for (let i = 0; i < pierCount; i++) {
    const t = i / (pierCount - 1);
    const p = elevCurve.getPointAt(t);
    const inCrossGap = Z_CROSS_GAPS.some(([g1, g2]) => p.z >= g1 - 2 && p.z <= g2 + 2);
    if (p.y < 3.6 || inCrossGap) {
      _dummy.scale.set(0.001, 0.001, 0.001);
      _dummy.updateMatrix();
      pierCols.setMatrixAt(i, _dummy.matrix);
      pierCaps.setMatrixAt(i, _dummy.matrix);
      continue;
    }
    const h = Math.max(1.5, p.y - 1.2);
    _dummy.position.set(p.x, h / 2, p.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1, h / 14.5, 1);
    _dummy.updateMatrix();
    pierCols.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(p.x, p.y - 1.6, p.z);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    pierCaps.setMatrixAt(i, _dummy.matrix);
  }
  pierCols.instanceMatrix.needsUpdate = true;
  pierCaps.instanceMatrix.needsUpdate = true;
  pierCols.computeBoundingSphere();
  pierCaps.computeBoundingSphere();
  root.add(pierCols, pierCaps);

  // =========================================================================
  // 8. WEST METRO CORRIDOR (MRT-6 VIADUCT, 11 STATIONS & CATENARY FRAMES)
  // =========================================================================
  addStraightHighwayZ(batcher, mats, -280, -1420, 200, 10.0, false);
  addStraightHighwayZ(batcher, mats, -150, 450, 920, 10.0, false);

  const metroCurveCenters = sampleCurvedPathPoints(
    [
      { x: -280, y: 0.14, z: 195 },
      { x: -255, y: 0.14, z: 265 },
      { x: -200, y: 0.14, z: 335 },
      { x: -162, y: 0.14, z: 400 },
      { x: -150, y: 0.14, z: 460 },
    ],
    24,
  );
  for (const side of [-1, 1]) {
    const lanePts = metroCurveCenters.map((p, idx) => {
      const next = metroCurveCenters[Math.min(idx + 1, metroCurveCenters.length - 1)];
      const prev = metroCurveCenters[Math.max(idx - 1, 0)];
      const tx = next.x - prev.x;
      const tz = next.z - prev.z;
      const len = Math.hypot(tx, tz) || 1;
      return new THREE.Vector3(p.x + (-tz / len) * side * 6.4, 0.14, p.z + (tx / len) * side * 6.4);
    });
    addRibbonRoad(batcher, side === -1 ? lanePts.reverse() : lanePts, 10.0, mats.asphaltMain, 22);
  }

  const diabariLake = new THREE.Mesh(new THREE.PlaneGeometry(140, 210), mats.canalWater);
  diabariLake.rotation.x = -Math.PI / 2;
  diabariLake.position.set(-405, 0.05, -1260);
  root.add(diabariLake);
  reserveBox(-405, -1260, 155, 225);

  const mrt6Pts: THREE.Vector3[] = [];
  for (let z = -1285; z <= 175; z += 25) mrt6Pts.push(new THREE.Vector3(-280, 13.8, z));
  for (const p of metroCurveCenters) mrt6Pts.push(new THREE.Vector3(p.x, 13.8, p.z));
  for (let z = 480; z <= 915; z += 25) mrt6Pts.push(new THREE.Vector3(-150, 13.8, z));

  addRibbonRoad(batcher, mrt6Pts, 9.8, mats.metroTrack, 16, {
    thickness: 1.65,
    concreteMat: mats.concreteViaduct,
    barrierMat: mats.concreteBarrier,
  });

  const bijoyAnchor = metroCurveCenters[12];
  const bijoyPrev = metroCurveCenters[11];
  const bijoyNext = metroCurveCenters[13];
  const bijoyRotY = Math.atan2(bijoyNext.x - bijoyPrev.x, bijoyNext.z - bijoyPrev.z);

  const cumMetroLen: number[] = [0];
  for (let i = 1; i < mrt6Pts.length; i++) {
    cumMetroLen.push(cumMetroLen[i - 1] + mrt6Pts[i].distanceTo(mrt6Pts[i - 1]));
  }
  const totalMetroLen = cumMetroLen[cumMetroLen.length - 1] || 1;
  const sampleMrtAt = (u: number) => {
    const target = THREE.MathUtils.clamp(u, 0, 1) * totalMetroLen;
    let idx = 0;
    while (idx < cumMetroLen.length - 2 && cumMetroLen[idx + 1] < target) idx++;
    const segLen = cumMetroLen[idx + 1] - cumMetroLen[idx] || 1;
    const alpha = (target - cumMetroLen[idx]) / segLen;
    const pos = new THREE.Vector3().lerpVectors(mrt6Pts[idx], mrt6Pts[idx + 1], alpha);
    const tang = new THREE.Vector3().subVectors(mrt6Pts[idx + 1], mrt6Pts[idx]).normalize();
    return { pos, tang };
  };

  const metroPierCount = 80;
  const mPierGeo = new THREE.CylinderGeometry(1.1, 1.35, 12.6, 12);
  const mCapGeo = new THREE.BoxGeometry(8.0, 1.2, 2.2);
  const catenaryBarGeo = new THREE.BoxGeometry(10.6, 0.24, 0.24);
  const catenaryPostGeo = new THREE.BoxGeometry(0.24, 4.7, 0.24);
  disposableGeos.push(mPierGeo, mCapGeo, catenaryBarGeo, catenaryPostGeo);

  const mPiers = new THREE.InstancedMesh(mPierGeo, mats.concreteViaduct, metroPierCount);
  const mCaps = new THREE.InstancedMesh(mCapGeo, mats.concreteViaduct, metroPierCount);
  const mCatBar = new THREE.InstancedMesh(catenaryBarGeo, mats.steelBridge, metroPierCount);
  const mCatPostL = new THREE.InstancedMesh(catenaryPostGeo, mats.steelBridge, metroPierCount);
  const mCatPostR = new THREE.InstancedMesh(catenaryPostGeo, mats.steelBridge, metroPierCount);

  const mrtCrossZs: Array<[number, number]> = [
    [-1280, -1240],
    [-1160, -1120],
    [-1040, -1000],
    [-882, -838],
    [-680, -640],
    [-482, -438],
    [-365, -215],
    [-22, 22],
    [70, 110],
    [120, 160],
    [275, 390],
    [425, 455],
    [500, 540],
    [680, 720],
    [770, 810],
    [898, 942],
  ];

  for (let i = 0; i < metroPierCount; i++) {
    const t = i / (metroPierCount - 1);
    const { pos: p, tang } = sampleMrtAt(t);
    const yaw = Math.atan2(tang.x, tang.z);
    const rx = -tang.z;
    const rz = tang.x;

    // Never place ground Metro piers inside E-W cross-street intersections!
    const inCrossStreet = mrtCrossZs.some(([z1, z2]) => p.z >= z1 && p.z <= z2);
    if (inCrossStreet) {
      _dummy.position.set(p.x, -50, p.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(0.001, 0.001, 0.001);
      _dummy.updateMatrix();
      mPiers.setMatrixAt(i, _dummy.matrix);
      mCaps.setMatrixAt(i, _dummy.matrix);
    } else {
      _dummy.position.set(p.x, 6.3, p.z);
      _dummy.rotation.set(0, yaw, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      mPiers.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(p.x, 12.6, p.z);
      _dummy.updateMatrix();
      mCaps.setMatrixAt(i, _dummy.matrix);
    }

    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.position.set(p.x, 18.4, p.z);
    _dummy.updateMatrix();
    mCatBar.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(p.x - rx * 5.05, 16.05, p.z - rz * 5.05);
    _dummy.updateMatrix();
    mCatPostL.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(p.x + rx * 5.05, 16.05, p.z + rz * 5.05);
    _dummy.updateMatrix();
    mCatPostR.setMatrixAt(i, _dummy.matrix);
  }
  mPiers.instanceMatrix.needsUpdate = true;
  mCaps.instanceMatrix.needsUpdate = true;
  mCatBar.instanceMatrix.needsUpdate = true;
  mCatPostL.instanceMatrix.needsUpdate = true;
  mCatPostR.instanceMatrix.needsUpdate = true;
  mPiers.computeBoundingSphere();
  mCaps.computeBoundingSphere();
  mCatBar.computeBoundingSphere();
  mCatPostL.computeBoundingSphere();
  mCatPostR.computeBoundingSphere();
  root.add(mPiers, mCaps, mCatBar, mCatPostL, mCatPostR);

  const stations: Array<{ x: number; z: number; tex: THREE.CanvasTexture; rotY?: number; depot?: boolean }> = [
    { x: -280, z: -1260, tex: textures.signTextures.diabariMetro, depot: true },
    { x: -280, z: -1075, tex: textures.signTextures.uttaraSouthMetro },
    { x: -280, z: -860, tex: textures.signTextures.pallabiMetro },
    { x: -280, z: -660, tex: textures.signTextures.pallabiMetro },
    { x: -280, z: -460, tex: textures.signTextures.mirpur10 },
    { x: -280, z: -175, tex: textures.signTextures.shewraparaMetro },
    { x: -280, z: -60, tex: textures.signTextures.agargaon },
    { x: bijoyAnchor.x, z: bijoyAnchor.z, tex: textures.signTextures.bijoySaraniLink, rotY: bijoyRotY },
    { x: -150, z: 520, tex: textures.signTextures.farmgateMetro },
    { x: -150, z: 700, tex: textures.signTextures.farmgateMetro },
    { x: -150, z: 855, tex: textures.signTextures.farmgateShahbagh },
  ];
  for (const st of stations) {
    const station = createMetroStation(mats, st.tex, Boolean(st.depot));
    station.position.set(st.x, 0, st.z);
    if (st.rotY) station.rotation.y = st.rotY;
    root.add(station);
    reserveBox(st.x, st.z, 36, 92);
    if (st.depot) reserveBox(st.x - 75, st.z - 24, 110, 96);
  }

  // =========================================================================
  // 9. NITOL-NILOY SHOWROOMS, NITA CHASSIS PLANT, PETROL STATIONS, HOSPITALS, SCHOOLS & MARKETS
  // =========================================================================
  interface RoadsideFacilityPlacement {
    x: number;
    z: number;
    axis: 'z' | 'x';
    roadCoord: number;
    roadEdgeOffset: number;
    crosses300ftCanal?: boolean;
  }

  const autoIndicators: Array<{ x: number; z: number; rotY?: number; tex: THREE.CanvasTexture }> = [];
  const facilityDriveways: Array<{
    axis: 'z' | 'x';
    roadCoord: number;
    sideSign: number;
    min: number;
    max: number;
  }> = [];

  const snapOutsideCrossGap = (val: number, gaps: Array<[number, number]>, pad = 12): number => {
    for (const [g1, g2] of gaps) {
      if (val >= g1 - pad && val <= g2 + pad) {
        return Math.abs(val - g1) < Math.abs(val - g2) ? g1 - pad : g2 + pad;
      }
    }
    return val;
  };

  const connectFacilityRoadAndSigns = (
    spot: RoadsideFacilityPlacement,
    kind: 'petrol' | 'showroom',
    addAdvanceSigns = true,
  ): number => {
    const sideSign =
      spot.axis === 'z'
        ? spot.x >= spot.roadCoord
          ? 1
          : -1
        : spot.z >= spot.roadCoord
          ? 1
          : -1;
    facilityDriveways.push({
      axis: spot.axis,
      roadCoord: spot.roadCoord,
      sideSign,
      min: (spot.axis === 'z' ? spot.z : spot.x) - 24,
      max: (spot.axis === 'z' ? spot.z : spot.x) + 24,
    });
    const rotY =
      spot.axis === 'z'
        ? sideSign === 1
          ? 0
          : Math.PI
        : sideSign === 1
          ? -Math.PI / 2
          : Math.PI / 2;

    if (spot.axis === 'z') {
      const roadJoinX = spot.roadCoord + sideSign * spot.roadEdgeOffset;
      const apronEdgeX = spot.x - sideSign * 13.0;
      const bayMidX = (roadJoinX + apronEdgeX) * 0.5;

      // Central pull-off bay + flared entry/exit lanes from the highway/service road into the facility
      addRibbonRoad(
        batcher,
        [
          new THREE.Vector3(roadJoinX, 0.14, spot.z),
          new THREE.Vector3(apronEdgeX, 0.15, spot.z),
        ],
        24.0,
        mats.asphaltService,
        18,
      );
      for (const zArm of [-14, 14]) {
        addRibbonRoad(
          batcher,
          [
            new THREE.Vector3(roadJoinX, 0.14, spot.z + zArm * 1.25),
            new THREE.Vector3(bayMidX, 0.145, spot.z + zArm * 0.9),
            new THREE.Vector3(apronEdgeX, 0.15, spot.z + zArm * 0.55),
          ],
          8.5,
          mats.asphaltService,
          18,
        );
      }
      reserveBox(bayMidX, spot.z, Math.abs(apronEdgeX - roadJoinX) + 8, 42);

      if (addAdvanceSigns) {
        const signX = spot.roadCoord + sideSign * (spot.roadEdgeOffset + 3.2);
        const entryZ = snapOutsideCrossGap(spot.z - sideSign * 26, Z_CROSS_GAPS, 8);
        const aheadZ = snapOutsideCrossGap(spot.z - sideSign * 105, Z_CROSS_GAPS, 10);
        if (kind === 'petrol') {
          autoIndicators.push({
            x: signX,
            z: entryZ,
            rotY: 0,
            tex: textures.signTextures.indicatorPetrolEntry,
          });
          autoIndicators.push({
            x: signX,
            z: aheadZ,
            rotY: 0,
            tex: textures.signTextures.indicatorPetrol,
          });
        } else {
          autoIndicators.push({
            x: signX,
            z: aheadZ,
            rotY: 0,
            tex: textures.signTextures.indicatorHeroShowroom,
          });
        }
      }
    } else {
      if (spot.crosses300ftCanal) {
        const svcZ = spot.roadCoord + sideSign * spot.roadEdgeOffset;
        const canalCenterZ = spot.roadCoord + sideSign * 35.8;
        const apronEdgeZ = spot.z - sideSign * 13.0;

        const bridgeDeckGeo = new THREE.BoxGeometry(26, 0.7, 17.5);
        bridgeDeckGeo.translate(spot.x, 0.12, canalCenterZ);
        batcher.add(bridgeDeckGeo, mats.concreteViaduct, false, true);

        addRibbonRoad(
          batcher,
          [
            new THREE.Vector3(spot.x, 0.15, svcZ),
            new THREE.Vector3(spot.x, 0.15, apronEdgeZ),
          ],
          22.0,
          mats.asphaltService,
          18,
        );
        reserveBox(spot.x, (svcZ + apronEdgeZ) * 0.5, 28, Math.abs(apronEdgeZ - svcZ) + 6);
      } else {
        const roadJoinZ = spot.roadCoord + sideSign * spot.roadEdgeOffset;
        const apronEdgeZ = spot.z - sideSign * 13.0;
        const bayMidZ = (roadJoinZ + apronEdgeZ) * 0.5;

        addRibbonRoad(
          batcher,
          [
            new THREE.Vector3(spot.x, 0.14, roadJoinZ),
            new THREE.Vector3(spot.x, 0.15, apronEdgeZ),
          ],
          24.0,
          mats.asphaltService,
          18,
        );
        for (const xArm of [-14, 14]) {
          addRibbonRoad(
            batcher,
            [
              new THREE.Vector3(spot.x + xArm * 1.25, 0.14, roadJoinZ),
              new THREE.Vector3(spot.x + xArm * 0.9, 0.145, bayMidZ),
              new THREE.Vector3(spot.x + xArm * 0.55, 0.15, apronEdgeZ),
            ],
            8.5,
            mats.asphaltService,
            18,
          );
        }
        reserveBox(spot.x, bayMidZ, 42, Math.abs(apronEdgeZ - roadJoinZ) + 8);
      }

      if (addAdvanceSigns) {
        const signZ =
          spot.roadCoord +
          sideSign * (spot.crosses300ftCanal ? 46.5 : spot.roadEdgeOffset + 3.2);
        const entryX = snapOutsideCrossGap(spot.x - sideSign * 26, X_JUNCTION_GAPS, 8);
        const aheadX = snapOutsideCrossGap(spot.x - sideSign * 105, X_JUNCTION_GAPS, 10);
        if (kind === 'petrol') {
          autoIndicators.push({
            x: entryX,
            z: signZ,
            rotY: Math.PI / 2,
            tex: textures.signTextures.indicatorPetrolEntry,
          });
          autoIndicators.push({
            x: aheadX,
            z: signZ,
            rotY: Math.PI / 2,
            tex: textures.signTextures.indicatorPetrol,
          });
        } else {
          autoIndicators.push({
            x: aheadX,
            z: signZ,
            rotY: Math.PI / 2,
            tex: textures.signTextures.indicatorHeroShowroom,
          });
        }
      }
    }

    return rotY;
  };

  // Tejgaon Flagship Niloy Hero Showroom + Direct Driveway & Indicator
  const niloyShowroom = createNiloyHeroShowroom(mats, textures);
  niloyShowroom.position.set(42, 0, 331);
  root.add(niloyShowroom);
  reserveBox(42, 331, 44, 60);
  connectFacilityRoadAndSigns(
    { x: 42, z: 331, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    'showroom',
    true,
  );

  // 12 Regional Niloy Hero Motorcycle Showrooms (Both sides of major highways, periodically spaced)
  const heroBranchSpots: RoadsideFacilityPlacement[] = [
    { x: -58, z: 405, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: 46, z: -765, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -58, z: -405, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -56, z: -1615, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -234, z: -760, axis: 'z', roadCoord: -280, roadEdgeOffset: 11.2 },
    { x: -328, z: -960, axis: 'z', roadCoord: -280, roadEdgeOffset: 11.2 },
    { x: -506, z: -565, axis: 'z', roadCoord: -460, roadEdgeOffset: 11.2 },
    { x: 386, z: -120, axis: 'z', roadCoord: 340, roadEdgeOffset: 11.2 },
    { x: 294, z: -560, axis: 'z', roadCoord: 340, roadEdgeOffset: 11.2 },
    { x: 580, z: -794, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 1180, z: -926, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 860, z: 868, axis: 'x', roadCoord: 920, roadEdgeOffset: 11.5 },
  ];
  for (const hs of heroBranchSpots) {
    const rotY = connectFacilityRoadAndSigns(hs, 'showroom', true);
    const branch = createNiloyHeroBranchShowroom(mats, textures);
    branch.position.set(hs.x, 0, hs.z);
    branch.rotation.y = rotY;
    root.add(branch);
    reserveBox(hs.x, hs.z, 40, 44);
  }

  const nitolCompanies: Array<{
    x: number;
    z: number;
    tex: THREE.CanvasTexture;
    w: number;
    d: number;
    h: number;
    accent: number;
  }> = [
    { x: 42, z: 415, tex: textures.signTextures.nitolMotors, w: 24, d: 24, h: 30, accent: 0x2563eb },
    { x: 96, z: 340, tex: textures.signTextures.nitolElectronics, w: 22, d: 22, h: 24, accent: 0xdc2626 },
    { x: 48, z: -68, tex: textures.signTextures.nitolNiloyTower, w: 24, d: 24, h: 48, accent: 0xf59e0b },
    { x: 46, z: -280, tex: textures.signTextures.nitolCement, w: 22, d: 22, h: 42, accent: 0x10b981 },
    { x: 96, z: -280, tex: textures.signTextures.nitolInsurance, w: 22, d: 22, h: 40, accent: 0x38bdf8 },
    { x: 48, z: -1060, tex: textures.signTextures.centralProperties, w: 24, d: 22, h: 42, accent: 0xeab308 },
    { x: 138, z: -1300, tex: textures.signTextures.nitolNiloyTower, w: 26, d: 24, h: 46, accent: 0xdc2626 },
    { x: -224, z: -90, tex: textures.signTextures.nitsNreach, w: 24, d: 22, h: 38, accent: 0x8b5cf6 },
    { x: -338, z: -405, tex: textures.signTextures.nitolElectronics, w: 22, d: 22, h: 26, accent: 0xdc2626 },
    { x: 292, z: -280, tex: textures.signTextures.nitolElectronics, w: 24, d: 22, h: 32, accent: 0x2563eb },
    { x: 52, z: -1795, tex: textures.signTextures.nitolIndustrial, w: 26, d: 24, h: 26, accent: 0xf59e0b },
    { x: 635, z: -780, tex: textures.signTextures.nitolCement, w: 24, d: 24, h: 34, accent: 0x10b981 },
    { x: -418, z: 375, tex: textures.signTextures.nitolElectronics, w: 22, d: 22, h: 28, accent: 0x2563eb },
  ];
  for (const nc of nitolCompanies) {
    const b = createNitolNiloyBuilding(mats, nc.tex, nc.w, nc.d, nc.h, nc.accent);
    b.position.set(nc.x, 0, nc.z);
    root.add(b);
    reserveBox(nc.x, nc.z, nc.w + 8, nc.d + 8);
  }

  // Nitol Motors & NITA Truck/Bus Chassis Assembly & Engine Import Yard (Tongi-Gazipur & Tejgaon)
  const nitaPlantTongi = createNitaChassisPlant(mats, textures);
  nitaPlantTongi.position.set(66, 0, -1715);
  root.add(nitaPlantTongi);
  reserveBox(66, -1715, 74, 66);

  const nitaPlantTejgaon = createNitaChassisPlant(mats, textures);
  nitaPlantTejgaon.position.set(130, 0, 215);
  root.add(nitaPlantTejgaon);
  reserveBox(130, 215, 74, 66);

  // 45 Nitol-Niloy Gas Ltd (Petrol & CNG Stations) on BOTH sides of every major corridor at regular intervals!
  const petrolSpots: RoadsideFacilityPlacement[] = [
    // N3 Main Spine (East & West sides)
    { x: 46, z: 742, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: 46, z: 195, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: 46, z: -155, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: 46, z: -542, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: 46, z: -945, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: 46, z: -1645, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -58, z: 570, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -58, z: 195, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -58, z: -175, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -58, z: -740, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -48, z: -1380, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },
    { x: -56, z: -1785, axis: 'z', roadCoord: 0, roadEdgeOffset: 16.3 },

    // 300ft Purbachal Expressway (Both North & South sides with Canal Bridges!)
    { x: 460, z: -798, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 770, z: -798, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 1380, z: -798, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 1840, z: -798, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 460, z: -922, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 770, z: -922, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 1380, z: -922, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },
    { x: 1840, z: -922, axis: 'x', roadCoord: -860, roadEdgeOffset: 20.6, crosses300ftCanal: true },

    // Rokeya Sarani / West Metro Corridor (East & West sides)
    { x: -234, z: -565, axis: 'z', roadCoord: -280, roadEdgeOffset: 11.2 },
    { x: -234, z: -165, axis: 'z', roadCoord: -280, roadEdgeOffset: 11.2 },
    { x: -326, z: -565, axis: 'z', roadCoord: -280, roadEdgeOffset: 11.2 },
    { x: -326, z: -740, axis: 'z', roadCoord: -280, roadEdgeOffset: 11.2 },

    // Mirpur Road (East & West sides)
    { x: -414, z: -740, axis: 'z', roadCoord: -460, roadEdgeOffset: 11.2 },
    { x: -506, z: -740, axis: 'z', roadCoord: -460, roadEdgeOffset: 11.2 },
    { x: -506, z: -165, axis: 'z', roadCoord: -460, roadEdgeOffset: 11.2 },

    // Gulshan Avenue (East & West sides)
    { x: 386, z: -395, axis: 'z', roadCoord: 340, roadEdgeOffset: 11.2 },
    { x: 294, z: -395, axis: 'z', roadCoord: 340, roadEdgeOffset: 11.2 },
    { x: 386, z: 225, axis: 'z', roadCoord: 340, roadEdgeOffset: 11.2 },
    { x: 294, z: 225, axis: 'z', roadCoord: 340, roadEdgeOffset: 11.2 },

    // Outer Circular Highways (Gazipur Ring, South Return, Kanchan Bypass, Narayanganj Return)
    { x: 240, z: -1878, axis: 'x', roadCoord: -1930, roadEdgeOffset: 11.5 },
    { x: 240, z: -1982, axis: 'x', roadCoord: -1930, roadEdgeOffset: 11.5 },
    { x: 960, z: -1878, axis: 'x', roadCoord: -1930, roadEdgeOffset: 11.5 },
    { x: 960, z: -1982, axis: 'x', roadCoord: -1930, roadEdgeOffset: 11.5 },
    { x: 580, z: 868, axis: 'x', roadCoord: 920, roadEdgeOffset: 11.5 },
    { x: 580, z: 972, axis: 'x', roadCoord: 920, roadEdgeOffset: 11.5 },
    { x: 1120, z: 868, axis: 'x', roadCoord: 920, roadEdgeOffset: 11.5 },
    { x: 1120, z: 972, axis: 'x', roadCoord: 920, roadEdgeOffset: 11.5 },
    { x: 1666, z: -120, axis: 'z', roadCoord: 1620, roadEdgeOffset: 11.5 },
    { x: 1574, z: -120, axis: 'z', roadCoord: 1620, roadEdgeOffset: 11.5 },
    { x: 1666, z: 450, axis: 'z', roadCoord: 1620, roadEdgeOffset: 11.5 },
    { x: 1574, z: 450, axis: 'z', roadCoord: 1620, roadEdgeOffset: 11.5 },
    { x: 2196, z: 120, axis: 'z', roadCoord: 2150, roadEdgeOffset: 11.5 },
    { x: 2104, z: 120, axis: 'z', roadCoord: 2150, roadEdgeOffset: 11.5 },
  ];
  for (const ps of petrolSpots) {
    const rotY = connectFacilityRoadAndSigns(ps, 'petrol', true);
    const station = createNitolPetrolStation(mats, textures);
    station.position.set(ps.x, 0, ps.z);
    station.rotation.y = rotY;
    root.add(station);
    reserveBox(ps.x, ps.z, 40, 44);
  }

  // Real Dhaka Hospitals (Mohakhali Cancer NICRH, Dhanmondi Labaid/Popular/Medinova, Kurmitola, DMCH, BSMMU, Square, Evercare)
  const hospitalPlacements: Array<{ x: number; z: number; tex: THREE.CanvasTexture; rotY?: number }> = [
    { x: 55, z: -615, tex: textures.signTextures.hospital },                // Kurmitola General
    { x: 392, z: -560, tex: textures.signTextures.hospital },               // Evercare Gulshan
    { x: 122, z: 48, tex: textures.signTextures.mohakhaliCancer },          // Mohakhali Cancer Hospital (NICRH)
    { x: -100, z: 862, tex: textures.signTextures.dmchBsmmu },              // BSMMU Shahbagh
    { x: 48, z: 862, tex: textures.signTextures.dmchBsmmu },                // DMCH
    { x: -100, z: 610, tex: textures.signTextures.squareHospital },         // Square Hospital
    { x: -345, z: 28, tex: textures.signTextures.squareHospital },          // Heart Institute
    { x: -418, z: 760, tex: textures.signTextures.labaidHospital },         // Labaid Specialized Dhanmondi
    { x: -262, z: 480, tex: textures.signTextures.labaidHospital, rotY: Math.PI }, // Labaid Cancer Green Rd
    { x: -534, z: 645, tex: textures.signTextures.popularMedinova, rotY: Math.PI }, // Popular Diagnostic
    { x: -534, z: 472, tex: textures.signTextures.popularMedinova, rotY: Math.PI }, // Medinova Medical
  ];
  for (const hp of hospitalPlacements) {
    const hosp = createHospitalComplex(mats, hp.tex);
    hosp.position.set(hp.x, 0, hp.z);
    if (hp.rotY) hosp.rotation.y = hp.rotY;
    root.add(hosp);
    reserveBox(hp.x, hp.z, 46, 56);
  }

  const afmc = createMedicalCollege(mats, textures.signTextures.afmc);
  afmc.position.set(58, 0, -710);
  root.add(afmc);
  reserveBox(58, -710, 44, 50);

  // Hotels, Markets & School/College Campuses
  const sheraton = createHotelComplex(mats, textures.signTextures.sheraton, false);
  sheraton.position.set(48, 0, -372);
  root.add(sheraton);
  reserveBox(48, -372, 34, 36);

  const radisson = createHotelComplex(mats, textures.signTextures.radisson, true);
  radisson.position.set(-68, 0, -565);
  root.add(radisson);
  reserveBox(-68, -565, 56, 72);

  for (const [mx, mz, rot] of [
    [46, 42, 0],
    [-58, -45, Math.PI],
    [136, -48, 0],     // Mohakhali Terminal & Bazaar hub
    [-56, -1680, Math.PI],
    [-224, -415, 0],
    [-422, -240, 0],
    [-54, 690, 0],
    [-415, 845, 0],
  ]) {
    const mk = createMarketCluster(
      mats,
      mx === 136 ? textures.signTextures.mohakhaliCancer : textures.signTextures.mohakhaliMarket,
    );
    mk.position.set(mx, 0, mz);
    mk.rotation.y = rot;
    root.add(mk);
    reserveBox(mx, mz, 42, 58);
  }

  for (const [sx, sz, rot] of [
    [140, -1060, 0],    // Uttara Sector School/College
    [-490, -1080, Math.PI],
    [-335, -180, 0],    // Mirpur School
    [-345, 760, 0],     // Dhanmondi College
    [520, -780, -Math.PI / 2], // Purbachal Campus
    [-240, -1878, Math.PI / 2], // Gazipur College
  ]) {
    const sc = createSchoolCollegeCampus(mats, textures.signTextures.schoolCampus);
    sc.position.set(sx, 0, sz);
    sc.rotation.y = rot;
    root.add(sc);
    reserveBox(sx, sz, 44, 50);
  }

  // Restaurants & Cafes across Dhaka
  const restaurantSpots: Array<{ x: number; z: number; tex: THREE.CanvasTexture; accent: number; rotY?: number }> = [
    { x: 46, z: 255, tex: textures.signTextures.restaurantBiryani, accent: 0xdc2626 },
    { x: 96, z: -205, tex: textures.signTextures.restaurantCafe, accent: 0xd97706 },
    { x: 295, z: 365, tex: textures.signTextures.restaurantCafe, accent: 0x059669, rotY: Math.PI },
    { x: 295, z: 550, tex: textures.signTextures.restaurantBiryani, accent: 0xdc2626, rotY: Math.PI },
    { x: -348, z: -205, tex: textures.signTextures.restaurantBiryani, accent: 0xd97706 },
    { x: -418, z: 405, tex: textures.signTextures.restaurantCafe, accent: 0x2563eb },
    { x: -200, z: 840, tex: textures.signTextures.restaurantBiryani, accent: 0xdc2626 },
    { x: 640, z: -790, tex: textures.signTextures.restaurantCafe, accent: 0x059669, rotY: -Math.PI / 2 },
    { x: 140, z: -1215, tex: textures.signTextures.restaurantCafe, accent: 0xd97706 },
    { x: -498, z: 555, tex: textures.signTextures.restaurantBiryani, accent: 0xdc2626, rotY: Math.PI },
  ];
  for (const rs of restaurantSpots) {
    const rest = createRestaurantComplex(mats, rs.tex, rs.accent);
    rest.position.set(rs.x, 0, rs.z);
    if (rs.rotY) rest.rotation.y = rs.rotY;
    root.add(rest);
    reserveBox(rs.x, rs.z, 30, 24);
  }

  // =========================================================================
  // 10. HIGHWAY GANTRIES, FULL-SPAN OVERHEAD BANNER PORTALS & ADVANCE INDICATORS
  // =========================================================================
  const placeOnRoot = (obj: THREE.Object3D, x: number, z: number, rotY = 0) => {
    obj.position.set(x, 0, z);
    if (rotY !== 0) obj.rotation.y = rotY;
    root.add(obj);
  };

  // N3 Foot Overbridges & Highway Sign Gantries placed strictly on outer sidewalks (±21.25m, clear of cross-streets, driveways & ramps!)
  placeOnRoot(createFootOverbridge(mats, 42.5, textures.signTextures.niloyHero), 0, 392);
  placeOnRoot(createFootOverbridge(mats, 42.5, textures.signTextures.banani), 0, -385);
  placeOnRoot(createFootOverbridge(mats, 42.5, textures.signTextures.hospital), 0, -700);
  placeOnRoot(createFootOverbridge(mats, 42.5, textures.signTextures.safetyMotto), 0, -1210);

  placeOnRoot(createSignGantry(textures.signTextures.expressway, mats, 42.5), 0, 845);
  placeOnRoot(createSignGantry(textures.signTextures.mohakhaliFlyover, mats, 42.5), 0, -205);
  placeOnRoot(createSignGantry(textures.signTextures.kuril, mats, 42.5), 0, -692);
  placeOnRoot(createSignGantry(textures.signTextures.airportHSIA, mats, 42.5), 0, -1060);
  placeOnRoot(createSignGantry(textures.signTextures.uttaraSector, mats, 42.5), 0, -1310);
  placeOnRoot(createSignGantry(textures.signTextures.tongiGazipur, mats, 42.5), 0, -1455);
  placeOnRoot(createSignGantry(textures.signTextures.gazipurRing, mats, 42.5), 0, -1835);

  placeOnRoot(createSignGantry(textures.signTextures.purbachal300, mats, 52, 9.4), 150, exp300Z, Math.PI / 2);
  placeOnRoot(createSignGantry(textures.signTextures.safetyMotto, mats, 52, 9.4), 400, exp300Z, Math.PI / 2);

  for (const bx of [1180, 1555, 1780]) {
    const tex =
      bx >= 1555 ? textures.signTextures.kanchanNarayanganjLoop : textures.signTextures.narayanganjSign;
    placeOnRoot(createSignGantry(tex, mats, 52, 9.4), bx, exp300Z, Math.PI / 2);

    const bb = createRoadsideBillboard(tex, mats, 18, 4.5, 10);
    bb.position.set(bx === 1555 ? 1656 : bx + 60, 0, exp300Z + 52);
    bb.rotation.y = -Math.PI * 0.35;
    root.add(bb);
  }

  placeOnRoot(createSignGantry(textures.signTextures.hatirjheelGulshan, mats, 32, 9.2), 140, 320, Math.PI / 2);
  placeOnRoot(createSignGantry(textures.signTextures.sangsadBhaban, mats, 32, 9.2), -355, 320, Math.PI / 2);

  placeOnRoot(createSignGantry(textures.signTextures.diabariMetro, mats, 28, 9.2), -280, -1180);
  placeOnRoot(createSignGantry(textures.signTextures.mirpur60ft, mats, 28, 9.2), -280, -530);

  placeOnRoot(createSignGantry(textures.signTextures.bijoySaraniLink, mats, 32, 9.2), -110, 320, Math.PI / 2);
  placeOnRoot(createSignGantry(textures.signTextures.farmgateShahbagh, mats, 28, 9.2), -150, 845);

  // Full-Span Overhead Promotional Banner Portals (Columns outside sidewalks, banners high overhead!)
  const portalPlacements: Array<{ x: number; z: number; span: number; rotY: number }> = [
    { x: 0, z: 870, span: 42.5, rotY: 0 },
    { x: 0, z: -395, span: 42.5, rotY: 0 },
    { x: 0, z: -708, span: 42.5, rotY: 0 },
    { x: 0, z: -1095, span: 42.5, rotY: 0 },
    { x: 0, z: -1680, span: 42.5, rotY: 0 },
    { x: 380, z: exp300Z, span: 54, rotY: Math.PI / 2 },
    { x: 890, z: exp300Z, span: 54, rotY: Math.PI / 2 },
    { x: 1360, z: exp300Z, span: 54, rotY: Math.PI / 2 },
    { x: 1920, z: exp300Z, span: 54, rotY: Math.PI / 2 },
    { x: -280, z: -960, span: 28, rotY: 0 },
    { x: -280, z: -180, span: 28, rotY: 0 },
    { x: -460, z: -805, span: 28, rotY: 0 },
    { x: -460, z: 390, span: 28, rotY: 0 },
    { x: 340, z: -610, span: 28, rotY: 0 },
    { x: 340, z: -120, span: 28, rotY: 0 },
    { x: 420, z: -1930, span: 30, rotY: Math.PI / 2 },
    { x: 840, z: -1930, span: 30, rotY: Math.PI / 2 },
    { x: 640, z: 920, span: 30, rotY: Math.PI / 2 },
    { x: 1200, z: 920, span: 30, rotY: Math.PI / 2 },
  ];
  portalPlacements.forEach((pp, idx) => {
    const mA = mats.poleBannerMats[idx % mats.poleBannerMats.length];
    const mB = mats.poleBannerMats[(idx + 2) % mats.poleBannerMats.length];
    const portal = createOverheadBannerPortal(mats, mA, mB, pp.span, 9.6);
    portal.position.set(pp.x, 0, pp.z);
    portal.rotation.y = pp.rotY;
    root.add(portal);
  });

  // Roadside Advance Indicators ("সামনে পেট্রোল স্টেশন", "সামনে স্কুল", "সামনে কলেজ", "সামনে হাসপাতাল", "একটি দুর্ঘটনা, সারাজীবনের কান্না")
  const indicatorPlacements: Array<{
    x: number;
    z: number;
    rotY?: number;
    tex: THREE.CanvasTexture;
  }> = [
    { x: 26, z: 280, rotY: Math.PI / 2, tex: textures.signTextures.indicatorPetrol },
    { x: 26, z: -135, rotY: Math.PI / 2, tex: textures.signTextures.safetyMotto },
    { x: 26, z: -550, rotY: Math.PI / 2, tex: textures.signTextures.indicatorHospital },
    { x: 26, z: -895, rotY: Math.PI / 2, tex: textures.signTextures.indicatorPetrol },
    { x: 26, z: -1150, rotY: Math.PI / 2, tex: textures.signTextures.indicatorSchool },
    { x: 26, z: -1330, rotY: Math.PI / 2, tex: textures.signTextures.indicatorPetrol },
    { x: 26, z: -1630, rotY: Math.PI / 2, tex: textures.signTextures.safetyMotto },
    { x: 430, z: exp300Z + 29, rotY: 0, tex: textures.signTextures.indicatorCollege },
    { x: 670, z: exp300Z + 29, rotY: 0, tex: textures.signTextures.indicatorPetrol },
    { x: 1320, z: exp300Z + 29, rotY: 0, tex: textures.signTextures.safetyMotto },
    { x: -298, z: -260, rotY: Math.PI / 2, tex: textures.signTextures.indicatorPetrol },
    { x: -298, z: -120, rotY: Math.PI / 2, tex: textures.signTextures.indicatorSchool },
    { x: -480, z: 450, rotY: Math.PI / 2, tex: textures.signTextures.indicatorHospital },
    { x: -480, z: 810, rotY: Math.PI / 2, tex: textures.signTextures.indicatorCollege },
    { x: -120, z: 770, rotY: Math.PI / 2, tex: textures.signTextures.indicatorHospital },
    { x: 356, z: 120, rotY: Math.PI / 2, tex: textures.signTextures.indicatorPetrol },
    { x: 1020, z: 902, rotY: 0, tex: textures.signTextures.indicatorPetrol },
    { x: 380, z: -1912, rotY: 0, tex: textures.signTextures.indicatorPetrol },
    { x: -160, z: -1912, rotY: 0, tex: textures.signTextures.indicatorCollege },
    { x: 900, z: -1912, rotY: 0, tex: textures.signTextures.safetyMotto },
  ];
  for (const ind of [...indicatorPlacements, ...autoIndicators]) {
    const sign = createRoadIndicatorSign(ind.tex, mats, 10.5, 2.9, 4.8);
    sign.position.set(ind.x, 0, ind.z);
    if (ind.rotY) sign.rotation.y = ind.rotY;
    root.add(sign);
  }

  // =========================================================================
  // 11. ZERO-EMPTY-SPACE MULTI-STYLE DHAKA URBAN INFILL (1,800+ BUILDINGS!)
  // =========================================================================
  const seed = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const pickStyle = (i: number, pool: BuildingStyle[]): BuildingStyle => pool[i % pool.length];

  // Road corridor X/Z safety checks so no building ever lands on an asphalt corridor or river
  const nsRoads: Array<{ x: number; halfW: number; zMin: number; zMax: number }> = [
    { x: -560, halfW: 20, zMin: -1960, zMax: 950 },
    { x: -505, halfW: 16, zMin: 300, zMax: 950 },
    { x: -460, halfW: 19, zMin: -1280, zMax: 950 },
    { x: -420, halfW: 14, zMin: -1440, zMax: -840 },
    { x: -390, halfW: 17, zMin: -480, zMax: 110 },
    { x: -280, halfW: 22, zMin: -1440, zMax: 220 },
    { x: -220, halfW: 16, zMin: 300, zMax: 950 },
    { x: -150, halfW: 22, zMin: 430, zMax: 950 },
    { x: -95, halfW: 17, zMin: -1960, zMax: -1400 },
    { x: -95, halfW: 17, zMin: -880, zMax: 950 },
    { x: 0, halfW: 27, zMin: -2030, zMax: 950 },
    { x: 62, halfW: 14, zMin: 280, zMax: 530 },
    { x: 95, halfW: 14, zMin: -1440, zMax: -840 },
    { x: 185, halfW: 18, zMin: -1440, zMax: 950 },
    { x: 265, halfW: 14, zMin: -1440, zMax: -840 },
    { x: 340, halfW: 20, zMin: -1440, zMax: 950 },
    { x: 680, halfW: 20, zMin: -1960, zMax: 950 },
    { x: 1280, halfW: 20, zMin: -1960, zMax: 950 },
    { x: 1620, halfW: 22, zMin: -1960, zMax: 950 },
    { x: 2150, halfW: 22, zMin: -880, zMax: 950 },
  ];

  const ewRoads: Array<{ z: number; halfD: number; xMin: number; xMax: number }> = [
    { z: -1930, halfD: 21, xMin: -580, xMax: 1640 },
    { z: -1530, halfD: 40, xMin: -650, xMax: 1750 }, // Turag River
    { z: -1420, halfD: 19, xMin: -580, xMax: 1640 },
    { z: -1340, halfD: 14, xMin: -10, xMax: 360 },
    { z: -1260, halfD: 18, xMin: -580, xMax: -260 },
    { z: -1260, halfD: 18, xMin: -10, xMax: 360 },
    { z: -1180, halfD: 14, xMin: -10, xMax: 360 },
    { z: -1140, halfD: 14, xMin: -580, xMax: -260 },
    { z: -1140, halfD: 16, xMin: 340, xMax: 1640 },
    { z: -1020, halfD: 14, xMin: -580, xMax: 360 },
    { z: -860, halfD: 48, xMin: 0, xMax: 2180 }, // 300ft + canals
    { z: -860, halfD: 19, xMin: -580, xMax: 30 },
    { z: -660, halfD: 17, xMin: -580, xMax: 1640 },
    { z: -460, halfD: 20, xMin: -580, xMax: 2180 },
    { z: -345, halfD: 16, xMin: -300, xMax: 360 },
    { z: -260, halfD: 17, xMin: -580, xMax: 360 },
    { z: -235, halfD: 16, xMin: -300, xMax: 2180 },
    { z: 0, halfD: 22, xMin: -580, xMax: 2180 },
    { z: 90, halfD: 17, xMin: -580, xMax: 360 },
    { z: 140, halfD: 16, xMin: -580, xMax: -440 },
    { z: 140, halfD: 16, xMin: -300, xMax: 360 },
    { z: 292, halfD: 16, xMin: -250, xMax: 360 },
    { z: 320, halfD: 24, xMin: -580, xMax: 2180 },
    { z: 370, halfD: 15, xMin: -240, xMax: 80 },
    { z: 440, halfD: 16, xMin: -580, xMax: 20 },
    { z: 520, halfD: 17, xMin: -580, xMax: 80 },
    { z: 620, halfD: 19, xMin: -20, xMax: 2180 },
    { z: 700, halfD: 18, xMin: -580, xMax: 360 },
    { z: 790, halfD: 16, xMin: -580, xMax: 360 },
    { z: 920, halfD: 22, xMin: -580, xMax: 2180 },
  ];

  const isSpotFree = (x: number, z: number, w: number, d: number, pad = 3.5) => {
    const hw = w * 0.5 + pad;
    const hd = d * 0.5 + pad;
    // Check Bijoy Sarani curve band
    if (x > -290 && x < -130 && z > 180 && z < 470) return false;

    for (const r of nsRoads) {
      if (z + hd > r.zMin && z - hd < r.zMax && Math.abs(x - r.x) < r.halfW + hw) {
        return false;
      }
    }
    for (const r of ewRoads) {
      if (x + hw > r.xMin && x - hw < r.xMax && Math.abs(z - r.z) < r.halfD + hd) {
        return false;
      }
    }
    for (const ob of occupiedBoxes) {
      if (x + hw > ob.minX && x - hw < ob.maxX && z + hd > ob.minZ && z - hd < ob.maxZ) {
        return false;
      }
    }
    return true;
  };

  const tryPushBuilding = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    style: BuildingStyle,
    rotY = 0,
  ) => {
    if (!isSpotFree(x, z, w, d)) return;
    skylineSpecs.push({ x, z, w, d, h, style, rotY });
    reserveBox(x, z, w, d);
  };

  // A. Replicated Uttara Sectors 1–14 Grid Blocks (West Sector 11-14 + East Sector 1-9)
  const uttaraPool: BuildingStyle[] = ['cream', 'brick', 'plaza', 'commercial', 'glass'];
  const uttaraEastCells: Array<[number, number]> = [
    [48, -1380], [140, -1380], [225, -1380], [302, -1380],
    [48, -1300], [140, -1300], [225, -1300], [302, -1300],
    [48, -1220], [140, -1220], [225, -1220], [302, -1220],
    [48, -1100], [140, -1100], [225, -1100], [302, -1100],
    [48, -945], [140, -945], [225, -945], [302, -945],
  ];
  uttaraEastCells.forEach(([cx, cz], idx) => {
    for (let dx = -16; dx <= 16; dx += 32) {
      for (let dz = -18; dz <= 18; dz += 36) {
        const sIdx = idx * 7 + (dx > 0 ? 1 : 0) + (dz > 0 ? 2 : 0);
        tryPushBuilding(
          cx + dx + (seed(sIdx * 3) - 0.5) * 4,
          cz + dz + (seed(sIdx * 5) - 0.5) * 4,
          17 + seed(sIdx * 7) * 5,
          16 + seed(sIdx * 11) * 5,
          20 + seed(sIdx * 13) * 18,
          pickStyle(sIdx, uttaraPool),
        );
      }
    }
  });

  const uttaraWestCells: Array<[number, number]> = [
    [-512, -1340], [-468, -1340], [-368, -1340], [-324, -1340],
    [-512, -1200], [-468, -1200], [-368, -1200], [-324, -1200],
    [-512, -1080], [-468, -1080], [-368, -1080], [-324, -1080],
    [-512, -945], [-468, -945], [-368, -945], [-324, -945],
  ];
  uttaraWestCells.forEach(([cx, cz], idx) => {
    for (let dz = -20; dz <= 20; dz += 40) {
      const sIdx = idx * 5 + (dz > 0 ? 1 : 0);
      tryPushBuilding(
        cx,
        cz + dz,
        18 + seed(sIdx * 17) * 4,
        17 + seed(sIdx * 19) * 4,
        18 + seed(sIdx * 23) * 16,
        pickStyle(sIdx + 1, uttaraPool),
      );
    }
  });

  // B. Dense City-Wide Multi-Archetype Infill Grid (Mirpur, Dhanmondi, Tejgaon, Mohakhali, Banani, Gulshan, Purbachal, Gazipur, Narayanganj)
  let bIdx = 1;
  // Core Urban Dhaka (X = -538 to +365, Z = -1895 to +895)
  for (let x = -536; x <= 380; x += 36) {
    for (let z = -1890; z <= 888; z += 36) {
      bIdx++;
      const jx = x + (seed(bIdx * 7) - 0.5) * 6;
      const jz = z + (seed(bIdx * 11) - 0.5) * 6;
      const w = 16 + seed(bIdx * 13) * 9;
      const d = 16 + seed(bIdx * 17) * 9;

      const isGulshanBanani = x > 35 && x < 370 && z > -550 && z < 280;
      const isIndustrial = z < -1580 || (x > 25 && x < 170 && z > 150 && z < 480);
      const isDhanmondi = x < -170 && z > 340;

      let h = 16 + seed(bIdx * 19) * 24;
      if (isGulshanBanani) h += 16;
      else if (isDhanmondi) h += 6;

      const pool: BuildingStyle[] = isIndustrial
        ? ['industrial', 'plaza', 'commercial', 'brick']
        : isGulshanBanani
          ? ['glass', 'commercial', 'cream', 'plaza']
          : ['brick', 'cream', 'commercial', 'plaza', 'glass'];

      tryPushBuilding(jx, jz, w, d, h, pickStyle(bIdx, pool));
    }
  }

  // East Dhaka, Purbachal Sectors, Kanchan & Narayanganj Loop Infill (X = +405 to +2110, Z = -1890 to +885)
  for (let x = 405; x <= 2110; x += 58) {
    for (let z = -1885; z <= 880; z += 56) {
      bIdx++;
      if (x > 1715 && z < -915) continue;
      const jx = x + (seed(bIdx * 23) - 0.5) * 10;
      const jz = z + (seed(bIdx * 29) - 0.5) * 10;
      const w = 20 + seed(bIdx * 31) * 10;
      const d = 20 + seed(bIdx * 37) * 10;
      const h = 16 + seed(bIdx * 41) * 22;
      const style = pickStyle(bIdx, ['plaza', 'cream', 'brick', 'commercial', 'glass', 'industrial']);
      tryPushBuilding(jx, jz, w, d, h, style);
    }
  }

  const instancedSkyline = createDenseUrbanBuildingsInstanced(skylineSpecs, mats);
  root.add(instancedSkyline.group);

  for (const [tx, tz, tw, td, th, st] of [
    [44, -200, 22, 22, 46, 'warm'],
    [136, -280, 24, 24, 48, 'cool'],
    [-204, 600, 24, 24, 42, 'concrete'],
    [292, -160, 24, 24, 46, 'cool'],
    [292, 40, 24, 24, 44, 'warm'],
    [-420, 580, 22, 22, 38, 'cool'],
  ] as const) {
    const heroT = createModernTower(mats, tw, td, th, st);
    heroT.position.set(tx, 0, tz);
    root.add(heroT);
    reserveBox(tx, tz, tw + 6, td + 6);
  }

  for (const ux of [185, 340, 680, 1280, 1620]) {
    reserveBox(ux, exp300Z, 56, 176);
  }
  reserveBox(22, exp300Z, 150, 196);
  reserveBox(540, exp300Z, 124, 54);
  reserveBox(1360, exp300Z, 124, 54);

  // =========================================================================
  // 12. OUTER-SIDEWALK STREETLIGHTS (ZERO POLES INSIDE ANY ROADWAY, DRIVEWAY OR INTERSECTION!)
  // =========================================================================
  const isClearZ = (z: number) =>
    !Z_CROSS_GAPS.some(([g1, g2]) => z >= g1 - 5 && z <= g2 + 5);
  const isClearX = (x: number) =>
    !X_JUNCTION_GAPS.some(([g1, g2]) => x >= g1 - 5 && x <= g2 + 5);
  const isDrivewayClear = (x: number, z: number) =>
    !facilityDriveways.some((d) =>
      d.axis === 'z'
        ? Math.abs(x - d.roadCoord) < 28 && Math.sign(x - d.roadCoord) === d.sideSign && z >= d.min && z <= d.max
        : Math.abs(z - d.roadCoord) < 32 && Math.sign(z - d.roadCoord) === d.sideSign && x >= d.min && x <= d.max,
    );
  const pushGroundLamp = (x: number, y: number, z: number, rotY: number) => {
    if (!isDrivewayClear(x, z)) return;
    lampPositions.push({ x, y, z, rotY });
  };

  // N3 outer sidewalks (clear of ramps, driveways & intersections)
  for (let z = 900; z >= -1910; z -= 48) {
    if (!isClearZ(z)) continue;
    pushGroundLamp(20.6, 0.28, z, Math.PI);
    const hasWestRamp =
      (z >= 450 && z <= 695) ||
      (z >= 20 && z <= 280) ||
      (z >= -645 && z <= -425) ||
      (z >= -1020 && z <= -720);
    if (!hasWestRamp) {
      pushGroundLamp(-20.6, 0.28, z, 0);
    }
  }
  // 300ft Purbachal outer service sidewalks (clear of underpass ramps, rivers & junctions)
  for (let x = 75; x <= 2040; x += 48) {
    if (!isClearX(x)) continue;
    if (Math.abs(x - 945) < 22) continue; // Neela Market bridge
    pushGroundLamp(x, 0.3, exp300Z - 26.2, -Math.PI / 2);
    pushGroundLamp(x, 0.3, exp300Z + 26.2, Math.PI / 2);
  }
  // Rokeya Sarani (-280), Mirpur Rd (-460), Farmgate (-150), Satmasjid (-505), Gulshan (340), Hatirjheel (185)
  for (let z = -1400; z <= 180; z += 50) {
    if (!isClearZ(z)) continue;
    pushGroundLamp(-293.8, 0.28, z, 0);
    pushGroundLamp(-266.2, 0.28, z, Math.PI);
    pushGroundLamp(-473.8, 0.28, z, 0);
    pushGroundLamp(-446.2, 0.28, z, Math.PI);
  }
  for (let z = 470; z <= 900; z += 50) {
    if (!isClearZ(z)) continue;
    pushGroundLamp(-163.8, 0.28, z, 0);
    pushGroundLamp(-136.2, 0.28, z, Math.PI);
    pushGroundLamp(-516.4, 0.28, z, 0);
    pushGroundLamp(-493.6, 0.28, z, Math.PI);
  }
  for (let z = -1400; z <= 900; z += 54) {
    if (!isClearZ(z)) continue;
    pushGroundLamp(326.2, 0.28, z, 0);
    pushGroundLamp(353.8, 0.28, z, Math.PI);
    if (z < 310 || z > 625) {
      pushGroundLamp(173.6, 0.28, z, 0);
      pushGroundLamp(196.4, 0.28, z, Math.PI);
    }
  }
  // Gazipur Ring (-1930), South Return (+920), Banani-Mirpur (-460) outer sidewalks
  for (let x = -450; x <= 1520; x += 72) {
    if (!isClearX(x)) continue;
    pushGroundLamp(x, 0.28, -1943.9, -Math.PI / 2);
    pushGroundLamp(x, 0.28, -1916.1, Math.PI / 2);
    pushGroundLamp(x, 0.28, 906.1, -Math.PI / 2);
    pushGroundLamp(x, 0.28, 933.9, Math.PI / 2);
    if (x > -520 && x < 320 && Math.abs(x) > 62) {
      pushGroundLamp(x, 0.28, -473.4, -Math.PI / 2);
      pushGroundLamp(x, 0.28, -446.6, Math.PI / 2);
    }
  }
  // Elevated Expressway outer parapet lamps (strictly on edge parapet, never inside driving lanes)
  for (let i = 2; i < 33; i++) {
    const p = elevCurve.getPointAt(i / 34);
    if (p.y > 4.5) {
      lampPositions.push({ x: p.x - 6.7, y: p.y, z: p.z, rotY: 0 });
    }
  }

  const poleGeo = new THREE.CylinderGeometry(0.13, 0.2, 8.2, 8);
  const armGeo = new THREE.BoxGeometry(2.8, 0.16, 0.18);
  const bulbGeo = new THREE.BoxGeometry(1.1, 0.18, 0.42);
  disposableGeos.push(poleGeo, armGeo, bulbGeo);

  const nLamps = lampPositions.length;
  const polesInst = new THREE.InstancedMesh(poleGeo, mats.steelDark, nLamps);
  const armsInst = new THREE.InstancedMesh(armGeo, mats.steelDark, nLamps);
  const bulbsInst = new THREE.InstancedMesh(bulbGeo, mats.lampGlow, nLamps);

  lampPositions.forEach((lp, i) => {
    const cosR = Math.cos(lp.rotY);
    const sinR = Math.sin(lp.rotY);
    _dummy.position.set(lp.x, lp.y + 4.1, lp.z);
    _dummy.rotation.set(0, lp.rotY, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    polesInst.setMatrixAt(i, _dummy.matrix);

    // Arm cantilevers inward from the sidewalk pole over the road lane
    _dummy.position.set(lp.x + cosR * 1.3, lp.y + 8.15, lp.z - sinR * 1.3);
    _dummy.updateMatrix();
    armsInst.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(lp.x + cosR * 2.2, lp.y + 8.0, lp.z - sinR * 2.2);
    _dummy.updateMatrix();
    bulbsInst.setMatrixAt(i, _dummy.matrix);
  });
  polesInst.instanceMatrix.needsUpdate = true;
  armsInst.instanceMatrix.needsUpdate = true;
  bulbsInst.instanceMatrix.needsUpdate = true;
  polesInst.computeBoundingSphere();
  armsInst.computeBoundingSphere();
  bulbsInst.computeBoundingSphere();
  root.add(polesInst, armsInst, bulbsInst);

  const tryPushTree = (tx: number, tz: number) => {
    if (isSpotFree(tx, tz, 2.8, 2.8, 2.0)) treeCoords.push([tx, tz]);
  };

  // Shade Trees along boulevards & lakefronts (filtered strictly clear of all roads & intersections)
  for (let z = 820; z >= -1840; z -= 40) {
    if (Math.abs(z) < 130 || Math.abs(z + 860) < 70 || Math.abs(z + 1530) < 48) continue;
    tryPushTree(25, z);
    if (z < -1040 || z > 710) tryPushTree(-25, z);
  }
  for (let x = 90; x <= 2000; x += 38) {
    if (
      Math.abs(x - 185) < 32 ||
      Math.abs(x - 340) < 32 ||
      Math.abs(x - 680) < 32 ||
      Math.abs(x - 945) < 28 ||
      Math.abs(x - 1080) < 48 ||
      Math.abs(x - 1280) < 32 ||
      Math.abs(x - 1480) < 48 ||
      Math.abs(x - 1620) < 32
    ) {
      continue;
    }
    tryPushTree(x, exp300Z - 46);
    tryPushTree(x, exp300Z + 46);
  }
  for (let z = -1240; z <= 170; z += 44) {
    if (Math.abs(z + 460) < 48 || Math.abs(z + 60) < 48) continue;
    tryPushTree(-298, z);
    tryPushTree(-262, z);
  }
  for (let x = -430; x <= -285; x += 26) {
    tryPushTree(x, 286);
    tryPushTree(x, 72);
  }
  for (let z = 340; z <= 580; z += 34) {
    tryPushTree(72, z);
    tryPushTree(312, z);
  }
  // Natural green perimeter belt outside outer highway rings
  for (let z = -1960; z <= 960; z += 70) {
    tryPushTree(-595, z);
    tryPushTree(2185, z);
  }
  for (let x = -560; x <= 2140; x += 75) {
    tryPushTree(x, -2065);
    tryPushTree(x, 965);
  }

  // Lush Dhaka Urban Greenery: plant shade trees across grassy yards & open plots between buildings!
  let tIdx = 1;
  for (let x = -540; x <= 2120; x += 34) {
    for (let z = -1900; z <= 900; z += 34) {
      tIdx++;
      if (x > 1675 && z < -905) continue;
      const jx = x + (seed(tIdx * 13) - 0.5) * 18;
      const jz = z + (seed(tIdx * 17) - 0.5) * 18;
      if (isSpotFree(jx, jz, 3.2, 3.2, 2.5)) {
        treeCoords.push([jx, jz]);
      }
    }
  }

  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.6, 8);
  const canopyLowGeo = new THREE.DodecahedronGeometry(2.6, 1);
  const canopyTopGeo = new THREE.DodecahedronGeometry(1.9, 1);
  disposableGeos.push(trunkGeo, canopyLowGeo, canopyTopGeo);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.92 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3b6e3c, roughness: 0.85 });

  const nTrees = treeCoords.length;
  const trunksInst = new THREE.InstancedMesh(trunkGeo, trunkMat, nTrees);
  const canopyLowInst = new THREE.InstancedMesh(canopyLowGeo, canopyMat, nTrees);
  const canopyTopInst = new THREE.InstancedMesh(canopyTopGeo, canopyMat, nTrees);

  const _color = new THREE.Color();
  treeCoords.forEach(([tx, tz], i) => {
    const s = 0.85 + ((i * 37) % 30) / 100;
    _dummy.position.set(tx, 1.8 * s, tz);
    _dummy.rotation.set(0, i * 0.7, 0);
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    trunksInst.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(tx, 4.4 * s, tz);
    _dummy.scale.set(s * 1.15, s * 0.85, s * 1.15);
    _dummy.updateMatrix();
    canopyLowInst.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(tx + 0.3, 6.0 * s, tz - 0.2);
    _dummy.scale.set(s, s * 0.9, s);
    _dummy.updateMatrix();
    canopyTopInst.setMatrixAt(i, _dummy.matrix);

    _color.setHSL(0.29 + ((i * 13) % 10) * 0.005, 0.45, 0.26 + ((i * 7) % 10) * 0.012);
    canopyLowInst.setColorAt(i, _color);
    canopyTopInst.setColorAt(i, _color.clone().offsetHSL(0, 0, 0.05));
  });
  trunksInst.instanceMatrix.needsUpdate = true;
  canopyLowInst.instanceMatrix.needsUpdate = true;
  canopyTopInst.instanceMatrix.needsUpdate = true;
  if (canopyLowInst.instanceColor) canopyLowInst.instanceColor.needsUpdate = true;
  if (canopyTopInst.instanceColor) canopyTopInst.instanceColor.needsUpdate = true;
  trunksInst.computeBoundingSphere();
  canopyLowInst.computeBoundingSphere();
  canopyTopInst.computeBoundingSphere();
  root.add(trunksInst, canopyLowInst, canopyTopInst);

  // =========================================================================
  // 13. LAYER 1 HITBOX PROXIES
  // =========================================================================
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  LANDMARKS.forEach((lm: LandmarkPreset) => {
    const hbGeo = new THREE.BoxGeometry(lm.hitboxSize[0], lm.hitboxSize[1], lm.hitboxSize[2]);
    disposableGeos.push(hbGeo);
    const hb = new THREE.Mesh(hbGeo, hitboxMat);
    hb.position.set(lm.hitboxCenter[0], lm.hitboxCenter[1], lm.hitboxCenter[2]);
    hb.layers.set(1);
    hb.userData.landmarkId = lm.id;
    hitboxes.push(hb);
    root.add(hb);
  });

  batcher.flush(root, disposableGeos);

  return {
    root,
    hitboxes,
    waterMaterial: mats.canalWater,
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      instancedSkyline.dispose();
      trunkMat.dispose();
      canopyMat.dispose();
      hitboxMat.dispose();
      disposeCachedStructureMaterials();
    },
  };
}
