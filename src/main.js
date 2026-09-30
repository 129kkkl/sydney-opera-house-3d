import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { VIEW_PRESETS } from './config.js';
import { createBuildingMaterials, createOperaHouse } from './building/operaHouse.js';
import { createSky, computeTimeState } from './environment/sky.js';
import { createWater } from './environment/water.js';
import {
  createTerrain,
  createTrees,
  createSkyline,
  createHarbourBridge,
  createBoats,
  createHarbourLights
} from './environment/surroundings.js';
import { createLights } from './lighting/lights.js';

/* ============================================================
 * 渲染器 / 场景 / 相机
 * ============================================================ */
const container = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbcd4e8, 0.00042);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.6, 6000);
camera.position.set(...VIEW_PRESETS.default.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...VIEW_PRESETS.default.target);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 60;
controls.maxDistance = 1400;
controls.minPolarAngle = 0.06;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.32;
controls.screenSpacePanning = false;
controls.zoomToCursor = true;

/* ============================================================
 * 场景内容
 * ============================================================ */
const sky = createSky();
scene.add(sky.mesh);

const water = createWater(scene);
scene.add(water.mesh);

const terrain = createTerrain();
scene.add(terrain);
scene.add(createTrees(110));

const skyline = createSkyline();
scene.add(skyline.group);
scene.add(createHarbourBridge());

const boats = createBoats();
scene.add(boats.group);

const harbourLights = createHarbourLights();
scene.add(harbourLights.group);

const mats = createBuildingMaterials();
const opera = createOperaHouse(mats);
scene.add(opera.root);

const lights = createLights(scene);

/* ============================================================
 * 建筑信息标注
 * ============================================================ */
const labelObjects = [];
for (const anchor of opera.anchors) {
  const el = document.createElement('div');
  el.className = 'label-3d';
  el.innerHTML = `<div class="tag">${anchor.text}</div><div class="dot"></div>`;
  const obj = new CSS2DObject(el);
  obj.position.copy(anchor.position);
  obj.visible = false;
  scene.add(obj);
  labelObjects.push(obj);
}

/* ============================================================
 * 时间 / 环境
 * ============================================================ */
let timeOfDay = 15.5;
let timeState = computeTimeState(timeOfDay);

const _envCanvas = document.createElement('canvas');
_envCanvas.width = 256;
_envCanvas.height = 128;
const _envCtx = _envCanvas.getContext('2d');
let _envTexture = null;
let _pmrem = null;

function updateEnvironmentMap() {
  if (!_pmrem) _pmrem = new THREE.PMREMGenerator(renderer);
  const g = _envCtx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, `#${timeState.skyTop.getHexString()}`);
  g.addColorStop(0.52, `#${timeState.skyHorizon.getHexString()}`);
  g.addColorStop(1, `#${timeState.skyHorizon.clone().multiplyScalar(0.62).getHexString()}`);
  _envCtx.fillStyle = g;
  _envCtx.fillRect(0, 0, 256, 128);
  // 太阳位置
  const sunU = Math.atan2(timeState.sunDir.z, timeState.sunDir.x) / (Math.PI * 2) + 0.5;
  const sunV = 0.5 - Math.asin(THREE.MathUtils.clamp(timeState.sunDir.y, -1, 1)) / Math.PI;
  const rg = _envCtx.createRadialGradient(sunU * 256, sunV * 128, 2, sunU * 256, sunV * 128, 46);
  const sunHex = `#${timeState.sunColor.getHexString()}`;
  rg.addColorStop(0, sunHex);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  _envCtx.fillStyle = rg;
  _envCtx.fillRect(0, 0, 256, 128);

  if (_envTexture) _envTexture.dispose();
  _envTexture = new THREE.CanvasTexture(_envCanvas);
  _envTexture.mapping = THREE.EquirectangularReflectionMapping;
  _envTexture.colorSpace = THREE.SRGBColorSpace;

  const rt = _pmrem.fromEquirectangular(_envTexture);
  scene.environment = rt.texture;
}

let _lastEnvUpdate = 0;
function applyTimeState(force = false) {
  timeState = computeTimeState(timeOfDay);

  // 天空
  sky.uniforms.topColor.value.copy(timeState.skyTop);
  sky.uniforms.horizonColor.value.copy(timeState.skyHorizon);
  sky.uniforms.bottomColor.value.copy(timeState.skyBottom);
  sky.uniforms.sunDir.value.copy(timeState.sunDir);
  sky.uniforms.sunColor.value.copy(timeState.sunColor);
  sky.uniforms.sunIntensity.value = timeState.sunIntensity;
  sky.uniforms.nightFactor.value = timeState.night;
  sky.uniforms.hazeFactor.value = 0.32 + timeState.golden * 0.55;

  // 雾
  scene.fog.color.copy(timeState.skyHorizon).lerp(timeState.skyTop, 0.22);

  // 水面
  water.uniforms.sunDir.value.copy(timeState.sunDir);
  water.uniforms.sunColor.value.copy(timeState.sunColor);
  water.uniforms.skyColor.value.copy(timeState.skyHorizon);
  water.uniforms.deepColor.value
    .set(0x16374d)
    .lerp(new THREE.Color(0x08202f), timeState.night)
    .lerp(new THREE.Color(0x2b4c62), timeState.golden * 0.5);
  water.uniforms.color.value
    .set(0x2c5e7c)
    .lerp(new THREE.Color(0x0c2536), timeState.night)
    .lerp(new THREE.Color(0x6b5544), timeState.golden * 0.42);

  // 光照
  lights.update(timeState);

  // 夜间亮化
  const night = timeState.night;
  mats.glass.emissiveIntensity = night * 0.85;
  mats.glassDark.emissiveIntensity = night * 1.0;
  skyline.windowMat.emissiveIntensity = night * 1.25;
  skyline.mat.emissiveIntensity = night * 0.18;
  harbourLights.lampMat.emissiveIntensity = night * 2.2;
  boats.glowMat.emissiveIntensity = night * 0.9;

  // 反射环境
  const now = performance.now();
  if (force || now - _lastEnvUpdate > 220) {
    _lastEnvUpdate = now;
    updateEnvironmentMap();
  }
}

/* ============================================================
 * 相机预设 / 补间
 * ============================================================ */
const tween = {
  active: false,
  t: 0,
  duration: 1.7,
  fromPos: new THREE.Vector3(),
  toPos: new THREE.Vector3(),
  fromTarget: new THREE.Vector3(),
  toTarget: new THREE.Vector3(),
  fromFov: 42,
  toFov: 42
};

function flyTo(viewName, duration = 1.7) {
  const preset = VIEW_PRESETS[viewName];
  if (!preset) return;
  tween.active = true;
  tween.t = 0;
  tween.duration = duration;
  tween.fromPos.copy(camera.position);
  tween.toPos.set(...preset.position);
  tween.fromTarget.copy(controls.target);
  tween.toTarget.set(...preset.target);
  tween.fromFov = camera.fov;
  tween.toFov = preset.fov ?? 42;
  controls.enabled = false;
}

function updateTween(dt) {
  if (!tween.active) return;
  tween.t = Math.min(1, tween.t + dt / tween.duration);
  const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - Math.pow(-2 * tween.t + 2, 3) / 2;
  camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
  controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
  camera.fov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, e);
  camera.updateProjectionMatrix();
  if (tween.t >= 1) {
    tween.active = false;
    controls.enabled = true;
    controls.update();
  }
}

/* ============================================================
 * UI
 * ============================================================ */
const ui = {
  rotate: false,
  tour: false,
  labels: false,
  water: true
};

let tourTimer = 0;
let tourIndex = 0;
const TOUR_ORDER = ['default', 'side', 'water', 'high', 'front', 'steps', 'top', 'night'];

function setToggle(el, on) {
  el.classList.toggle('on', on);
}

document.querySelectorAll('#view-buttons button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    if (view === 'night') {
      timeOfDay = 20.6;
      const slider = document.getElementById('time-slider');
      slider.value = String(timeOfDay);
      updateTimeLabel();
      applyTimeState(true);
    }
    flyTo(view);
    ui.tour = false;
    setToggle(document.getElementById('toggle-tour'), false);
  });
});

document.querySelectorAll('[data-view="default"].wide').forEach((btn) => {
  btn.addEventListener('click', () => flyTo('default'));
});

function updateTimeLabel() {
  const h = Math.floor(timeOfDay);
  const m = Math.floor((timeOfDay - h) * 60);
  document.getElementById('time-value').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const timeSlider = document.getElementById('time-slider');
timeSlider.addEventListener('input', (e) => {
  timeOfDay = parseFloat(e.target.value);
  updateTimeLabel();
  applyTimeState();
});

document.getElementById('toggle-rotate').addEventListener('click', (e) => {
  ui.rotate = !ui.rotate;
  controls.autoRotate = ui.rotate;
  setToggle(e.currentTarget, ui.rotate);
});

document.getElementById('toggle-tour').addEventListener('click', (e) => {
  ui.tour = !ui.tour;
  tourTimer = 0;
  tourIndex = 0;
  if (ui.tour) {
    ui.rotate = false;
    controls.autoRotate = false;
    setToggle(document.getElementById('toggle-rotate'), false);
    flyTo(TOUR_ORDER[0], 2.0);
  }
  setToggle(e.currentTarget, ui.tour);
});

document.getElementById('toggle-labels').addEventListener('click', (e) => {
  ui.labels = !ui.labels;
  for (const l of labelObjects) l.visible = ui.labels;
  setToggle(e.currentTarget, ui.labels);
});

document.getElementById('toggle-water').addEventListener('click', (e) => {
  ui.water = !ui.water;
  water.mesh.visible = ui.water;
  setToggle(e.currentTarget, ui.water);
});

document.getElementById('panel-toggle').addEventListener('click', () => {
  document.getElementById('panel').classList.toggle('collapsed');
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    flyTo('default');
  } else if (e.key === ' ') {
    e.preventDefault();
    document.getElementById('toggle-rotate').click();
  } else if (e.key >= '1' && e.key <= '8') {
    const idx = parseInt(e.key, 10) - 1;
    const name = Object.keys(VIEW_PRESETS)[idx];
    if (name) flyTo(name);
  }
});

/* ============================================================
 * 自适应
 * ============================================================ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
 * 主循环
 * ============================================================ */
const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  updateTween(dt);

  if (ui.water) water.setTime(elapsed);

  boats.update(dt, elapsed);

  if (ui.tour && !tween.active) {
    tourTimer += dt;
    if (tourTimer > 11) {
      tourTimer = 0;
      tourIndex = (tourIndex + 1) % TOUR_ORDER.length;
      const next = TOUR_ORDER[tourIndex];
      if (next === 'night') {
        timeOfDay = 20.6;
        timeSlider.value = String(timeOfDay);
        updateTimeLabel();
        applyTimeState(true);
      } else if (timeOfDay < 6.5 || timeOfDay > 19.5) {
        timeOfDay = 15.5;
        timeSlider.value = String(timeOfDay);
        updateTimeLabel();
        applyTimeState(true);
      }
      flyTo(next, 2.4);
    }
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// 首帧后隐藏加载页
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    setTimeout(() => document.getElementById('loader').classList.add('hidden'), 350);
  });
});

applyTimeState(true);
animate();
