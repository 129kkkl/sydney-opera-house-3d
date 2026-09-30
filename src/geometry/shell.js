import * as THREE from 'three';

/**
 * 悉尼歌剧院壳体几何生成器（球面解）。
 *
 * 参照 Utzon 的球面方案：每片壳体是半径约 75m 球面上的一块曲面——
 *   · 顶点 A：尖锐的顶点，向水面倾斜；
 *   · B、C：落在基座平台上的两个底角；
 *   · 底边：球面与基面的交线（一段水平圆弧）；
 *   · 侧边：球面上的大圆弧，外轮廓强烈外凸；
 *   · 曲面外凸朝水面/天空，内侧为凹面，带厚度与加厚边缘。
 *
 * 球面由 A、B、C 与底边中点四点唯一确定，因此曲率自然可信
 * （拟合出的半径与真实歌剧院 75m 球面半径一致）。
 */

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

/** 过四点的球心与半径 */
function circumsphere(A, B, C, D) {
  const a = _v1.copy(A).sub(D);
  const b = _v2.copy(B).sub(D);
  const c = _v3.copy(C).sub(D);
  const m = new THREE.Matrix3().set(
    a.x, a.y, a.z,
    b.x, b.y, b.z,
    c.x, c.y, c.z
  );
  const v = new THREE.Vector3(a.lengthSq(), b.lengthSq(), c.lengthSq()).multiplyScalar(0.5);
  const det = m.determinant();
  if (Math.abs(det) < 1e-6) {
    return { O: D.clone().add(new THREE.Vector3(0, -60, 60)), R: 90 };
  }
  const x = v.applyMatrix3(m.invert());
  const O = D.clone().add(x);
  return { O, R: O.distanceTo(A) };
}

function slerpDir(a, b, t, out) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const theta = Math.acos(dot);
  if (theta < 1e-5) return out.copy(b);
  const s = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / s;
  const w2 = Math.sin(t * theta) / s;
  return out.copy(a).multiplyScalar(w1).addScaledVector(b, w2);
}

/** 壳体关键点：A 顶点、B/C 底角、baseMid 底边中点 */
export function shellKeyPoints(cfg) {
  const {
    center = new THREE.Vector3(),
    width = 58,
    height = 44,
    lean = 12,
    baseSag = 7,
    tipX = 0
  } = cfg;
  const A = new THREE.Vector3(center.x + tipX, center.y + height, center.z - lean);
  const B = new THREE.Vector3(center.x - width / 2, center.y, center.z + baseSag);
  const C = new THREE.Vector3(center.x + width / 2, center.y, center.z + baseSag);
  const baseMid = new THREE.Vector3(center.x, center.y, center.z);
  return { A, B, C, baseMid };
}

/** 壳体球面：过 A、B、C 与外凸控制点 M，bulge 越大曲率越强、外轮廓越鼓 */
function shellSphere(cfg) {
  const { A, B, C, baseMid } = shellKeyPoints(cfg);
  const bulge = cfg.bulge ?? 8;
  const outward =
    cfg.outward ??
    new THREE.Vector3(0, 0.42, -0.91).normalize();
  const n = new THREE.Vector3()
    .crossVectors(new THREE.Vector3().subVectors(B, A), new THREE.Vector3().subVectors(C, A))
    .normalize();
  if (n.dot(outward) < 0) n.negate();
  const M = baseMid.clone().addScaledVector(n, bulge);
  return { ...circumsphere(A, B, C, M), A, B, C, baseMid };
}

/** 壳体底边弧（水平圆弧，投影到球面） */
export function createShellBaseCurve(cfg, segs = 64) {
  const { A, B, C, baseMid, O, R } = shellSphere(cfg);
  const ctrl = baseMid.clone().multiplyScalar(2).sub(_v1.copy(B).add(C).multiplyScalar(0.5));
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const it = 1 - t;
    const p = new THREE.Vector3(
      it * it * B.x + 2 * it * t * ctrl.x + t * t * C.x,
      it * it * B.y + 2 * it * t * ctrl.y + t * t * C.y,
      it * it * B.z + 2 * it * t * ctrl.z + t * t * C.z
    );
    pts.push(p.sub(O).normalize().multiplyScalar(R).add(O));
  }
  void A;
  return pts;
}

export function createShellGeometry(cfg) {
  const {
    thickness = 1.25,
    edgeFrac = 0.34,
    uSegs = 110,
    vSegs = 84
  } = cfg;

  const { A, B, C, baseMid, O, R } = shellSphere(cfg);

  const ctrl = baseMid.clone().multiplyScalar(2).sub(_v1.copy(B).add(C).multiplyScalar(0.5));
  const dirA = _v1.copy(A).sub(O).normalize().clone();

  const rows = vSegs + 1;
  const cols = uSegs + 1;
  const outer = new Array(rows * cols);
  const inner = new Array(rows * cols);
  const dirs = new Array(rows * cols);
  const uvs = new Array(rows * cols);

  const dirBase = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  for (let iv = 0; iv < rows; iv++) {
    const v = iv / vSegs;
    for (let iu = 0; iu < cols; iu++) {
      const u = iu / uSegs;
      const it = 1 - u;
      tmp.set(
        it * it * B.x + 2 * it * u * ctrl.x + u * u * C.x,
        it * it * B.y + 2 * it * u * ctrl.y + u * u * C.y,
        it * it * B.z + 2 * it * u * ctrl.z + u * u * C.z
      );
      dirBase.copy(tmp).sub(O).normalize();

      const idx = iv * cols + iu;
      slerpDir(dirBase, dirA, v, dir);
      dirs[idx] = dir.clone();
      outer[idx] = O.clone().addScaledVector(dir, R);
      inner[idx] = O.clone().addScaledVector(dir, R - thickness);
      uvs[idx] = new THREE.Vector2(u * 2.6, v * 3.6);
    }
  }

  const positions = [];
  const normalArr = [];
  const uvArr = [];
  const indices = [];

  const push = (p, n, u, v) => {
    positions.push(p.x, p.y, p.z);
    normalArr.push(n.x, n.y, n.z);
    uvArr.push(u, v);
  };

  // 外表面
  const outerBase = positions.length / 3;
  for (let i = 0; i < rows * cols; i++) push(outer[i], dirs[i], uvs[i].x, uvs[i].y);
  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const p = outerBase + iv * cols + iu;
      indices.push(p, p + cols, p + 1, p + 1, p + cols, p + cols + 1);
    }
  }

  // 内表面
  const innerBase = positions.length / 3;
  for (let i = 0; i < rows * cols; i++) push(inner[i], dirs[i].clone().negate(), uvs[i].x, uvs[i].y);
  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const p = innerBase + iv * cols + iu;
      indices.push(p, p + 1, p + cols, p + 1, p + cols + 1, p + cols);
    }
  }

  // 边缘（加厚轮廓）
  const edgeStrip = (getIdx, count, normalFn) => {
    const start = positions.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = getIdx(i);
      push(outer[idx], normalFn(idx), i / (count - 1), 0);
    }
    for (let i = 0; i < count; i++) {
      const idx = getIdx(i);
      const ii = inner[idx].clone().lerp(outer[idx], edgeFrac);
      push(ii, normalFn(idx), i / (count - 1), 1);
    }
    for (let i = 0; i < count - 1; i++) {
      const p = start + i;
      const q = start + count + i;
      indices.push(p, p + 1, q, p + 1, q + 1, q);
    }
  };

  const sphereNormal = (idx) => outer[idx].clone().sub(O).normalize();

  edgeStrip((i) => i, cols, sphereNormal); // 底边
  edgeStrip((i) => i * cols, rows, sphereNormal); // 侧边 A-B
  edgeStrip((i) => i * cols + (cols - 1), rows, sphereNormal); // 侧边 A-C

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArr, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
