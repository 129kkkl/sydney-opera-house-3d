import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createWaterNormalTexture } from '../textures.js';

/**
 * 水面：基于 Reflector 的实时平面反射 + 波浪扰动 + 菲涅尔 + 太阳高光。
 * 反射让建筑真正"倒映"在港湾中，参与整体构图。
 */
export function createWater(scene) {
  const geometry = new THREE.PlaneGeometry(6000, 6000, 1, 1);

  const shader = {
    name: 'HarbourWater',
    uniforms: {
      color: { value: new THREE.Color(0x25506b) },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      tNormal: { value: createWaterNormalTexture() },
      time: { value: 0 },
      sunDir: { value: new THREE.Vector3(0.4, 0.6, 0.7) },
      sunColor: { value: new THREE.Color(0xfff0d8) },
      skyColor: { value: new THREE.Color(0x89b4d8) },
      deepColor: { value: new THREE.Color(0x16374d) },
      distortion: { value: 1.0 }
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vUv = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform sampler2D tNormal;
      uniform float time;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform vec3 skyColor;
      uniform vec3 deepColor;
      uniform float distortion;
      varying vec4 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec2 p = vWorldPos.xz;

        // 双层滚动法线贴图（细波纹）
        vec3 n1 = texture2D(tNormal, p * 0.006 + vec2(time * 0.0032, time * 0.002)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(tNormal, p * 0.017 - vec2(time * 0.0045, time * 0.006)).xyz * 2.0 - 1.0;
        // 低频大涌
        float swell = sin(p.x * 0.0075 + time * 0.32) * 0.5 + sin(p.y * 0.0058 - time * 0.24) * 0.5;
        vec3 n = normalize(vec3(
          n1.x * 0.5 + n2.x * 0.34 + swell * 0.016,
          1.0,
          n1.y * 0.5 + n2.y * 0.34 + swell * 0.014
        ));

        // 反射采样：用波浪法线轻微扰动投影坐标
        vec4 uv = vUv;
        uv.xy += n.xz * 0.022 * distortion * uv.w;
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.6);
        fres = mix(0.12, 0.92, fres);

        vec3 base = mix(deepColor, color, 0.55 + 0.22 * swell);
        vec3 col = mix(base, refl, clamp(fres * 1.05, 0.0, 0.88));

        // 太阳高光（波光）
        vec3 h = normalize(normalize(sunDir) + viewDir);
        float spec = pow(max(dot(n, h), 0.0), 420.0);
        float sparkle = pow(max(dot(n, h), 0.0), 64.0);
        col += sunColor * (spec * 1.9 + sparkle * 0.16);

        // 远处融入天色，避免生硬的水平线
        float dist = length(cameraPosition - vWorldPos);
        float haze = smoothstep(520.0, 2600.0, dist);
        col = mix(col, skyColor, haze * 0.94);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  };

  const water = new Reflector(geometry, {
    clipBias: 0.0025,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x4c7fa0,
    shader
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.name = 'harbour-water';

  return {
    mesh: water,
    uniforms: water.material.uniforms,
    setTime(t) {
      water.material.uniforms.time.value = t;
    }
  };
}
