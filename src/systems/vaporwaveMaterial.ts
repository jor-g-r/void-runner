import * as THREE from "three";

// Shared time uniform so all vaporwave materials animate together
const sharedUniforms = {
  uTime: { value: 0 },
};

export function updateVaporwaveTime(time: number) {
  sharedUniforms.uTime.value = time;
}

interface VaporwaveMaterialOptions {
  baseColor: string;
  topTint?: string;      // color at the top of the ship
  bottomTint?: string;   // color at the bottom
  emissiveIntensity?: number;
  scanSpeed?: number;
  fresnelPower?: number;
}

/**
 * Creates a MeshStandardMaterial with vaporwave-style visual effects.
 * Works with InstancedMesh and preserves instance colors (hit flash).
 */
export function createVaporwaveMaterial(
  opts: VaporwaveMaterialOptions,
): THREE.MeshStandardMaterial {
  const {
    baseColor,
    topTint = "#ff33cc",
    bottomTint = "#33ddff",
    emissiveIntensity = 0.8,
    scanSpeed = 1.2,
    fresnelPower = 2.5,
  } = opts;

  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: baseColor,
    emissiveIntensity: emissiveIntensity * 0.35,
    metalness: 0.25,
    roughness: 0.55,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uTopTint = { value: new THREE.Color(topTint) };
    shader.uniforms.uBottomTint = { value: new THREE.Color(bottomTint) };
    shader.uniforms.uScanSpeed = { value: scanSpeed };
    shader.uniforms.uFresnelPower = { value: fresnelPower };

    // Inject varyings + calculate view-space normal/position
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
      #include <common>
      varying vec3 vLocalPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      `,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vLocalPos = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      `,
    );

    // Inject fragment shader effects
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      #include <common>
      uniform float uTime;
      uniform vec3 uTopTint;
      uniform vec3 uBottomTint;
      uniform float uScanSpeed;
      uniform float uFresnelPower;
      varying vec3 vLocalPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      `,
    );

    // Modify the emissive calculation to add vaporwave effects
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `
      #include <emissivemap_fragment>

      // Vertical gradient based on local Y position
      float gradientT = clamp(vLocalPos.y * 0.8 + 0.5, 0.0, 1.0);
      vec3 gradientColor = mix(uBottomTint, uTopTint, gradientT);

      // Animated scan lines moving along local Z axis (forward)
      float scanPos = vLocalPos.z * 4.0 - uTime * uScanSpeed;
      float scan = sin(scanPos * 3.14159) * 0.5 + 0.5;
      scan = pow(scan, 6.0);

      // Fresnel edge glow
      float fresnel = 1.0 - max(dot(vWorldNormal, vViewDir), 0.0);
      fresnel = pow(fresnel, uFresnelPower);

      // Accent-only emissive: scan lines + edge glow, no flat gradient wash.
      // This lets the lit diffuse color define the surface and keeps the
      // vaporwave signature (moving scan + rim) as highlights only.
      vec3 vaporEmissive = gradientColor * (scan * 0.9 + fresnel * 1.4);
      totalEmissiveRadiance = totalEmissiveRadiance * 0.4 + vaporEmissive * 0.7;
      `,
    );
  };

  // Force recompile when added
  material.needsUpdate = true;
  return material;
}
