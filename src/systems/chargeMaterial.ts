import * as THREE from "three";

const vertexShader = `
  varying vec3 vSphereDirection;

  void main() {
    vSphereDirection = normalize(position);
    vec4 transformed = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      transformed = instanceMatrix * transformed;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * transformed;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uCharge;
  varying vec3 vSphereDirection;

  void main() {
    float radial = length(vSphereDirection.xy);
    float fill = exp(-radial * radial * 2.0);
    float core = exp(-radial * radial * 13.0);
    float innerRingOffset = (radial - (0.38 + uCharge * 0.05)) * 18.0;
    float outerRingOffset = (radial - 0.78) * 15.0;
    float innerRing = exp(-innerRingOffset * innerRingOffset);
    float outerRing = exp(-outerRingOffset * outerRingOffset);
    float flicker = 0.92 + sin(uTime * 15.0) * 0.05 + sin(uTime * 27.0) * 0.03;
    float chargeBrightness = mix(0.48, 1.0, uCharge);

    vec3 blue = vec3(0.0, 0.5, 0.72);
    vec3 cyan = vec3(0.0, 0.9, 1.0);
    vec3 body = mix(blue, cyan, fill * 0.72);
    vec3 color = mix(body, vec3(0.72, 1.0, 1.0), core);
    color += vec3(0.0, 0.72, 0.96) * innerRing * 0.35;
    color += vec3(0.0, 0.82, 1.0) * outerRing * 0.2;

    float alpha = 0.3 + fill * 0.48 + core * 0.18 + innerRing * 0.08 + outerRing * 0.06;
    alpha = clamp(alpha * flicker * chargeBrightness, 0.0, 0.96);
    gl_FragColor = vec4(color * flicker * chargeBrightness, alpha);
  }
`;

export const createChargeMaterial = (depthTest = true) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCharge: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

export const updateChargeMaterial = (
  material: THREE.ShaderMaterial,
  elapsedTime: number,
  chargeLevel: number,
) => {
  material.uniforms.uTime.value = elapsedTime;
  material.uniforms.uCharge.value = chargeLevel;
};
