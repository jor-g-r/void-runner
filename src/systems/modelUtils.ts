import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Normalizes a geometry so its largest dimension matches targetSize,
 * centers it at origin, and auto-aligns the longest axis with +Z
 * (so ships point toward the camera).
 */
export function normalizeGeometry(
  geometry: THREE.BufferGeometry,
  targetSize: number,
): THREE.BufferGeometry {
  const cloned = geometry.clone();
  cloned.computeBoundingBox();
  const bbox = cloned.boundingBox!;

  const size = new THREE.Vector3();
  bbox.getSize(size);
  const center = new THREE.Vector3();
  bbox.getCenter(center);

  // Center at origin
  cloned.translate(-center.x, -center.y, -center.z);

  // Find which axis is the longest — that's the ship's "forward" axis
  const longestAxis =
    size.x >= size.y && size.x >= size.z ? "x" :
    size.y >= size.z ? "y" : "z";

  // Rotate so the longest axis aligns with +Z (the "nose toward camera" axis)
  const rot = new THREE.Matrix4();
  if (longestAxis === "x") {
    // +X → +Z: rotate -90° around Y
    rot.makeRotationY(-Math.PI / 2);
  } else if (longestAxis === "y") {
    // +Y → +Z: rotate +90° around X
    rot.makeRotationX(Math.PI / 2);
  }
  // If z is already longest, no rotation needed
  if (longestAxis !== "z") {
    cloned.applyMatrix4(rot);
  }

  // Recompute bounds after rotation and scale
  cloned.computeBoundingBox();
  const newSize = new THREE.Vector3();
  cloned.boundingBox!.getSize(newSize);
  const maxDim = Math.max(newSize.x, newSize.y, newSize.z);
  const scale = targetSize / maxDim;
  cloned.scale(scale, scale, scale);

  return cloned;
}

/**
 * Extracts a mesh geometry matching a name pattern, with world transforms baked in.
 * This is critical for GLTFs where parent nodes have transforms (scale, translation)
 * that need to be applied to the geometry.
 */
export function findGeometryByName(
  scene: THREE.Object3D,
  namePattern: string,
): THREE.BufferGeometry | null {
  let foundMesh: THREE.Mesh | null = null;
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!foundMesh && (child as THREE.Mesh).isMesh && child.name.includes(namePattern)) {
      foundMesh = child as THREE.Mesh;
    }
  });
  if (!foundMesh) return null;

  // Clone geometry and bake world transforms
  const mesh = foundMesh as THREE.Mesh;
  const baked = mesh.geometry.clone();
  baked.applyMatrix4(mesh.matrixWorld);
  return baked;
}

/**
 * Extracts all meshes under a named group and returns a cloned group
 * with world transforms baked in and re-centered/scaled to targetSize.
 */
export function extractGroupByName(
  scene: THREE.Object3D,
  groupName: string,
  targetSize: number,
): THREE.Group | null {
  scene.updateMatrixWorld(true);
  let groupNode: THREE.Object3D | null = null;
  scene.traverse((child) => {
    if (!groupNode && child.name.includes(groupName)) {
      groupNode = child;
    }
  });
  if (!groupNode) return null;

  // Collect all meshes under the group with baked world transforms
  const meshes: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  (groupNode as THREE.Object3D).traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geo = m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);
      meshes.push({
        geometry: geo,
        material: Array.isArray(m.material) ? m.material[0] : m.material,
      });
    }
  });

  if (meshes.length === 0) return null;

  // Compute combined bounding box
  const combinedBox = new THREE.Box3();
  for (const { geometry } of meshes) {
    geometry.computeBoundingBox();
    combinedBox.union(geometry.boundingBox!);
  }
  const size = new THREE.Vector3();
  combinedBox.getSize(size);
  const center = new THREE.Vector3();
  combinedBox.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDim;

  // Translate and scale each geometry, then build the group
  const group = new THREE.Group();
  for (const { geometry, material } of meshes) {
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }
  return group;
}

/**
 * Extracts ALL meshes from a scene as a single combined group,
 * with world transforms baked, re-centered, normalized, and aligned
 * so the longest axis points along +Z.
 */
export function extractEntireScene(
  scene: THREE.Object3D,
  targetSize: number,
): THREE.Group | null {
  scene.updateMatrixWorld(true);

  const meshes: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geo = m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);
      meshes.push({
        geometry: geo,
        material: Array.isArray(m.material) ? m.material[0] : m.material,
      });
    }
  });

  if (meshes.length === 0) return null;

  // Combined bounding box
  const combinedBox = new THREE.Box3();
  for (const { geometry } of meshes) {
    geometry.computeBoundingBox();
    combinedBox.union(geometry.boundingBox!);
  }
  const size = new THREE.Vector3();
  combinedBox.getSize(size);
  const center = new THREE.Vector3();
  combinedBox.getCenter(center);

  // Determine longest axis and compute rotation to align it with +Z
  const longestAxis =
    size.x >= size.y && size.x >= size.z ? "x" :
    size.y >= size.z ? "y" : "z";

  const alignRot = new THREE.Matrix4();
  if (longestAxis === "x") {
    alignRot.makeRotationY(-Math.PI / 2);
  } else if (longestAxis === "y") {
    alignRot.makeRotationX(Math.PI / 2);
  }

  // Apply center translation + alignment rotation + scale to each geometry
  const group = new THREE.Group();
  for (const { geometry, material } of meshes) {
    geometry.translate(-center.x, -center.y, -center.z);
    if (longestAxis !== "z") {
      geometry.applyMatrix4(alignRot);
    }
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }

  // Scale the entire group based on post-rotation bounds
  const finalBox = new THREE.Box3().setFromObject(group);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);
  const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
  const scale = targetSize / maxDim;
  group.scale.set(scale, scale, scale);

  return group;
}

/**
 * Merges ALL meshes from a scene into a single BufferGeometry.
 * Bakes world transforms, normalizes to targetSize, and aligns
 * the longest axis with +Z. Suitable for InstancedMesh.
 */
export function mergeSceneToGeometry(
  scene: THREE.Object3D,
  targetSize: number,
): THREE.BufferGeometry | null {
  scene.updateMatrixWorld(true);

  const geometries: THREE.BufferGeometry[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      const geo = m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);

      // Strip non-position/normal attributes so merge works
      const stripped = new THREE.BufferGeometry();
      if (geo.attributes.position) stripped.setAttribute("position", geo.attributes.position);
      if (geo.attributes.normal) stripped.setAttribute("normal", geo.attributes.normal);
      if (geo.index) stripped.setIndex(geo.index);
      geometries.push(stripped);
    }
  });

  if (geometries.length === 0) return null;

  const merged = mergeGeometries(geometries, false);
  if (!merged) return null;

  // Normalize (center + align + scale) using the same logic as normalizeGeometry
  return normalizeGeometry(merged, targetSize);
}

/**
 * Extracts up to `maxCount` mesh geometries from a scene (or a named subtree),
 * normalized together — shared center, aligned so the longest axis is +Z,
 * uniformly scaled so the combined bounds fit `targetSize`. Submeshes stay
 * spatially coherent because they all share the same transform.
 *
 * Returns an array suitable for per-part InstancedMesh rendering where each
 * part carries its own material but they assemble into a single visual ship.
 */
export function extractSubmeshes(
  scene: THREE.Object3D,
  targetSize: number,
  maxCount: number,
  groupName?: string,
): THREE.BufferGeometry[] {
  scene.updateMatrixWorld(true);

  // Pick the subtree to walk: a named node if provided, otherwise the whole scene.
  let root: THREE.Object3D = scene;
  if (groupName) {
    let found: THREE.Object3D | null = null;
    scene.traverse((child) => {
      if (!found && child.name.includes(groupName)) found = child;
    });
    if (found) root = found;
  }

  const geometries: THREE.BufferGeometry[] = [];
  root.traverse((child) => {
    if (geometries.length >= maxCount) return;
    const m = child as THREE.Mesh;
    if (m.isMesh) {
      const geo = m.geometry.clone();
      geo.applyMatrix4(m.matrixWorld);
      geometries.push(geo);
    }
  });

  if (geometries.length === 0) return [];

  // Combined bounds over pre-rotation geometries to pick the longest axis.
  const combinedBox = new THREE.Box3();
  for (const geo of geometries) {
    geo.computeBoundingBox();
    combinedBox.union(geo.boundingBox!);
  }
  const size = new THREE.Vector3();
  combinedBox.getSize(size);
  const center = new THREE.Vector3();
  combinedBox.getCenter(center);

  const longestAxis =
    size.x >= size.y && size.x >= size.z ? "x" :
    size.y >= size.z ? "y" : "z";

  const alignRot = new THREE.Matrix4();
  if (longestAxis === "x") alignRot.makeRotationY(-Math.PI / 2);
  else if (longestAxis === "y") alignRot.makeRotationX(Math.PI / 2);

  // Apply shared center + alignment rotation per submesh.
  for (const geo of geometries) {
    geo.translate(-center.x, -center.y, -center.z);
    if (longestAxis !== "z") geo.applyMatrix4(alignRot);
  }

  // Recompute combined bounds after rotation for a uniform scale factor.
  const finalBox = new THREE.Box3();
  for (const geo of geometries) {
    geo.computeBoundingBox();
    finalBox.union(geo.boundingBox!);
  }
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);
  const maxDim = Math.max(finalSize.x, finalSize.y, finalSize.z);
  const scaleK = targetSize / maxDim;
  for (const geo of geometries) geo.scale(scaleK, scaleK, scaleK);

  return geometries;
}

/**
 * Gets the first mesh geometry from a scene, with world transforms baked in.
 */
export function getFirstGeometry(scene: THREE.Object3D): THREE.BufferGeometry | null {
  let foundMesh: THREE.Mesh | null = null;
  scene.updateMatrixWorld(true);
  scene.traverse((child) => {
    if (!foundMesh && (child as THREE.Mesh).isMesh) {
      foundMesh = child as THREE.Mesh;
    }
  });
  if (!foundMesh) return null;

  const mesh = foundMesh as THREE.Mesh;
  const baked = mesh.geometry.clone();
  baked.applyMatrix4(mesh.matrixWorld);
  return baked;
}
