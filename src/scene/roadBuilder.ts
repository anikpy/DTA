import * as THREE from 'three';

/**
 * Generates a continuous smooth ribbon BufferGeometry along a 3D point list
 * with exact arc-length UV mapping so asphalt lane markings never stretch or distort.
 */
export function buildRoadRibbonGeometry(
  points: THREE.Vector3[],
  width: number,
  uvMetersPerTile = 24,
  thickness = 0,
): THREE.BufferGeometry {
  const count = points.length;
  const halfW = width * 0.5;
  const tangents: THREE.Vector3[] = [];
  const cumLen: number[] = [0];

  for (let i = 0; i < count; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(count - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(next, prev);
    t.y = 0;
    if (t.lengthSq() < 1e-6) t.set(0, 0, -1);
    t.normalize();
    tangents.push(t);
    if (i > 0) {
      cumLen.push(cumLen[i - 1] + points[i].distanceTo(points[i - 1]));
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Top surface vertices (2 per point: left & right)
  for (let i = 0; i < count; i++) {
    const p = points[i];
    const t = tangents[i];
    const rightX = -t.z;
    const rightZ = t.x;
    const v = cumLen[i] / uvMetersPerTile;

    positions.push(p.x - rightX * halfW, p.y, p.z - rightZ * halfW);
    normals.push(0, 1, 0);
    uvs.push(0, v);

    positions.push(p.x + rightX * halfW, p.y, p.z + rightZ * halfW);
    normals.push(0, 1, 0);
    uvs.push(1, v);
  }

  for (let i = 0; i < count - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c, b, d, c);
  }

  // Optional structural concrete soffit & side faces for flyovers/viaducts
  if (thickness > 0) {
    const baseOffset = count * 2;
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const t = tangents[i];
      const rightX = -t.z;
      const rightZ = t.x;
      const v = cumLen[i] / uvMetersPerTile;

      // Left top, left bottom, right top, right bottom
      positions.push(p.x - rightX * halfW, p.y, p.z - rightZ * halfW);
      normals.push(-rightX, 0, -rightZ);
      uvs.push(0, v);

      positions.push(p.x - rightX * (halfW * 0.82), p.y - thickness, p.z - rightZ * (halfW * 0.82));
      normals.push(-rightX, -0.35, -rightZ);
      uvs.push(0.25, v);

      positions.push(p.x + rightX * halfW, p.y, p.z + rightZ * halfW);
      normals.push(rightX, 0, rightZ);
      uvs.push(1, v);

      positions.push(p.x + rightX * (halfW * 0.82), p.y - thickness, p.z + rightZ * (halfW * 0.82));
      normals.push(rightX, -0.35, rightZ);
      uvs.push(0.75, v);
    }

    for (let i = 0; i < count - 1; i++) {
      const s0 = baseOffset + i * 4;
      const s1 = baseOffset + (i + 1) * 4;
      // Left wall (outward -right)
      indices.push(s0, s1, s0 + 1, s0 + 1, s1, s1 + 1);
      // Right wall (outward +right)
      indices.push(s0 + 2, s0 + 3, s1 + 2, s0 + 3, s1 + 3, s1 + 2);
      // Bottom soffit (outward -Y)
      indices.push(s0 + 1, s1 + 1, s0 + 3, s0 + 3, s1 + 1, s1 + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates an exact, zero-overshoot polyline with smooth S-curve elevation transitions
 * (smoothstep) between flat segments and elevated flyovers/bridges.
 */
export interface WaypointSpec {
  x: number;
  y: number;
  z: number;
}

export function sampleSmoothRampPoints(
  waypoints: WaypointSpec[],
  stepSize = 8,
): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const horizDist = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.ceil(horizDist / stepSize));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      // Smoothstep for Y so flyover slopes start/end tangent-flat at ground level with zero overshoot
      const smoothT = t * t * (3 - 2 * t);
      result.push(
        new THREE.Vector3(
          a.x + dx * t,
          a.y + (b.y - a.y) * smoothT,
          a.z + dz * t,
        ),
      );
    }
  }
  const last = waypoints[waypoints.length - 1];
  result.push(new THREE.Vector3(last.x, last.y, last.z));
  return result;
}

/**
 * Sample a smooth horizontal curve (2D CatmullRom on XZ) with exact non-overshooting Y interpolation
 */
export function sampleCurvedPathPoints(
  waypoints: WaypointSpec[],
  totalSamples = 60,
): THREE.Vector3[] {
  const xzCurve = new THREE.CatmullRomCurve3(
    waypoints.map((w) => new THREE.Vector3(w.x, 0, w.z)),
  );
  const pts: THREE.Vector3[] = [];
  const segCount = waypoints.length - 1;

  for (let i = 0; i <= totalSamples; i++) {
    const u = i / totalSamples;
    const p = xzCurve.getPointAt(u);
    const segFloat = Math.min(segCount - 0.0001, u * segCount);
    const idx = Math.floor(segFloat);
    const localT = segFloat - idx;
    const st = localT * localT * (3 - 2 * localT);
    const y = waypoints[idx].y + (waypoints[idx + 1].y - waypoints[idx].y) * st;
    p.y = y;
    pts.push(p);
  }
  return pts;
}

/**
 * Piecewise linear-horizontal + smooth-vertical Path evaluator for vehicles.
 * Guarantees vehicles stay 100% centered on roads and never dip underground or fly off curves!
 */
export class PolylineRoadPath {
  private points: THREE.Vector3[];
  private cumLen: number[];
  public totalLength: number;

  constructor(points: THREE.Vector3[]) {
    this.points = points;
    this.cumLen = [0];
    for (let i = 1; i < points.length; i++) {
      this.cumLen.push(this.cumLen[i - 1] + points[i].distanceTo(points[i - 1]));
    }
    this.totalLength = this.cumLen[this.cumLen.length - 1] || 1;
  }

  public getPointAt(t: number, out: THREE.Vector3): THREE.Vector3 {
    const clamped = ((t % 1) + 1) % 1;
    const targetDist = clamped * this.totalLength;

    let lo = 0;
    let hi = this.cumLen.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cumLen[mid] <= targetDist) lo = mid;
      else hi = mid;
    }

    const segStart = this.cumLen[lo];
    const segEnd = this.cumLen[hi];
    const alpha = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;
    out.lerpVectors(this.points[lo], this.points[hi], alpha);
    return out;
  }
}
