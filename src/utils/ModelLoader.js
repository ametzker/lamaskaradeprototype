import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const sourceCache = new Map();

async function getSourceAsset(url) {
  if (!sourceCache.has(url)) {
    sourceCache.set(url, loader.loadAsync(url));
  }

  return sourceCache.get(url);
}

export async function loadModelInstance(url) {
  const asset = await getSourceAsset(url);

  return {
    model: clone(asset.scene),
    animations: asset.animations ?? [],
  };
}

export function createModelAnimationController(model, clips = [], timeScale = 1) {
  if (!Array.isArray(clips) || clips.length === 0) {
    return null;
  }

  const mixer = new THREE.AnimationMixer(model);
  mixer.timeScale = timeScale;

  clips.forEach((clip) => {
    mixer.clipAction(clip).reset().play();
  });

  return {
    update(deltaTime) {
      mixer.update(deltaTime);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    },
  };
}

export function normalizeModelToHeight(model, targetHeight = 1.7) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());

  if (!Number.isFinite(size.y) || size.y <= 0) {
    return;
  }

  const scale = targetHeight / size.y;
  model.scale.multiplyScalar(scale);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, 0, center.z));

  box.setFromObject(model);
  model.position.y -= box.min.y;
}

export function stylizeModelMaterials(model, {
  roughness = 0.58,
  metalness = 0.12,
  emissiveIntensity = 0.06,
} = {}) {
  model.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];

    materials.forEach((material) => {
      if ('roughness' in material) {
        material.roughness = Math.min(material.roughness ?? roughness, roughness);
      }

      if ('metalness' in material) {
        material.metalness = Math.min(material.metalness ?? metalness, metalness);
      }

      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, emissiveIntensity);
      }

      material.needsUpdate = true;
    });

    child.castShadow = false;
    child.receiveShadow = false;
  });
}
