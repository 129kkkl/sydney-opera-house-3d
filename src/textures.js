import * as THREE from 'three';

/**
 * 程序化纹理：全部用 Canvas 生成，避免外部资源依赖。
 */

function makeCanvas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function toTexture(canvas, repeat = [1, 1], srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 壳体瓷砖：细密的菱格 / 杩片拼接，带轻微色差 */
export function createShellTileTexture() {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f4ee';
  ctx.fillRect(0, 0, size, size);

  const cols = 16;
  const rows = 22;
  const w = size / cols;
  const h = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const off = (y % 2) * 0.5 * w;
      const tone = 236 + Math.floor(Math.random() * 14);
      ctx.fillStyle = `rgb(${tone + 3}, ${tone + 2}, ${tone - 3})`;
      ctx.fillRect(x * w + off + 0.7, y * h + 0.7, w - 1.4, h - 1.4);
    }
  }
  // 拼缝
  ctx.strokeStyle = 'rgba(150,146,136,0.35)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * h);
    ctx.lineTo(size, y * h);
    ctx.stroke();
  }
  const tex = toTexture(canvas, [5, 7]);
  return tex;
}

/** 壳体粗糙度贴图（与瓷砖对应） */
export function createShellRoughTexture() {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b8b8b8';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const g = 150 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  return toTexture(canvas, [5, 7], false);
}

/** 基座花岗岩：横向分缝 + 细微颗粒 */
export function createGraniteTexture() {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b3a99c';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const t = Math.random();
    const c = t > 0.5 ? 255 : 60;
    ctx.fillStyle = `rgba(${c},${c - 8},${c - 18},${0.05 + Math.random() * 0.09})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  // 石板分缝
  ctx.strokeStyle = 'rgba(84,76,68,0.5)';
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = 0; x < size; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  return toTexture(canvas, [4, 2]);
}

/** 混凝土 / 步道铺装 */
export function createConcreteTexture(tone = '#c6c0b6', joints = 96) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tone;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3600; i++) {
    const g = Math.random() > 0.5 ? 255 : 40;
    ctx.fillStyle = `rgba(${g},${g},${g},0.05)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 4, 4);
  }
  ctx.strokeStyle = 'rgba(96,90,82,0.35)';
  ctx.lineWidth = 1.6;
  for (let y = 0; y <= size; y += joints) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(y, 0);
    ctx.lineTo(y, size);
    ctx.stroke();
  }
  return toTexture(canvas, [8, 8]);
}

/** 水波法线贴图（柔和的程序化波纹） */
export function createWaterNormalTexture() {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n1 = Math.sin(x * 0.075 + Math.sin(y * 0.05) * 1.8);
      const n2 = Math.sin(y * 0.088 + Math.cos(x * 0.04) * 1.6);
      const n3 = Math.sin((x + y) * 0.032);
      const nx = n1 * 0.16 + n3 * 0.11;
      const ny = n2 * 0.16 + n3 * 0.11;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(canvas, [18, 18], false);
  return tex;
}
