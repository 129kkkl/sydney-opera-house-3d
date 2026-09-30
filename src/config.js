/**
 * 场景总体配置：尺度单位为米。
 * 以悉尼歌剧院真实尺度为参考（壳体最高点约 67m，基座长约 185m）。
 */
import * as THREE from 'three';

// ---------------- 基本尺度 ----------------
export const WATER_Y = 0; // 海平面
export const PODIUM_TOP_Y = 15.5; // 基座顶部平台
export const PODIUM_FRONT_Z = 26; // 基座临港立面（从水面升起）
export const PODIUM_BACK_Z = 176;
export const PODIUM_WEST_X = -116;
export const PODIUM_EAST_X = 118;

// 建筑轴线沿 X 轴；水面位于 -Z 一侧（默认镜头自水面向建筑观看）
export const FWD = new THREE.Vector2(0, -1);

// ---------------- 颜色 ----------------
export const COLORS = {
  shell: 0xf2efe8,
  podium: 0xb4a99c,
  podiumDark: 0x8b8073,
  glass: 0x1b2833,
  frame: 0x2f3d4c,
  concrete: 0xc7c1b7,
  promenade: 0xb9b1a5
};

// ---------------- 壳体分组 ----------------
/**
 * 三组壳体沿 X 轴排布（音乐厅 → 歌剧厅 → 餐厅），体量依次减小，
 * 统一朝水面倾斜，形成悉尼歌剧院标志性的"帆群"序列。
 */
export const SHELL_CLUSTERS = [
  {
    id: 'concert-hall',
    name: '音乐厅壳体',
    nameEn: 'CONCERT HALL',
    centerX: -72,
    centerZ: 52,
    bodyTopY: PODIUM_TOP_Y + 9.5,
    bodyDepth: 76,
    bodyWidth: 100,
    shells: [
      { width: 72, height: 42, lean: 8, baseSag: 8, tipX: -2, bulge: 12, dx: -13, dz: 0 },
      { width: 60, height: 34, lean: 7, baseSag: 6.5, tipX: 2, bulge: 10, dx: 21, dz: -3 }
    ]
  },
  {
    id: 'theatre',
    name: '歌剧厅壳体',
    nameEn: 'OPERA THEATRE',
    centerX: 26,
    centerZ: 50,
    bodyTopY: PODIUM_TOP_Y + 8.5,
    bodyDepth: 68,
    bodyWidth: 90,
    shells: [
      { width: 62, height: 35, lean: 7.5, baseSag: 7, tipX: -2, bulge: 10, dx: -10, dz: 0 },
      { width: 52, height: 27.5, lean: 6, baseSag: 6, tipX: 2, bulge: 8.5, dx: 19, dz: -3 }
    ]
  },
  {
    id: 'restaurant',
    name: '餐厅壳体',
    nameEn: 'BENNELONG',
    centerX: 92,
    centerZ: 46,
    bodyTopY: PODIUM_TOP_Y + 5.5,
    bodyDepth: 54,
    bodyWidth: 64,
    shells: [
      { width: 40, height: 19, lean: 4.5, baseSag: 4.5, tipX: -1, bulge: 6, dx: -5, dz: 0 },
      { width: 32, height: 14, lean: 3.5, baseSag: 3.8, tipX: 1, bulge: 5, dx: 12, dz: -2.5 }
    ]
  }
];

// ---------------- 大台阶（向水面展开） ----------------
export const STEPS = {
  xMin: PODIUM_WEST_X,
  xMax: -22,
  zFront: -12,
  zBack: PODIUM_FRONT_Z,
  topY: PODIUM_TOP_Y,
  landingY: 2.8,
  landingDepth: 16
};

// ---------------- 视角 ----------------
export const VIEW_PRESETS = {
  default: {
    position: [198, 60, -162],
    target: [2, 32, 42],
    fov: 42
  },
  front: {
    position: [-6, 52, -252],
    target: [0, 34, 40],
    fov: 44
  },
  side: {
    position: [-286, 62, -128],
    target: [-6, 34, 46],
    fov: 42
  },
  high: {
    position: [188, 218, -176],
    target: [0, 26, 46],
    fov: 46
  },
  water: {
    position: [128, 12, -172],
    target: [-24, 36, 42],
    fov: 48
  },
  steps: {
    position: [-152, 34, -104],
    target: [-72, 22, 26],
    fov: 46
  },
  top: {
    position: [96, 320, -84],
    target: [0, 10, 56],
    fov: 50
  },
  night: {
    position: [214, 66, -196],
    target: [4, 32, 38],
    fov: 42
  }
};
