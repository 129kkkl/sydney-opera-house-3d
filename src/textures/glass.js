import * as THREE from 'three';

/**
 * 幕墙玻璃纹理：竖挺 + 横档 + 深色玻璃分格
 */
export function createGlassFacadeTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#6d90b2');
  g.addColorStop(0.55, '#4d6f92');
  g.addColorStop(1, '#3a5876');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // 玻璃轻微反光差异
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${120 + Math.random() * 100},${150 + Math.random() * 90},${180 + Math.random() * 70},${0.03 + Math.random() * 0.07})`;
    const x = Math.random() * size;
    ctx.fillRect(x, Math.random() * size, 20 + Math.random() * 70, 8 + Math.random() * 40);
  }

  // 竖挺（竖向金属肋）
  const cols = 10;
  ctx.fillStyle = '#39485a';
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * size;
    ctx.fillRect(x - 2.5, 0, 5, size);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x - 2.5, 0, 1.6, size);
    ctx.fillStyle = '#39485a';
  }
  // 横档
  const rows = 7;
  for (let i = 0; i <= rows; i++) {
    const y = (i / rows) * size;
    ctx.fillStyle = '#2f3d4c';
    ctx.fillRect(0, y - 2, size, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, y - 2, size, 1.3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** 夜晚窗内暖光贴图（与幕墙分格对应） */
export function createGlassGlowTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  const cols = 10;
  const rows = 7;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const bright = Math.random();
      const w = size / cols;
      const h = size / rows;
      const grd = ctx.createLinearGradient(0, y * h, 0, (y + 1) * h);
      const v = Math.floor(120 + bright * 135);
      grd.addColorStop(0, `rgb(${v},${Math.floor(v * 0.72)},${Math.floor(v * 0.42)})`);
      grd.addColorStop(1, `rgb(${Math.floor(v * 0.35)},${Math.floor(v * 0.25)},${Math.floor(v * 0.14)})`);
      ctx.fillStyle = grd;
      ctx.fillRect(x * w + 4, y * h + 4, w - 8, h - 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
