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
  topTint?: string; // color at the top of the ship
  bottomTint?: string; // color at the bottom
  // Normal-driven "facet" tints. When all three are provided the emissive
  // switches from the vertical gradient to a matcap-style mix where each
  // face glows by its world-space normal — gives low-poly meshes an
  // interdimensional, multi-color look.
  facetTintX?: string;
  facetTintY?: string;
  facetTintZ?: string;
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
    facetTintX,
    facetTintY,
    facetTintZ,
    emissiveIntensity = 0.8,
    scanSpeed = 1.2,
    fresnelPower = 2.5,
  } = opts;

  const facetMode = Boolean(facetTintX && facetTintY && facetTintZ);

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
    shader.uniforms.uFacetX = {
      value: new THREE.Color(facetTintX ?? "#ffffff"),
    };
    shader.uniforms.uFacetY = {
      value: new THREE.Color(facetTintY ?? "#ffffff"),
    };
    shader.uniforms.uFacetZ = {
      value: new THREE.Color(facetTintZ ?? "#ffffff"),
    };
    if (facetMode) shader.defines = { ...shader.defines, VAPOR_FACET: "" };

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
      uniform vec3 uFacetX;
      uniform vec3 uFacetY;
      uniform vec3 uFacetZ;
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

      // Animated scan lines moving along local Z axis (forward)
      float scanPos = vLocalPos.z * 4.0 - uTime * uScanSpeed;
      float scan = sin(scanPos * 3.14159) * 0.5 + 0.5;
      scan = pow(scan, 6.0);

      // Fresnel edge glow
      float fresnel = 1.0 - max(dot(vWorldNormal, vViewDir), 0.0);
      fresnel = pow(fresnel, uFresnelPower);

      #ifdef VAPOR_FACET
      // Normal-driven matcap-style color: weights by signed normal remapped
      // to [0,1], then normalizes so the result stays at tint brightness.
      // Using signed weights (not abs) means faces pointing +Y (top) read
      // different from -Y (bottom), giving the top→bottom color gradient
      // of the reference matcap look. Diffuse is expected near-black so
      // emissive fully drives the surface.
      vec3 nRGB = vWorldNormal * 0.5 + 0.5;
      float wSum = nRGB.x + nRGB.y + nRGB.z + 0.0001;
      vec3 facetColor =
        (uFacetX * nRGB.x + uFacetY * nRGB.y + uFacetZ * nRGB.z) / wSum;
      // Chrome specular: sharp white hotspot where the surface faces camera
      // directly — complements the rim fresnel (opposite direction) to give
      // surfaces a polished-metal read without washing saturated tints.
      float chrome = pow(max(0.0, dot(vWorldNormal, vViewDir)), 8.0);
      vec3 vaporEmissive =
        facetColor * (0.8 + scan * 0.25 + fresnel * 0.4) + chrome * 0.45;
      totalEmissiveRadiance = vaporEmissive;
      #else
      // Vertical gradient + scan/rim accents. Keeps the lit diffuse dominant
      // and uses emissive as highlights only.
      float gradientT = clamp(vLocalPos.y * 0.8 + 0.5, 0.0, 1.0);
      vec3 gradientColor = mix(uBottomTint, uTopTint, gradientT);
      vec3 vaporEmissive = gradientColor * (scan * 0.9 + fresnel * 1.4);
      totalEmissiveRadiance = totalEmissiveRadiance * 0.4 + vaporEmissive * 0.7;
      #endif
      `,
    );
  };

  // Force recompile when added
  material.needsUpdate = true;
  return material;
}
