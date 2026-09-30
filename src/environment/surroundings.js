import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * 周边环境：岸线地形、远景天际线、海港大桥、船只、树木。
 * 全部为程序化低模，作用是交代"悉尼港湾"的场所感与尺度参照。
 */

const LAND_Y = 4.0;

/* ------------------------------ 地形 ------------------------------ */
export function createTerrain() {
  const group = new THREE.Group();
  group.name = 'terrain';

  const shorePoints = [
    [-1500, 240],
    [-1150, 250],
    [-1080, 330],
    [-1120, 440],
    [-1080, 540],
    [-900, 585],
    [-740, 545],
    [-660, 460],
    [-600, 380],
    [-520, 345],
    [-380, 352],
    [-260, 392],
    [-150, 330],
    [-60, 252],
    [60, 205],
    [150, 175],
    [280, 192],
    [360, 252],
    [520, 330],
    [760, 382],
    [1100, 420],
    [1500, 470],
    [1500, 1400],
    [-1500, 1400]
  ];

  const shape = new THREE.Shape();
  shape.moveTo(shorePoints[0][0], shorePoints[0][1]);
  for (let i = 1; i < shorePoints.length; i++) shape.lineTo(shorePoints[i][0], shorePoints[i][1]);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 12, bevelEnabled: false, steps: 1 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, LAND_Y, 0);

  const landMat = new THREE.MeshStandardMaterial({
    color: 0x6b6a5d,
    roughness: 0.95,
    metalness: 0.0
  });
  const land = new THREE.Mesh(geo, landMat);
  land.receiveShadow = true;
  group.add(land);

  // 岸边绿化带（抬高的草坡）
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x53654c,
    roughness: 1.0,
    metalness: 0.0
  });
  const grassShape = new THREE.Shape();
  const inset = shorePoints.map(([x, z]) => [x * 0.92, z + 26]);
  grassShape.moveTo(inset[0][0], inset[0][1]);
  for (let i = 1; i < inset.length; i++) grassShape.lineTo(inset[i][0], inset[i][1]);
  grassShape.closePath();
  const grassGeo = new THREE.ExtrudeGeometry(grassShape, { depth: 2.2, bevelEnabled: false, steps: 1 });
  grassGeo.rotateX(Math.PI / 2);
  grassGeo.translate(0, LAND_Y + 2.2, 0);
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.receiveShadow = true;
  group.add(grass);

  return group;
}

/* ------------------------------ 树木 ------------------------------ */
export function createTrees(count = 90) {
  const group = new THREE.Group();
  group.name = 'trees';

  const trunkGeo = new THREE.CylinderGeometry(0.42, 0.62, 5.2, 6);
  trunkGeo.translate(0, 2.6, 0);
  const crownGeo = new THREE.IcosahedronGeometry(3.1, 1);
  crownGeo.translate(0, 6.4, 0);
  const crown2Geo = new THREE.IcosahedronGeometry(2.2, 1);
  crown2Geo.translate(1.4, 8.0, -0.8);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4632, roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x445c3e, roughness: 0.92 });

  const trunks = [];
  const crowns = [];

  // 树木分布：建筑后方公园带 + 西侧
  const zones = [
    { x: [-620, -180], z: [230, 430] },
    { x: [-160, 40], z: [220, 330] },
    { x: [320, 720], z: [280, 430] },
    { x: [-900, -640], z: [280, 470] }
  ];

  for (let i = 0; i < count; i++) {
    const zone = zones[i % zones.length];
    const x = THREE.MathUtils.lerp(zone.x[0], zone.x[1], Math.random());
    const z = THREE.MathUtils.lerp(zone.z[0], zone.z[1], Math.random());
    const s = 0.75 + Math.random() * 0.9;
    const rot = Math.random() * Math.PI * 2;

    const t = trunkGeo.clone();
    t.scale(s, s, s);
    t.rotateY(rot);
    t.translate(x, LAND_Y + 2, z);
    trunks.push(t);

    const c = crownGeo.clone();
    c.scale(s * (0.9 + Math.random() * 0.35), s * (0.85 + Math.random() * 0.3), s * (0.9 + Math.random() * 0.35));
    c.rotateY(rot);
    c.translate(x, LAND_Y + 2, z);
    crowns.push(c);

    const c2 = crown2Geo.clone();
    c2.scale(s, s, s);
    c2.rotateY(rot);
    c2.translate(x, LAND_Y + 2, z);
    crowns.push(c2);
  }

  const trunksMesh = new THREE.Mesh(mergeGeometries(trunks, false), trunkMat);
  const crownsMesh = new THREE.Mesh(mergeGeometries(crowns, false), crownMat);
  trunksMesh.castShadow = true;
  crownsMesh.castShadow = true;
  crownsMesh.receiveShadow = true;
  group.add(trunksMesh, crownsMesh);

  return group;
}

/* ------------------------------ 远景天际线 ------------------------------ */
export function createSkyline() {
  const group = new THREE.Group();
  group.name = 'skyline';

  const mat = new THREE.MeshStandardMaterial({
    color: 0x7e8994,
    roughness: 0.66,
    metalness: 0.18,
    emissive: 0x2c3a4c,
    emissiveIntensity: 0.0
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x2c3742,
    emissive: 0xffd9a0,
    emissiveIntensity: 0.0,
    roughness: 0.5,
    metalness: 0.3
  });

  const geos = [];
  const windowGeos = [];
  const towers = [
    [-980, 1240, 74, 74, 198],
    [-880, 1320, 58, 58, 158],
    [-790, 1180, 66, 66, 132],
    [-690, 1290, 84, 60, 104],
    [-590, 1170, 52, 52, 172],
    [-500, 1280, 70, 70, 122],
    [-410, 1190, 46, 46, 96],
    [-330, 1310, 62, 62, 142],
    [-250, 1180, 40, 40, 78],
    [-1080, 1360, 62, 62, 106],
    [-160, 1290, 54, 54, 98],
    [-40, 1380, 68, 68, 116],
    [110, 1310, 48, 48, 84],
    [280, 1400, 58, 58, 96],
    [470, 1460, 66, 66, 78],
    [700, 1500, 72, 72, 72]
  ];

  for (const [x, z, w, d, h] of towers) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, h / 2, z);
    geos.push(g);

    // 竖向窗带（远看成条纹即可）
    const cols = Math.max(2, Math.floor(w / 18));
    for (let c = 0; c < cols; c++) {
      const wg = new THREE.BoxGeometry(w * 0.09, h * 0.9, 1.6);
      wg.translate(x - w / 2 + (c + 0.5) * (w / cols), h * 0.52, z - d / 2 - 1.2);
      windowGeos.push(wg);
    }
  }

  const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
  const windows = new THREE.Mesh(mergeGeometries(windowGeos, false), windowMat);
  group.add(mesh, windows);

  return { group, mat, windowMat };
}

/* ------------------------------ 海港大桥 ------------------------------ */
export function createHarbourBridge() {
  const group = new THREE.Group();
  group.name = 'harbour-bridge';

  const steel = new THREE.MeshStandardMaterial({
    color: 0x4a5560,
    roughness: 0.72,
    metalness: 0.55
  });

  const centerX = -1180;
  const centerZ = 720;
  const spanX = 860; // 桥沿 X 方向跨越
  const deckY = 62;

  // 桥面
  const deck = new THREE.BoxGeometry(spanX, 7, 26);
  deck.translate(centerX, deckY, centerZ);
  group.add(new THREE.Mesh(deck, steel));

  // 拱肋（两条）
  const archGeos = [];
  const archPts = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const x = centerX - spanX * 0.42 + t * spanX * 0.84;
    const y = deckY + Math.sin(Math.PI * t) * 96 + 6;
    archPts.push(new THREE.Vector3(x, y, 0));
  }
  for (const dz of [-12, 12]) {
    const curve = new THREE.CatmullRomCurve3(archPts.map((p) => new THREE.Vector3(p.x, p.y, centerZ + dz)));
    const tube = new THREE.TubeGeometry(curve, 40, 3.4, 8, false);
    archGeos.push(tube);
  }
  // 吊杆
  for (let i = 1; i < 15; i++) {
    const t = i / 15;
    const x = centerX - spanX * 0.42 + t * spanX * 0.84;
    const yTop = deckY + Math.sin(Math.PI * t) * 96 + 6;
    for (const dz of [-12, 12]) {
      const hanger = new THREE.BoxGeometry(1.5, yTop - deckY, 1.5);
      hanger.translate(x, (yTop + deckY) / 2, centerZ + dz);
      archGeos.push(hanger);
    }
  }
  // 桥墩 / 桥塔
  for (const sx of [-1, 1]) {
    for (const dz of [-12, 12]) {
      const pylon = new THREE.BoxGeometry(14, deckY + 26, 14);
      pylon.translate(centerX + sx * spanX * 0.44, (deckY + 26) / 2 - 6, centerZ + dz);
      archGeos.push(pylon);
    }
  }

  const archMesh = new THREE.Mesh(mergeGeometries(archGeos, false), steel);
  group.add(archMesh);

  return group;
}

/* ------------------------------ 船只 ------------------------------ */
export function createBoats() {
  const group = new THREE.Group();
  group.name = 'boats';

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.55, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3742, roughness: 0.6, metalness: 0.25 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xf6f3ec,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x2c3742,
    emissive: 0xffd9a0,
    emissiveIntensity: 0.0,
    roughness: 0.5
  });

  const boats = [];

  function makeFerry(scale = 1) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(30, 4.2, 8.6), hullMat);
    hull.position.y = 2.1;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(4.3, 8, 4), hullMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(18, 2.1, 0);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(20, 5, 7.4), glowMat);
    cabin.position.set(-1, 6.6, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 6), darkMat);
    top.position.set(-2, 10.3, 0);
    g.add(hull, bow, cabin, top);
    g.scale.setScalar(scale);
    return g;
  }

  function makeSailboat(scale = 1) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 3.6), darkMat);
    hull.position.y = 1.2;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 16, 6), darkMat);
    mast.position.y = 9;
    const sailGeo = new THREE.BufferGeometry();
    sailGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 1.8, 0, 0, 16.6, 0, 6.4, 2.6, 0], 3)
    );
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, sailMat);
    const jibGeo = new THREE.BufferGeometry();
    jibGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 3.2, 0, 0, 14.2, 0, -4.6, 3.6, 0], 3)
    );
    jibGeo.computeVertexNormals();
    const jib = new THREE.Mesh(jibGeo, sailMat);
    g.add(hull, mast, sail, jib);
    g.scale.setScalar(scale);
    return g;
  }

  const defs = [
    { type: 'ferry', r: 300, speed: 0.026, phase: 0.4, y: 0, scale: 1.15 },
    { type: 'ferry', r: 470, speed: -0.017, phase: 2.4, y: 0, scale: 1.0 },
    { type: 'sail', r: 220, speed: 0.032, phase: 1.1, y: 0, scale: 1.25 },
    { type: 'sail', r: 360, speed: -0.022, phase: 3.6, y: 0, scale: 1.0 },
    { type: 'sail', r: 540, speed: 0.014, phase: 5.2, y: 0, scale: 1.4 }
  ];

  for (const d of defs) {
    const mesh = d.type === 'ferry' ? makeFerry(d.scale) : makeSailboat(d.scale);
    group.add(mesh);
    boats.push({ mesh, ...d, angle: d.phase });
  }

  return {
    group,
    boats,
    glowMat,
    update(dt, t) {
      for (const b of boats) {
        b.angle += b.speed * dt * 0.35;
        const cx = 60 + Math.cos(b.angle) * b.r;
        const cz = -160 + Math.sin(b.angle) * b.r * 0.72;
        b.mesh.position.set(cx, b.y + Math.sin(t * 1.1 + b.phase) * 0.32, cz);
        const heading = Math.atan2(
          Math.cos(b.angle) * b.r * 0.72,
          -Math.sin(b.angle) * b.r
        );
        b.mesh.rotation.y = heading;
        b.mesh.rotation.z = Math.sin(t * 0.9 + b.phase) * 0.022;
      }
    }
  };
}

/* ------------------------------ 港口灯桩 ------------------------------ */
export function createHarbourLights() {
  const group = new THREE.Group();
  group.name = 'harbour-lights';

  const postMat = new THREE.MeshStandardMaterial({ color: 0x6d7681, roughness: 0.7, metalness: 0.35 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x2c3742,
    emissive: 0xffc98a,
    emissiveIntensity: 0.0,
    roughness: 0.45
  });

  const postGeos = [];
  const lampGeos = [];
  const positions = [];
  for (let x = -260; x <= 320; x += 72) {
    positions.push([x, -34]);
  }
  positions.push([-360, -120], [-430, -240], [420, -150], [520, -300], [-160, -420], [260, -470]);

  for (const [x, z] of positions) {
    const post = new THREE.CylinderGeometry(0.5, 0.72, 7.2, 8);
    post.translate(x, 3.6, z);
    postGeos.push(post);
    const lamp = new THREE.SphereGeometry(1.15, 10, 8);
    lamp.translate(x, 7.8, z);
    lampGeos.push(lamp);
  }

  const posts = new THREE.Mesh(mergeGeometries(postGeos, false), postMat);
  const lamps = new THREE.Mesh(mergeGeometries(lampGeos, false), lampMat);
  group.add(posts, lamps);

  return { group, lampMat };
}
