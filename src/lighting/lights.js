import * as THREE from 'three';

/**
 * 光照系统：太阳（带阴影）+ 半球环境光 + 夜间建筑亮化。
 */
export function createLights(scene) {
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  const S = 240;
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.55;
  sun.position.set(180, 220, -160);
  sun.target.position.set(0, 20, 40);
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xbcd8f2, 0x4b5560, 0.85);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x93a8bd, 0.28);
  scene.add(ambient);

  // 夜间：壳体洗墙灯 + 港湾泛光
  const uplights = [];
  const uplightDefs = [
    { x: -96, z: 20, tx: -84, ty: 52, tz: 40, color: 0xffd9ac, intensity: 0 },
    { x: -34, z: 18, tx: -30, ty: 48, tz: 40, color: 0xffd9ac, intensity: 0 },
    { x: 26, z: 18, tx: 18, ty: 46, tz: 40, color: 0xffd2a2, intensity: 0 },
    { x: 92, z: 16, tx: 88, ty: 36, tz: 38, color: 0xffd2a2, intensity: 0 },
    { x: -140, z: -20, tx: -70, ty: 30, tz: 30, color: 0xffc98a, intensity: 0 }
  ];
  for (const d of uplightDefs) {
    const light = new THREE.SpotLight(d.color, 0, 260, 0.62, 0.55, 1.1);
    light.position.set(d.x, 2, d.z);
    light.target.position.set(d.tx, d.ty, d.tz);
    light.castShadow = false;
    scene.add(light, light.target);
    uplights.push(light);
  }

  const fill = new THREE.DirectionalLight(0x2b4a72, 0.0);
  fill.position.set(-160, 120, -220);
  scene.add(fill);

  return {
    sun,
    hemi,
    ambient,
    uplights,
    fill,
    /** 依据时间状态更新 */
    update(state) {
      const dir = state.sunDir;
      sun.position.copy(dir).multiplyScalar(360).add(new THREE.Vector3(0, 60, 40));
      sun.target.position.set(0, 24, 46);
      sun.color.copy(state.sunColor);
      sun.intensity = 2.75 * state.sunIntensity;

      hemi.intensity = 0.28 + state.ambientIntensity * 0.95;
      hemi.color.copy(state.skyHorizon).lerp(new THREE.Color(0xffffff), 0.25);
      hemi.groundColor.copy(state.skyHorizon).multiplyScalar(0.55);

      ambient.intensity = 0.16 + state.ambientIntensity * 0.32;
      ambient.color.copy(state.skyTop).lerp(new THREE.Color(0xbfd3e6), 0.4);

      const night = state.night;
      for (const l of uplights) l.intensity = night * 1300;
      fill.intensity = night * 0.35;
    }
  };
}
