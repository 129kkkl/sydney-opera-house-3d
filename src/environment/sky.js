import * as THREE from 'three';

/**
 * 天空：渐变穹顶 + 太阳光晕 + 夜晚星空，随时间变化。
 */
export function createSky() {
  const uniforms = {
    topColor: { value: new THREE.Color(0x2a6bb5) },
    horizonColor: { value: new THREE.Color(0xbfd9ee) },
    bottomColor: { value: new THREE.Color(0x8fb4d6) },
    sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.75) },
    sunColor: { value: new THREE.Color(0xfff2d8) },
    sunIntensity: { value: 1.0 },
    nightFactor: { value: 0.0 },
    hazeFactor: { value: 0.4 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(wp.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform float sunIntensity;
      uniform float nightFactor;
      uniform float hazeFactor;
      varying vec3 vWorldDir;

      // 简单 hash 星空
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        float t = pow(clamp(dir.y, 0.0, 1.0), 0.62);
        vec3 sky = mix(horizonColor, topColor, t);
        sky = mix(bottomColor, sky, smoothstep(0.42, 0.56, h));

        // 地平线雾霭
        float horizonGlow = pow(1.0 - abs(dir.y), 8.0) * hazeFactor;
        sky += horizonColor * horizonGlow * 0.6;

        // 太阳
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        float disc = smoothstep(0.9994, 0.99975, sd);
        float glow = pow(sd, 260.0) * 0.6 + pow(sd, 24.0) * 0.22 + pow(sd, 6.0) * 0.06;
        sky += sunColor * (glow * sunIntensity) * 1.15;
        sky += sunColor * disc * sunIntensity * 2.2;

        // 星空（夜晚）：cell 内圆点 + 轻微闪烁
        if (nightFactor > 0.01 && dir.y > 0.0) {
          vec3 sp = dir * 190.0;
          vec3 cell = floor(sp);
          vec3 f = fract(sp) - 0.5;
          float star = hash(cell);
          float d = length(f);
          float twinkle = 0.55 + 0.45 * hash(cell + 3.1);
          float starMask = smoothstep(0.978, 0.9995, star)
                         * smoothstep(0.32, 0.0, d)
                         * smoothstep(0.02, 0.18, dir.y);
          sky += vec3(0.86, 0.9, 1.0) * starMask * twinkle * nightFactor * 1.5;
        }

        gl_FragColor = vec4(sky, 1.0);
        #include <colorspace_fragment>
      }
    `
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 32), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;

  return { mesh, uniforms };
}

/**
 * 时间系统：把 5:00–24:00 映射为太阳方位 / 高度、天空与光照参数。
 */
export function computeTimeState(hours) {
  const h = Math.max(5, Math.min(24, hours));

  // 白天进度（6:00 日出，18:40 日落）
  const dayT = THREE.MathUtils.clamp((h - 6) / (18.7 - 6), 0, 1);
  const sunElevation = THREE.MathUtils.degToRad(
    THREE.MathUtils.lerp(-6, 62, Math.sin(Math.PI * dayT) ** 0.85)
  );

  // 太阳方位：东 → 北 → 西
  const azimuth = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(52, 232, dayT));

  const sunDir = new THREE.Vector3(
    Math.cos(sunElevation) * Math.cos(azimuth),
    Math.sin(sunElevation),
    Math.cos(sunElevation) * Math.sin(azimuth)
  ).normalize();

  const sunAbove = THREE.MathUtils.clamp(sunDir.y * 3.2, 0, 1);
  const golden = Math.pow(1 - THREE.MathUtils.clamp(sunDir.y * 2.4, 0, 1), 2.2) * sunAbove;

  // 夜晚系数
  const night = THREE.MathUtils.clamp((0.06 - sunDir.y) / 0.16, 0, 1);

  const dayTop = new THREE.Color(0x2f74c4);
  const dayHorizon = new THREE.Color(0xcfe2f2);
  const sunsetTop = new THREE.Color(0x2b4a86);
  const sunsetHorizon = new THREE.Color(0xffb271);
  const nightTop = new THREE.Color(0x061223);
  const nightHorizon = new THREE.Color(0x18314c);

  const top = dayTop.clone().lerp(sunsetTop, golden).lerp(nightTop, night);
  const horizon = dayHorizon.clone().lerp(sunsetHorizon, golden).lerp(nightHorizon, night);
  const bottom = horizon.clone().multiplyScalar(0.82);

  const sunColor = new THREE.Color(0xfff4e2).lerp(new THREE.Color(0xff9b52), golden);

  return {
    hours: h,
    sunDir,
    sunColor,
    sunIntensity: THREE.MathUtils.clamp(1.25 * sunAbove + 0.12, 0, 1.35) * (1 - night * 0.92),
    skyTop: top,
    skyHorizon: horizon,
    skyBottom: bottom,
    golden,
    night,
    ambientIntensity: THREE.MathUtils.lerp(0.62, 0.12, night) * THREE.MathUtils.lerp(0.55, 1, sunAbove),
    moonFill: night
  };
}
