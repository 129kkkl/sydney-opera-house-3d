import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createShellGeometry, createShellBaseCurve } from '../geometry/shell.js';
import {
  createShellTileTexture,
  createShellRoughTexture,
  createGraniteTexture,
  createConcreteTexture
} from '../textures.js';
import { createGlassFacadeTexture, createGlassGlowTexture } from '../textures/glass.js';
import {
  COLORS,
  FWD,
  PODIUM_TOP_Y,
  PODIUM_FRONT_Z,
  PODIUM_BACK_Z,
  PODIUM_WEST_X,
  PODIUM_EAST_X,
  SHELL_CLUSTERS,
  STEPS
} from '../config.js';

const FWD3 = new THREE.Vector3(FWD.x, 0, FWD.y).normalize();

/* ============================================================
 * 工具
 * ============================================================ */

/** 带圆角的平面轮廓（坐标为世界 x / z） */
function roundedPlanShape(points, radius) {
  const shape = new THREE.Shape();
  const n = points.length;
  const pt = (i) => new THREE.Vector2(points[(i + n) % n][0], points[(i + n) % n][1]);
  for (let i = 0; i < n; i++) {
    const prev = pt(i - 1);
    const curr = pt(i);
    const next = pt(i + 1);
    const v1 = prev.clone().sub(curr).normalize();
    const v2 = next.clone().sub(curr).normalize();
    const r = Math.min(radius, curr.distanceTo(prev) * 0.4, curr.distanceTo(next) * 0.4);
    const p1 = curr.clone().addScaledVector(v1, r);
    const p2 = curr.clone().addScaledVector(v2, r);
    if (i === 0) shape.moveTo(p1.x, p1.y);
    else shape.lineTo(p1.x, p1.y);
    shape.quadraticCurveTo(curr.x, curr.y, p2.x, p2.y);
  }
  shape.closePath();
  return shape;
}

/** 挤出体：shape 在 (x,z) 平面，高度 y ∈ [yBottom, yTop] */
function extrudeHorizontal(shape, yBottom, yTop, options = {}) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: yTop - yBottom,
    bevelEnabled: false,
    curveSegments: options.curveSegments ?? 18,
    steps: 1
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, yTop, 0);
  return geo;
}

/* ============================================================
 * 材质
 * ============================================================ */
export function createBuildingMaterials() {
  const shellMap = createShellTileTexture();
  const shellRough = createShellRoughTexture();
  const graniteMap = createGraniteTexture();
  const concreteMap = createConcreteTexture();
  const plazaMap = createConcreteTexture('#cfc9c0', 128);
  const glassMap = createGlassFacadeTexture();
  const glassGlow = createGlassGlowTexture();

  const shell = new THREE.MeshStandardMaterial({
    color: COLORS.shell,
    map: shellMap,
    roughnessMap: shellRough,
    roughness: 0.62,
    metalness: 0.03,
    envMapIntensity: 1.0
  });

  const shellInner = new THREE.MeshStandardMaterial({
    color: 0xe7e2d7,
    roughness: 0.78,
    metalness: 0.02,
    envMapIntensity: 0.75
  });

  const granite = new THREE.MeshStandardMaterial({
    color: COLORS.podium,
    map: graniteMap,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.7
  });

  const graniteDark = new THREE.MeshStandardMaterial({
    color: COLORS.podiumDark,
    map: graniteMap,
    roughness: 0.92,
    metalness: 0.02,
    envMapIntensity: 0.55
  });

  const concrete = new THREE.MeshStandardMaterial({
    color: COLORS.concrete,
    map: concreteMap,
    roughness: 0.85,
    metalness: 0.02,
    envMapIntensity: 0.7
  });

  const plaza = new THREE.MeshStandardMaterial({
    color: 0xd7d1c8,
    map: plazaMap,
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.75
  });

  const glass = new THREE.MeshStandardMaterial({
    color: 0xe2ecf6,
    map: glassMap,
    emissive: 0xffc27a,
    emissiveMap: glassGlow,
    emissiveIntensity: 0.0,
    roughness: 0.16,
    metalness: 0.36,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide
  });

  const glassDark = new THREE.MeshStandardMaterial({
    color: 0xc9d8e8,
    map: glassMap,
    emissive: 0xffb96b,
    emissiveMap: glassGlow,
    emissiveIntensity: 0.0,
    roughness: 0.22,
    metalness: 0.32,
    envMapIntensity: 1.9,
    side: THREE.DoubleSide
  });

  return { shell, shellInner, granite, graniteDark, concrete, plaza, glass, glassDark };
}

/* ============================================================
 * 基座（Podium）：主体 + 大台阶 + 平台 + 滨水细节
 * ============================================================ */
function createPodium(mats) {
  const group = new THREE.Group();
  group.name = 'podium';

  // ---- 基座主体 ----
  const plan = roundedPlanShape(
    [
      [PODIUM_WEST_X, PODIUM_FRONT_Z],
      [PODIUM_WEST_X, 150],
      [-96, 170],
      [-20, PODIUM_BACK_Z],
      [58, PODIUM_BACK_Z],
      [102, 162],
      [PODIUM_EAST_X, 126],
      [PODIUM_EAST_X, 62],
      [104, 34],
      [52, PODIUM_FRONT_Z],
      [-40, PODIUM_FRONT_Z - 1]
    ],
    7
  );
  const podiumBody = new THREE.Mesh(extrudeHorizontal(plan, -6, PODIUM_TOP_Y), mats.granite);
  podiumBody.receiveShadow = true;
  podiumBody.castShadow = true;
  group.add(podiumBody);

  // ---- 基座顶部铺装 ----
  const plazaPlan = roundedPlanShape(
    [
      [PODIUM_WEST_X + 2, PODIUM_FRONT_Z + 2],
      [PODIUM_WEST_X + 2, 148],
      [-96, 166],
      [-20, PODIUM_BACK_Z - 4],
      [56, PODIUM_BACK_Z - 4],
      [98, 158],
      [PODIUM_EAST_X - 3, 124],
      [PODIUM_EAST_X - 3, 64],
      [100, 38],
      [52, PODIUM_FRONT_Z + 2],
      [-40, PODIUM_FRONT_Z + 1]
    ],
    6
  );
  const plaza = new THREE.Mesh(extrudeHorizontal(plazaPlan, PODIUM_TOP_Y - 0.35, PODIUM_TOP_Y + 0.06), mats.plaza);
  plaza.receiveShadow = true;
  group.add(plaza);

  // ---- 大台阶（向水面展开） ----
  const stepGeos = [];
  const stepCount = 24;
  const runDepth = (STEPS.zBack - STEPS.zFront - STEPS.landingDepth) / stepCount;
  const rise = (STEPS.topY - STEPS.landingY) / stepCount;
  // 平台（临水）
  stepGeos.push(
    new THREE.BoxGeometry(STEPS.xMax - STEPS.xMin, STEPS.landingY + 6, STEPS.landingDepth).translate(
      (STEPS.xMin + STEPS.xMax) / 2,
      STEPS.landingY - (STEPS.landingY + 6) / 2,
      STEPS.zFront + STEPS.landingDepth / 2
    )
  );
  for (let i = 0; i < stepCount; i++) {
    const y = STEPS.landingY + rise * (i + 1);
    const z = STEPS.zFront + STEPS.landingDepth + runDepth * (i + 1);
    stepGeos.push(
      new THREE.BoxGeometry(STEPS.xMax - STEPS.xMin, y + 6, runDepth + 0.02).translate(
        (STEPS.xMin + STEPS.xMax) / 2,
        y - (y + 6) / 2,
        z - runDepth / 2
      )
    );
  }
  const steps = new THREE.Mesh(mergeGeometries(stepGeos, false), mats.concrete);
  steps.castShadow = true;
  steps.receiveShadow = true;
  group.add(steps);

  // 台阶侧墙（花岗岩）
  const sideWallGeos = [];
  const sideW = 6;
  for (const side of [STEPS.xMin - sideW / 2, STEPS.xMax + sideW / 2]) {
    const g = new THREE.BoxGeometry(sideW, STEPS.topY + 6, STEPS.zBack - STEPS.zFront).translate(
      side,
      STEPS.topY - (STEPS.topY + 6) / 2,
      (STEPS.zFront + STEPS.zBack) / 2
    );
    sideWallGeos.push(g);
  }
  const sideWalls = new THREE.Mesh(mergeGeometries(sideWallGeos, false), mats.granite);
  sideWalls.castShadow = true;
  sideWalls.receiveShadow = true;
  group.add(sideWalls);

  // ---- 临水平台栏杆 / 系缆桩 ----
  const detailGeos = [];
  // 系缆桩
  for (let x = PODIUM_WEST_X + 8; x < PODIUM_EAST_X; x += 18) {
    const b = new THREE.CylinderGeometry(0.55, 0.75, 1.5, 10);
    b.translate(x, 1.1, PODIUM_FRONT_Z - 2.2);
    detailGeos.push(b);
  }
  // 平台边缘压顶
  const coping = new THREE.BoxGeometry(STEPS.xMax - STEPS.xMin, 0.6, 1.6);
  coping.translate((STEPS.xMin + STEPS.xMax) / 2, STEPS.landingY + 0.3, STEPS.zFront + 0.6);
  detailGeos.push(coping);
  const details = new THREE.Mesh(mergeGeometries(detailGeos, false), mats.graniteDark);
  details.castShadow = true;
  details.receiveShadow = true;
  group.add(details);

  return group;
}

/* ============================================================
 * 壳体分组：建筑体量 + 玻璃幕墙 + 球面壳体
 * ============================================================ */
const FWD2 = new THREE.Vector2(FWD.x, FWD.y);

function shellConfigOf(cluster, s) {
  return {
    center: new THREE.Vector3(cluster.centerX + s.dx, cluster.bodyTopY, cluster.centerZ + s.dz),
    width: s.width,
    height: s.height,
    lean: s.lean,
    baseSag: s.baseSag,
    tipX: s.tipX,
    bulge: s.bulge
  };
}

function createCluster(cluster, mats) {
  const group = new THREE.Group();
  group.name = cluster.id;

  const shellMeshes = [];

  for (const s of cluster.shells) {
    const cfg = shellConfigOf(cluster, s);
    const baseCurve = createShellBaseCurve(cfg, 64);

    // ---- 壳体下部建筑体量（平面轮廓沿壳体底边） ----
    const plan = new THREE.Shape();
    plan.moveTo(baseCurve[0].x, baseCurve[0].z);
    for (let i = 1; i < baseCurve.length; i++) plan.lineTo(baseCurve[i].x, baseCurve[i].z);
    // 向后（陆侧）延伸
    plan.lineTo(baseCurve[baseCurve.length - 1].x, baseCurve[baseCurve.length - 1].z + cluster.bodyDepth);
    plan.lineTo(baseCurve[0].x, baseCurve[0].z + cluster.bodyDepth);
    plan.closePath();

    const body = new THREE.Mesh(extrudeHorizontal(plan, PODIUM_TOP_Y, cluster.bodyTopY), mats.graniteDark);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // ---- 玻璃幕墙：沿壳体底边下垂至基座平台，略向外张 ----
    const segs = baseCurve.length - 1;
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= segs; i++) {
      const p = baseCurve[i];
      const top = new THREE.Vector3(p.x, cluster.bodyTopY, p.z);
      const bottom = new THREE.Vector3(
        p.x + FWD3.x * 2.4,
        PODIUM_TOP_Y + 0.08,
        p.z + FWD3.z * 2.4
      );
      positions.push(top.x, top.y, top.z, bottom.x, bottom.y, bottom.z);
      const u = (i / segs) * 3.2;
      uvs.push(u, 1, u, 0);
      if (i < segs) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
      }
    }
    const glassGeo = new THREE.BufferGeometry();
    glassGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    glassGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    glassGeo.setIndex(indices);
    glassGeo.computeVertexNormals();
    const glassWall = new THREE.Mesh(glassGeo, mats.glass);
    glassWall.castShadow = false;
    group.add(glassWall);

    // ---- 幕墙底部压顶（填补幕墙与体量之间的缝隙） ----
    const ledgeGeos = [];
    for (let i = 0; i < segs; i++) {
      const p0 = baseCurve[i];
      const p1 = baseCurve[i + 1];
      const mid = p0.clone().lerp(p1, 0.5);
      const len = p0.distanceTo(p1) + 0.2;
      const ledge = new THREE.BoxGeometry(len, 0.5, 3.6);
      ledge.rotateY(-Math.atan2(p1.z - p0.z, p1.x - p0.x));
      ledge.translate(
        mid.x + FWD3.x * 1.1,
        PODIUM_TOP_Y + 0.25,
        mid.z + FWD3.z * 1.1
      );
      ledgeGeos.push(ledge);
    }
    const ledges = new THREE.Mesh(mergeGeometries(ledgeGeos, false), mats.concrete);
    ledges.receiveShadow = true;
    group.add(ledges);

    // ---- 壳体本体 ----
    const geo = createShellGeometry({
      ...cfg,
      thickness: 1.7,
      edgeFrac: 0.22,
      uSegs: 110,
      vSegs: 84
    });
    const mesh = new THREE.Mesh(geo, mats.shell);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `${cluster.id}-shell`;
    group.add(mesh);
    shellMeshes.push(mesh);
  }

  return { group, shellMeshes };
}

/* ============================================================
 * 组装
 * ============================================================ */
export function createOperaHouse(mats) {
  const root = new THREE.Group();
  root.name = 'opera-house';

  const podium = createPodium(mats);
  root.add(podium);

  const shellMeshes = [];
  const clusterGroups = [];
  for (const cluster of SHELL_CLUSTERS) {
    const { group, shellMeshes: sm } = createCluster(cluster, mats);
    root.add(group);
    clusterGroups.push(group);
    shellMeshes.push(...sm);
  }

  // ---- 信息标注锚点 ----
  const anchors = [
    {
      text: '音乐厅壳体 · CONCERT HALL',
      position: new THREE.Vector3(-80, 72, 40)
    },
    {
      text: '歌剧厅壳体 · OPERA THEATRE',
      position: new THREE.Vector3(16, 63, 40)
    },
    {
      text: '餐厅 · BENNELONG',
      position: new THREE.Vector3(88, 44, 38)
    },
    {
      text: '玻璃幕墙 · GLASS CURTAIN WALL',
      position: new THREE.Vector3(-25, 21, 38)
    },
    {
      text: '大台阶 · MONUMENTAL STEPS',
      position: new THREE.Vector3(-70, 14, 2)
    },
    {
      text: '基座平台 · PODIUM',
      position: new THREE.Vector3(-70, 17, 120)
    }
  ];

  return { root, shellMeshes, clusterGroups, anchors };
}
