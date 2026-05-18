import * as THREE from 'three';

export function createStandardMaterial({
  color,
  emissive = '#000000',
  emissiveIntensity = 0.1,
  roughness = 0.6,
  metalness = 0.1,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
  });
}

export function createRoom({
  width = 10,
  depth = 10,
  height = 4,
  floorColor = '#2a2a2a',
  wallColor = '#353535',
  ceilingColor = '#1a1a1a',
} = {}) {
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    createStandardMaterial({ color: floorColor, roughness: 0.75 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    createStandardMaterial({ color: ceilingColor, roughness: 0.8 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;

  const wallGeometry = new THREE.PlaneGeometry(width, height);
  const wallMaterial = createStandardMaterial({ color: wallColor, roughness: 0.8 });

  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, height / 2, -depth / 2);

  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, height / 2, depth / 2);

  const sideGeometry = new THREE.PlaneGeometry(depth, height);
  const leftWall = new THREE.Mesh(sideGeometry, wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-width / 2, height / 2, 0);

  const rightWall = new THREE.Mesh(sideGeometry, wallMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(width / 2, height / 2, 0);

  group.add(floor, ceiling, backWall, frontWall, leftWall, rightWall);
  return group;
}

export function createDoor({
  width = 1.3,
  height = 2.3,
  depth = 0.25,
  color = '#232323',
  emissive = '#000000',
  emissiveIntensity = 0.15,
} = {}) {
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    createStandardMaterial({ color, emissive, emissiveIntensity, roughness: 0.4 }),
  );

  return door;
}

export function createParticles({
  count = 180,
  area = new THREE.Vector3(4, 3, 4),
  color = '#ffffff',
  size = 0.03,
} = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * area.x;
    positions[i * 3 + 1] = Math.random() * area.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);

  const update = (time) => {
    points.rotation.y = time * 0.03;
  };

  return { points, update };
}

export function createCloudField({
  count = 12,
  spreadX = 18,
  spreadZ = 18,
  color = '#ffe1f2',
} = {}) {
  const group = new THREE.Group();

  for (let i = 0; i < count; i += 1) {
    const cloud = new THREE.Mesh(
      new THREE.PlaneGeometry(2 + Math.random() * 2.2, 1 + Math.random() * 1.4),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );

    cloud.position.set(
      (Math.random() - 0.5) * spreadX,
      1.2 + Math.random() * 3,
      (Math.random() - 0.5) * spreadZ,
    );
    cloud.rotation.y = Math.random() * Math.PI;

    group.add(cloud);
  }

  return group;
}
