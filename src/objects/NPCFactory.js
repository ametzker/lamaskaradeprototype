import * as THREE from 'three';

function createMaterial(color, emissive = color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.1,
    emissive,
    emissiveIntensity: 0.08,
  });
}

function createHead(type, material) {
  if (type === 'sphere') {
    return new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), material);
  }

  if (type === 'cylinder') {
    return new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.45, 8), material);
  }

  return new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.2, 6, 12), material);
}

export function createNPC({
  color = '#ff4fae',
  emissive = '#661b46',
  scale = 1,
  silhouette = 'tall',
  motion = 'bob',
  position = new THREE.Vector3(),
  sitting = false,
} = {}) {
  const group = new THREE.Group();
  const bodyMaterial = createMaterial(color, emissive);
  const accentMaterial = createMaterial('#222222', '#111111');

  const torsoHeight = silhouette === 'wide' ? 0.7 : silhouette === 'tiny' ? 0.45 : 0.9;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, torsoHeight, 6, 12), bodyMaterial);
  torso.position.y = 1.05;

  const head = createHead(
    silhouette === 'angular' ? 'cylinder' : silhouette === 'orb' ? 'sphere' : 'capsule',
    accentMaterial,
  );
  head.position.y = 1.78;

  const legLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.7, 8), bodyMaterial);
  const legRight = legLeft.clone();
  legLeft.position.set(-0.12, 0.35, 0);
  legRight.position.set(0.12, 0.35, 0);

  const shoulderOrb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), accentMaterial);
  shoulderOrb.position.set(silhouette === 'wide' ? 0.4 : 0.28, 1.15, 0);

  group.add(torso, head, legLeft, legRight, shoulderOrb);
  group.position.copy(position);
  group.scale.setScalar(scale);

  if (sitting) {
    group.rotation.x = -0.26;
    group.position.y = 0.58;
  }

  const baseY = group.position.y;
  const baseRotY = group.rotation.y;

  const update = (time) => {
    if (motion === 'still') {
      return;
    }

    if (motion === 'bob') {
      group.position.y = baseY + Math.sin(time * 1.8 + position.x) * 0.05;
      group.rotation.y = baseRotY + Math.sin(time * 0.9 + position.z) * 0.25;
      head.rotation.z = Math.sin(time * 2.4 + position.z) * 0.18;
      return;
    }

    if (motion === 'twist') {
      group.position.y = baseY + Math.sin(time * 1.2 + position.z) * 0.07;
      group.rotation.y = baseRotY + Math.sin(time * 1.5 + position.x) * 0.48;
      torso.rotation.z = Math.sin(time * 2.1) * 0.14;
      return;
    }

    if (motion === 'float') {
      group.position.y = baseY + Math.sin(time * 0.8 + position.x * 0.5) * 0.11;
      group.rotation.x = Math.sin(time * 0.7 + position.z) * 0.09;
      head.position.y = 1.72 + Math.sin(time * 1.9) * 0.08;
    }
  };

  return { group, update };
}
