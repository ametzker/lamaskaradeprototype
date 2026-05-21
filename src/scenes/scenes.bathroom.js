import * as THREE from 'three';
import { createNPC } from '../objects/NPCFactory';
import { createTextBillboard } from '../objects/TextBillboard';
import { createDoor, createParticles, createRoom, createStandardMaterial } from '../objects/ScenePrimitives';
import {
  createModelAnimationController,
  loadModelInstance,
  normalizeModelToHeight,
  stylizeModelMaterials,
} from '../utils/ModelLoader';

export function createBathroomScene({ sceneManager, dialogue, controller }) {
  sceneManager.audioManager?.setSpace('bathroom', { immediate: true, duration: 0.01 });
  const root = new THREE.Group();
  const updatables = [];
  const CHARACTER_GLB_SCALE_MULTIPLIER = 0.9;
  const CHARACTER_COLOR_BOOST = 1.2; // AJUSTE RAPIDO: menos gloom en personajes
  const CHARACTER5_COLOR_BOOST = 1.53; // AJUSTE RAPIDO: devuelve otro +50% de brillo a PERSONAJE5
  const CHARACTER5_EMISSIVE_MIN = 0.0; // AJUSTE RAPIDO: no forzar glow minimo en PERSONAJE5
  const CHARACTER5_EMISSIVE_MAX = 0.027; // AJUSTE RAPIDO: devuelve otro +50% de glow controlado en PERSONAJE5
  const CHARACTER5_ROUGHNESS_MIN = 0.84; // AJUSTE RAPIDO: mas mate para PERSONAJE5
  const CHARACTER5_METALNESS_MAX = 0.03; // AJUSTE RAPIDO: menos reflejo metalico en PERSONAJE5
  const CHARACTER5_ENV_MAP_INTENSITY_MAX = 0.2; // AJUSTE RAPIDO: menos reflejo de entorno en PERSONAJE5
  const PERSONAJE5_COLLIDER_PADDING_XZ = 1.25; // AJUSTE RAPIDO: ancho/fondo hitbox PERSONAJE5
  const PERSONAJE5_COLLIDER_PADDING_Y = 6; // AJUSTE RAPIDO: altura hitbox PERSONAJE5 (cubre todo el vertical)
  const BATHROOM_EXIT_DOOR_EMISSIVE_BASE = 1.95; // AJUSTE RAPIDO: brillo base puerta de salida a living room
  const BATHROOM_EXIT_DOOR_EMISSIVE_PULSE = 0.62; // AJUSTE RAPIDO: pulso extra para hacerla mas visible
  const BATHROOM_CAMERA_HEIGHT_OFFSET = 0.3; // AJUSTE RAPIDO: altura extra de camara en lavabo (metros)
  const previousEyeHeight = controller.eyeHeight ?? 1.65;
  const bathroomEyeHeight = previousEyeHeight + BATHROOM_CAMERA_HEIGHT_OFFSET;
  controller.eyeHeight = bathroomEyeHeight;
  const PERSONAJE5_TUNING = {
    x: -0.8,
    y: 0,
    z: 0.8,
    scale: 0.5,
    yaw: 1,
    targetHeight: 1.52,
  }; // AJUSTE RAPIDO: PERSONAJE5 en lavabo (X/Y/Z, escala, rotacion, altura base)
  const BATHROOM_NPC_RANDOM_LINES = [
    'BATHROOM NPC: This mirror owes me three secrets and one apology.',
    'BATHROOM NPC: If the sink starts singing, clap on beat.',
    'BATHROOM NPC: Party rule: dramatic pose first, decisions later.',
    'BATHROOM NPC: I came for silence and found a disco in my head.',
    'BATHROOM NPC: The tiles are judging us, so look confident.',
    'BATHROOM NPC: If reality gets weird, just call it art direction.',
    'BATHROOM NPC: Stay hydrated, stay chaotic, stay iconic.',
  ];
  let bathroomNpcLineDeck = [];
  let bathroomNpcDeckCursor = 0;
  let bathroomNpcLastLine = null;
  const refillBathroomNpcLineDeck = () => {
    bathroomNpcLineDeck = [...BATHROOM_NPC_RANDOM_LINES];
    for (let i = bathroomNpcLineDeck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bathroomNpcLineDeck[i], bathroomNpcLineDeck[j]] = [bathroomNpcLineDeck[j], bathroomNpcLineDeck[i]];
    }

    // Avoid immediate repetition when a new shuffled round starts.
    if (
      bathroomNpcLastLine
      && bathroomNpcLineDeck.length > 1
      && bathroomNpcLineDeck[0] === bathroomNpcLastLine
    ) {
      [bathroomNpcLineDeck[0], bathroomNpcLineDeck[1]] = [bathroomNpcLineDeck[1], bathroomNpcLineDeck[0]];
    }

    bathroomNpcDeckCursor = 0;
  };
  const getNextBathroomNpcLine = () => {
    if (bathroomNpcLineDeck.length === 0 || bathroomNpcDeckCursor >= bathroomNpcLineDeck.length) {
      refillBathroomNpcLineDeck();
    }

    const line = bathroomNpcLineDeck[bathroomNpcDeckCursor];
    bathroomNpcDeckCursor += 1;
    bathroomNpcLastLine = line;
    return line;
  };
  let disposed = false;
  let bathroomMapReadyResolve;
  let bathroomMapReadyResolved = false;
  const bathroomMapReady = new Promise((resolve) => {
    bathroomMapReadyResolve = resolve;
  });
  const resolveBathroomMapReady = () => {
    if (bathroomMapReadyResolved) {
      return;
    }
    bathroomMapReadyResolved = true;
    bathroomMapReadyResolve?.();
  };

  const room = createRoom({
    width: 10,
    depth: 8,
    height: 4,
    floorColor: '#23262b',
    wallColor: '#373a44',
    ceilingColor: '#1d2026',
  });

  const bathroomMapAnchor = new THREE.Group();
  loadModelInstance('/models/map/Bathroom2.glb')
    .then(({ model }) => {
      if (disposed) {
        resolveBathroomMapReady();
        return;
      }

      stylizeModelMaterials(model, {
        roughness: 0.82,
        metalness: 0.08,
        emissiveIntensity: 0.02,
      });
      normalizeModelToHeight(model, 4.2);
      model.rotation.y = Math.PI;
      model.position.z = 1.8;
      bathroomMapAnchor.add(model);
      resolveBathroomMapReady();
    })
    .catch((error) => {
      console.warn('Could not load /models/map/Bathroom2.glb', error);
      if (!disposed) {
        root.add(room);
      }
      resolveBathroomMapReady();
    });

  const ambient = new THREE.AmbientLight('#8aa6cf', 0.48);
  const fill = new THREE.HemisphereLight('#b9d0ff', '#1a2535', 0.42);
  const flicker = new THREE.PointLight('#d5e7ff', 3.1, 14, 2);
  flicker.position.set(0, 3.3, -0.5);

  const brightenCharacter = (model, {
    colorBoost = CHARACTER_COLOR_BOOST,
    emissiveMin = 0.14,
    emissiveMax = null,
    roughnessMax = 0.52,
    roughnessMin = null,
    metalnessMax = null,
    envMapIntensityMax = null,
  } = {}) => {
    model.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material.color) {
          material.color.multiplyScalar(colorBoost);
        }
        if ('emissiveIntensity' in material) {
          const raisedEmissive = Math.max(material.emissiveIntensity ?? 0, emissiveMin);
          material.emissiveIntensity = emissiveMax == null
            ? raisedEmissive
            : Math.min(raisedEmissive, emissiveMax);
        }
        if ('roughness' in material) {
          const loweredRoughness = Math.min(material.roughness ?? roughnessMax, roughnessMax);
          material.roughness = roughnessMin == null
            ? loweredRoughness
            : Math.max(loweredRoughness, roughnessMin);
        }
        if (metalnessMax != null && 'metalness' in material) {
          material.metalness = Math.min(material.metalness ?? metalnessMax, metalnessMax);
        }
        if (envMapIntensityMax != null && 'envMapIntensity' in material) {
          material.envMapIntensity = Math.min(material.envMapIntensity ?? envMapIntensityMax, envMapIntensityMax);
        }
        material.needsUpdate = true;
      });
    });
  };

  const fitColliderToModelBounds = (collider, model, {
    paddingXZ = PERSONAJE5_COLLIDER_PADDING_XZ,
    paddingY = PERSONAJE5_COLLIDER_PADDING_Y,
  } = {}) => {
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) {
      return;
    }

    const size = bounds.getSize(new THREE.Vector3());
    const centerWorld = bounds.getCenter(new THREE.Vector3());
    const centerLocal = collider.parent ? collider.parent.worldToLocal(centerWorld.clone()) : centerWorld;

    const width = Math.max(size.x * paddingXZ, 0.75);
    const height = Math.max(size.y * paddingY, 1.9);
    const depth = Math.max(size.z * paddingXZ, 0.75);

    collider.geometry.dispose();
    collider.geometry = new THREE.BoxGeometry(width, height, depth);
    collider.position.copy(centerLocal);
  };

  const personaje5TalkCollider = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 2.1, 0.9),
    createStandardMaterial({
      color: '#ffffff',
      emissive: '#8fc6ff',
      emissiveIntensity: 0.08,
      roughness: 1,
      metalness: 0,
    }),
  );
  personaje5TalkCollider.material.transparent = true;
  personaje5TalkCollider.material.opacity = 0.03;
  personaje5TalkCollider.visible = false;

  const setPersonaje5ColliderVisibility = (visible) => {
    personaje5TalkCollider.visible = visible;
    personaje5TalkCollider.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const mirrorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 2.4, 0.08),
    createStandardMaterial({ color: '#0f1116', emissive: '#2c3240', emissiveIntensity: 0.35, roughness: 0.6 }),
  );
  mirrorFrame.position.set(0, 2.1, -3.95);

  const mirrorSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(3.45, 2.1),
    new THREE.MeshStandardMaterial({
      color: '#597086',
      emissive: '#3a5470',
      emissiveIntensity: 0.25,
      roughness: 0.1,
      metalness: 0.65,
      transparent: true,
      opacity: 0.84,
    }),
  );
  mirrorSurface.position.set(0, 2.1, -3.9);

  const reflectionProxy = new THREE.Group();
  const proxyBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.72, 5, 10),
    createStandardMaterial({ color: '#d8f1ff', emissive: '#85b0c9', emissiveIntensity: 0.4, roughness: 0.35 }),
  );
  const proxyHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    createStandardMaterial({ color: '#181b22', emissive: '#778ba5', emissiveIntensity: 0.25, roughness: 0.4 }),
  );
  proxyHead.position.y = 0.75;
  reflectionProxy.add(proxyBody, proxyHead);
  reflectionProxy.position.set(0, 1.1, -3.83);
  reflectionProxy.scale.setScalar(0.9);

  let reflectionModel = null;
  let reflectionAnimator = null;
  const personaje5Anchor = new THREE.Group();
  personaje5Anchor.position.set(
    PERSONAJE5_TUNING.x,
    PERSONAJE5_TUNING.y,
    PERSONAJE5_TUNING.z,
  );
  personaje5Anchor.rotation.y = PERSONAJE5_TUNING.yaw;
  personaje5Anchor.add(personaje5TalkCollider);
  setPersonaje5ColliderVisibility(false);
  let personaje5Animator = null;

  loadModelInstance('/models/characters/PERSONAJE5.glb')
    .then(({ model, animations }) => {
      if (disposed) {
        return;
      }

      stylizeModelMaterials(model, {
        roughness: 0.62,
        metalness: 0.08,
        emissiveIntensity: 0.06,
      });

      normalizeModelToHeight(
        model,
        PERSONAJE5_TUNING.targetHeight * CHARACTER_GLB_SCALE_MULTIPLIER * PERSONAJE5_TUNING.scale,
      );
      brightenCharacter(model, {
        colorBoost: CHARACTER5_COLOR_BOOST,
        emissiveMin: CHARACTER5_EMISSIVE_MIN,
        emissiveMax: CHARACTER5_EMISSIVE_MAX,
        roughnessMax: 1,
        roughnessMin: CHARACTER5_ROUGHNESS_MIN,
        metalnessMax: CHARACTER5_METALNESS_MAX,
        envMapIntensityMax: CHARACTER5_ENV_MAP_INTENSITY_MAX,
      });
      model.rotation.y = 0.08;
      personaje5Anchor.add(model);
      personaje5Anchor.updateWorldMatrix(true, true);
      fitColliderToModelBounds(personaje5TalkCollider, model);
      setPersonaje5ColliderVisibility(true);

      personaje5Animator = createModelAnimationController(model, animations, 0.9);
    })
    .catch((error) => {
      console.warn('Could not load /models/characters/PERSONAJE5.glb', error);
    });

  loadModelInstance('/models/characters/PROTA.glb')
    .then(({ model, animations }) => {
      if (disposed) {
        return;
      }

      stylizeModelMaterials(model, {
        roughness: 0.5,
        metalness: 0.08,
        emissiveIntensity: 0.13,
      });
      normalizeModelToHeight(model, 0.56 * CHARACTER_GLB_SCALE_MULTIPLIER);
      brightenCharacter(model);
      model.rotation.y = Math.PI;
      model.position.z = -0.02;

      reflectionProxy.remove(proxyBody);
      reflectionProxy.remove(proxyHead);
      reflectionProxy.add(model);
      reflectionModel = model;

      reflectionAnimator = createModelAnimationController(model, animations, 0.85);
    })
    .catch((error) => {
      console.warn('Could not load /models/characters/PROTA.glb', error);
    });

  const mirrorText = createTextBillboard('PAY ME PAY ME PAY ME', {
    color: '#f5f8ff',
    glow: '#8fc2ff',
    background: 'rgba(10, 13, 20, 0.15)',
    scale: 1.1,
    width: 1200,
    height: 180,
  });
  mirrorText.mesh.position.set(0, 3.2, -3.84);

  const sink = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.9, 0.7, 8),
    createStandardMaterial({ color: '#c8cfdb', emissive: '#72839c', emissiveIntensity: 0.16, roughness: 0.72 }),
  );
  sink.position.set(0, 0.35, -2.8);

  const npc = createNPC({
    color: '#d9edff',
    emissive: '#5f7598',
    silhouette: 'angular',
    motion: 'float',
    scale: 1.16,
    position: new THREE.Vector3(2.5, 0, -2.8),
  });

  const darkDoor = createDoor({
    color: '#111317',
    emissive: '#8f315f',
    emissiveIntensity: BATHROOM_EXIT_DOOR_EMISSIVE_BASE,
  });
  darkDoor.position.set(-1.795, 1.8, 1.3);
  darkDoor.rotation.y = -Math.PI / 2;

  const particles = createParticles({
    count: 220,
    area: new THREE.Vector3(6, 3.1, 5),
    color: '#b8d5ff',
    size: 0.035,
  });

  const reflectionHistory = [];

  updatables.push((deltaTime, time) => {
    npc.update(time);
    particles.update(time);
    mirrorText.faceCamera(controller.camera);
    reflectionAnimator?.update(deltaTime);
    personaje5Animator?.update(deltaTime);

    if (Math.random() < 0.06) {
      flicker.intensity = 2 + Math.random() * 2.2;
    } else {
      flicker.intensity += (2.9 - flicker.intensity) * 0.08;
    }

    const playerPosition = controller.getPosition(new THREE.Vector3());
    const ghostOffsetX = Math.sin(time * 0.7) * 1.1;
    const ghostOffsetY = Math.sin(time * 0.35) * 0.08;
    const ghostYaw = Math.sin(time * 0.45) * 0.35;

    reflectionHistory.push({
      x: playerPosition.x + ghostOffsetX,
      y: playerPosition.y + ghostOffsetY,
      z: playerPosition.z,
      yaw: controller.getObject().rotation.y + ghostYaw,
    });

    if (reflectionHistory.length > 22) {
      const lagged = reflectionHistory.shift();
      const relativeX = THREE.MathUtils.clamp(lagged.x * 0.12, -1.2, 1.2);
      const relativeY = 0.8 + THREE.MathUtils.clamp((lagged.y - 1.65) * 0.8, -0.3, 0.6);

      reflectionProxy.position.x += ((-relativeX) - reflectionProxy.position.x) * 0.12;
      reflectionProxy.position.y += (relativeY - reflectionProxy.position.y) * 0.09;
      reflectionProxy.rotation.y += ((Math.PI - lagged.yaw) - reflectionProxy.rotation.y) * 0.09;
    }

    if (reflectionModel) {
      reflectionModel.position.y = Math.sin(time * 1.2) * 0.03;
      reflectionModel.rotation.z = Math.sin(time * 0.8) * 0.04;
    }

    darkDoor.material.emissiveIntensity = BATHROOM_EXIT_DOOR_EMISSIVE_BASE
      + Math.sin(time * 4.2) * BATHROOM_EXIT_DOOR_EMISSIVE_PULSE;
  });

  root.add(
    bathroomMapAnchor,
    ambient,
    fill,
    flicker,
    mirrorFrame,
    mirrorSurface,
    mirrorText.mesh,
    reflectionProxy,
    personaje5Anchor,
    sink,
    npc.group,
    darkDoor,
    particles.points,
  );

  return {
    id: 'bathroom',
    label: 'Bathroom',
    root,
    background: '#121a28',
    fog: {
      color: '#1f2a39',
      near: 2.2,
      far: 14,
    },
    spawn: new THREE.Vector3(0.2, bathroomEyeHeight, 2.9),
    lookAt: new THREE.Vector3(0, bathroomEyeHeight + 0.05, -0.1),
    turn: {
      minDeg: -82,
      maxDeg: 82,
      stepDeg: 16,
      initialDeg: 0,
    },
    bounds: {
      minX: -24,
      maxX: 24,
      minZ: -20,
      maxZ: 20,
    },
    updatables,
    interactions: [
      {
        object: personaje5TalkCollider,
        label: 'talk',
        onClick: async () => {
          await dialogue?.showLine(getNextBathroomNpcLine());
        },
      },
      {
        object: darkDoor,
        label: 'living room',
        onClick: async () => {
          sceneManager.setFlag('interiorEntryFromBathroom', true);
          await sceneManager.goTo('exterior', { color: '#150d1f' });
        },
      },
    ],
    onEnter: async () => {
      sceneManager.audioManager?.setSpace('bathroom', { duration: 0.35 });
      await bathroomMapReady;
    },
    cleanup: [
      () => {
        disposed = true;
        resolveBathroomMapReady();
        controller.eyeHeight = previousEyeHeight;
        reflectionAnimator?.dispose();
        personaje5Animator?.dispose();
      },
    ],
  };
}
