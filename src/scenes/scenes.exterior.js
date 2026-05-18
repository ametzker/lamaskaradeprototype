import * as THREE from 'three';
import { createTextBillboard } from '../objects/TextBillboard';
import { createDoor, createStandardMaterial } from '../objects/ScenePrimitives';
import {
  createModelAnimationController,
  loadModelInstance,
  normalizeModelToHeight,
  stylizeModelMaterials,
} from '../utils/ModelLoader';

export function createExteriorScene({ sceneManager, controller, hud, dialogue }, options = {}) {
  const { mode = 'default' } = options;
  const root = new THREE.Group();
  const updatables = [];
  const modelAnimators = [];
  const movingResidents = [];
  const partyLights = [];
  const EXTERIOR_CAMERA_HEIGHT_OFFSET = 0.35; // AJUSTE RAPIDO: altura de camara exterior (metros)
  const INTERIOR_CAMERA_HEIGHT_OFFSET = 0.8; // AJUSTE RAPIDO: altura extra de camara al entrar dentro (metros)
  const CHARACTER_GLB_SCALE_MULTIPLIER = 0.9;
  const CHARACTER_COLOR_BOOST = 1.22; // AJUSTE RAPIDO: menos gloom en personajes
  const CHARACTER3_COLOR_BOOST = 1.62; // AJUSTE RAPIDO: devuelve otro +50% de brillo a PERSONAJE3
  const CHARACTER3_EMISSIVE_MIN = 0.0; // AJUSTE RAPIDO: no forzar glow minimo en PERSONAJE3
  const CHARACTER3_EMISSIVE_MAX = 0.035; // AJUSTE RAPIDO: devuelve otro +50% de glow controlado en PERSONAJE3
  const CHARACTER3_ROUGHNESS_MIN = 0.82; // AJUSTE RAPIDO: mas mate para PERSONAJE3
  const CHARACTER3_METALNESS_MAX = 0.03; // AJUSTE RAPIDO: menos reflejo metalico en PERSONAJE3
  const CHARACTER3_ENV_MAP_INTENSITY_MAX = 0.24; // AJUSTE RAPIDO: menos reflejo de entorno en PERSONAJE3
  const INTERIOR_SPAWN_OFFSET = { x: -2, z: 0.75, lookZ: -2.2 }; // AJUSTE RAPIDO: spawn fijo dentro
  const RESIDENTS_GLB_FLOOR_OFFSET = -5; // AJUSTE RAPIDO: sube/baja todos los personajes (metros)
  const ENTRY_DOOR_OFFSET = { x: 1.2, y: 0, z: 0 }; // AJUSTE RAPIDO: mueve puerta de entrada (la camara exterior la sigue)
  const BATHROOM_DOOR_HEIGHT = 4; // AJUSTE RAPIDO: altura del recuadro lavabo
  const BATHROOM_DOOR_OFFSET = { x: -7.5, y: 0, z: 2 }; // AJUSTE RAPIDO: mueve puerta lavabo en X/Y/Z
  const BEDROOM_DOOR_INITIAL_DISTANCE = 2.2; // AJUSTE RAPIDO: puerta dormitorio delante de camara (distancia inicial)
  const BEDROOM_DOOR_INITIAL_HEIGHT_OFFSET = -0.95; // AJUSTE RAPIDO: altura inicial puerta dormitorio respecto a ojos
  const BEDROOM_DOOR_MANUAL_OFFSET = { x: -7, y: 5, z: 0.2 }; // AJUSTE RAPIDO: recoloca puerta dormitorio final en X/Y/Z
  const BEDROOM_DOOR_YAW_OFFSET_DEG = -20; // AJUSTE RAPIDO: rotacion manual puerta dormitorio
  const BEDROOM_DOOR_SIZE = { width: 1.6, height: 3.1, depth: 0.2 }; // AJUSTE RAPIDO: tamano puerta dormitorio
  const BEDROOM_DOOR_REPOSITION_EACH_ENTRY = true; // AJUSTE RAPIDO: recoloca la puerta dormitorio delante de camara en cada entrada
  const BATHROOM_RETURN_SPAWN_DISTANCE = 1.45; // AJUSTE RAPIDO: distancia de spawn al volver del lavabo
  const BATHROOM_RETURN_LOOK_DISTANCE = 2.9; // AJUSTE RAPIDO: hacia donde mira al volver (mas adentro del interior)
  const BATHROOM_RETURN_EXTRA_TURN_DEG = 60; // AJUSTE RAPIDO: giro extra del spawn al volver del lavabo
  const STAIR_ARROW_INITIAL_DISTANCE = 10; // AJUSTE RAPIDO: coloca la flecha delante de camara al entrar
  const STAIR_ARROW_INITIAL_HEIGHT_OFFSET = -1.05; // AJUSTE RAPIDO: altura inicial respecto a ojos
  const STAIR_ARROW_SCALE = 2.4; // AJUSTE RAPIDO: escala de la flecha para verla mejor
  const STAIR_ARROW_MANUAL_OFFSET = { x: 10, y: 1, z: -8 }; // AJUSTE RAPIDO: mueve flecha libremente tras localizarla
  const UPSTAIRS_SPAWN_FROM_ARROW = { forward: 0.45, side: 0, y: 0 }; // AJUSTE RAPIDO: spawn upstairs relativo a flecha
  const UPSTAIRS_LOOK_FROM_SPAWN = { forward: 2.4, side: 0, y: 0.06 }; // AJUSTE RAPIDO: look upstairs relativo al spawn
  const UPSTAIRS_SPAWN_NUDGE_XYZ = { x: 7, y: 5, z: 11 }; // AJUSTE RAPIDO: ajuste fino X/Z y altura real de camara (Y) del spawn upstairs
  const UPSTAIRS_LOOK_NUDGE_XYZ = { x: 5, y: 0, z: 0 }; // AJUSTE RAPIDO: ajuste fino X/Y/Z del look upstairs
  const DOOR_RECTANGLE_OPACITY_ENTRY = 0.62; // AJUSTE RAPIDO: visibilidad recuadro entrar
  const DOOR_RECTANGLE_OPACITY_BATHROOM = 0.68; // AJUSTE RAPIDO: visibilidad recuadro lavabo
  const DOOR_RECTANGLE_EMISSIVE_BASE = 0.9; // AJUSTE RAPIDO: brillo base de ambos recuadros
  const PERSONAJE3_COLLIDER_PADDING_XZ = 1.15; // AJUSTE RAPIDO: ancho/fondo del area clicable de PERSONAJE3
  const PERSONAJE3_COLLIDER_PADDING_Y = 6; // AJUSTE RAPIDO: altura del area clicable de PERSONAJE3
  const PERSONAJE4_COLLIDER_PADDING_XZ = 1.2; // AJUSTE RAPIDO: ancho/fondo del area clicable de PERSONAJE4
  const PERSONAJE4_COLLIDER_PADDING_Y = 6; // AJUSTE RAPIDO: altura del area clicable de PERSONAJE4 (cubre todo el vertical)
  const RESIDENTS_TUNING = {
    PROTA: { x: 0, y: 1.5, z: 0, scale: 0.7 },
    PERSONAJE3: { x: -6, y: 1.5, z: 0, scale: 0.7 },
    PERSONAJE4: { x: -7, y: 1.5, z: 7.5, scale: 0.7 },
  }; // AJUSTE RAPIDO: mueve cada personaje por separado en X/Y/Z y escala
  const sceneState = {
    disposed: false,
    duplexWorldBox: null,
    detectedFloorInfo: null,
    interiorSpawnView: null,
    bathroomReturnView: null,
    stairArrowPlaced: false,
    stairArrowUnlocked: false,
    bedroomDoorPlaced: false,
    isInsideDuplex: false,
    isUpstairsFloor: false,
    bathroomDoorUnlocked: false,
    personaje3HintStep: 0,
  };
  const forceInteriorEntryFromBathroom = sceneManager.getFlag('interiorEntryFromBathroom');
  const forceUpstairsEntry = mode === 'upstairs' || sceneManager.getFlag('upstairsEntry');
  if (forceInteriorEntryFromBathroom) {
    sceneManager.setFlag('interiorEntryFromBathroom', false);
  }
  if (forceUpstairsEntry) {
    sceneManager.setFlag('upstairsEntry', false);
  }
  const originalEyeHeight = controller.eyeHeight ?? 1.65;
  const exteriorEyeHeight = originalEyeHeight + EXTERIOR_CAMERA_HEIGHT_OFFSET;
  const interiorEyeHeight = exteriorEyeHeight + INTERIOR_CAMERA_HEIGHT_OFFSET;
  controller.eyeHeight = exteriorEyeHeight;
  const probingRaycaster = new THREE.Raycaster();
  const downDirection = new THREE.Vector3(0, -1, 0);
  const cameraForwardVector = new THREE.Vector3();
  const cameraPositionVector = new THREE.Vector3();
  const sideDirections = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  const ambient = new THREE.AmbientLight('#8396ff', 0.72);
  const moon = new THREE.DirectionalLight('#9bb8ff', 1.05);
  moon.position.set(6, 11, 7);
  const skyFill = new THREE.HemisphereLight('#7f8cff', '#120f16', 0.65);
  const porchLight = new THREE.PointLight('#ffd7aa', 5.2, 26, 1.8);
  porchLight.position.set(0, 3.2, 5.5);
  const partyBeamA = new THREE.SpotLight('#ff4f95', 0, 28, Math.PI * 0.23, 0.48, 1.6);
  const partyBeamB = new THREE.SpotLight('#55b7ff', 0, 28, Math.PI * 0.23, 0.48, 1.6);
  partyBeamA.position.set(-1.8, 4.8, 1.2);
  partyBeamB.position.set(2.2, 4.6, -1.1);
  const partyTargetA = new THREE.Object3D();
  const partyTargetB = new THREE.Object3D();
  partyTargetA.position.set(-0.6, 0.8, -3.1);
  partyTargetB.position.set(0.6, 0.8, -2.6);
  partyBeamA.target = partyTargetA;
  partyBeamB.target = partyTargetB;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    createStandardMaterial({ color: '#0d0e14', emissive: '#0a0b11', emissiveIntensity: 0.16, roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;

  const duplexAnchor = new THREE.Group();

  const entryDoor = createDoor({
    color: '#3b1f31',
    emissive: '#ff4fa2',
    emissiveIntensity: DOOR_RECTANGLE_EMISSIVE_BASE,
    width: 1.45,
    height: 2.4,
  });
  entryDoor.position.set(-1.35 + ENTRY_DOOR_OFFSET.x, 1.2 + ENTRY_DOOR_OFFSET.y, 5.25 + ENTRY_DOOR_OFFSET.z);
  entryDoor.material.transparent = true;
  entryDoor.material.opacity = DOOR_RECTANGLE_OPACITY_ENTRY;
  entryDoor.visible = false;

  const bathroomDoor = createDoor({
    color: '#233449',
    emissive: '#4db5ff',
    emissiveIntensity: DOOR_RECTANGLE_EMISSIVE_BASE,
    width: 1.45,
    height: BATHROOM_DOOR_HEIGHT,
  });
  bathroomDoor.position.set(2.1, BATHROOM_DOOR_HEIGHT * 0.5, 1.55);
  bathroomDoor.material.transparent = true;
  bathroomDoor.material.opacity = DOOR_RECTANGLE_OPACITY_BATHROOM;
  bathroomDoor.visible = false;

  const bedroomDoor = createDoor({
    color: '#f8e2ff',
    emissive: '#ff57cf',
    emissiveIntensity: 1.05,
    width: BEDROOM_DOOR_SIZE.width,
    height: BEDROOM_DOOR_SIZE.height,
    depth: BEDROOM_DOOR_SIZE.depth,
  });
  bedroomDoor.material.transparent = true;
  bedroomDoor.material.opacity = 0.82;
  bedroomDoor.material.depthWrite = false;
  bedroomDoor.material.depthTest = false;
  bedroomDoor.visible = false;

  const stairArrowMaterial = new THREE.MeshBasicMaterial({
    color: '#79d1ff',
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  const stairArrow = new THREE.Group();
  const stairArrowShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.82, 8),
    stairArrowMaterial,
  );
  stairArrowShaft.position.y = 0.41;
  const stairArrowHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.42, 8),
    stairArrowMaterial,
  );
  stairArrowHead.position.y = 1;
  stairArrowShaft.renderOrder = 999;
  stairArrowHead.renderOrder = 999;
  stairArrow.add(stairArrowShaft, stairArrowHead);
  stairArrow.visible = false;
  stairArrow.userData.baseY = 0;
  stairArrow.scale.setScalar(STAIR_ARROW_SCALE);
  duplexAnchor.add(stairArrow);

  const personaje3TalkCollider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24, 0.84, 5, 10),
    createStandardMaterial({
      color: '#ffffff',
      emissive: '#8fc6ff',
      emissiveIntensity: 0.08,
      roughness: 1,
      metalness: 0,
    }),
  );
  personaje3TalkCollider.material.transparent = true;
  personaje3TalkCollider.material.opacity = 0.03;
  personaje3TalkCollider.position.set(0, 0.92, 0);
  personaje3TalkCollider.visible = false;

  const personaje4TalkCollider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24, 0.84, 5, 10),
    createStandardMaterial({
      color: '#ffffff',
      emissive: '#8fc6ff',
      emissiveIntensity: 0.08,
      roughness: 1,
      metalness: 0,
    }),
  );
  personaje4TalkCollider.material.transparent = true;
  personaje4TalkCollider.material.opacity = 0.03;
  personaje4TalkCollider.position.set(0, 0.92, 0);
  personaje4TalkCollider.visible = false;

  const setEntryDoorVisibility = (visible) => {
    entryDoor.visible = visible;
    entryDoor.material.opacity = visible ? DOOR_RECTANGLE_OPACITY_ENTRY : 0;
    entryDoor.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const setBathroomDoorVisibility = (visible) => {
    bathroomDoor.visible = visible;
    bathroomDoor.material.opacity = visible ? DOOR_RECTANGLE_OPACITY_BATHROOM : 0;
    bathroomDoor.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const setBedroomDoorVisibility = (visible) => {
    bedroomDoor.visible = visible;
    bedroomDoor.material.opacity = visible ? 0.82 : 0;
    bedroomDoor.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const setStairArrowVisibility = (visible) => {
    stairArrow.visible = visible;
    stairArrow.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const setPersonaje3ColliderVisibility = (visible) => {
    personaje3TalkCollider.visible = visible;
    personaje3TalkCollider.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const setPersonaje4ColliderVisibility = (visible) => {
    personaje4TalkCollider.visible = visible;
    personaje4TalkCollider.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(visible ? 0 : 1);
    });
  };

  const fitColliderToModelBounds = (collider, model, {
    paddingXZ = PERSONAJE3_COLLIDER_PADDING_XZ,
    paddingY = PERSONAJE3_COLLIDER_PADDING_Y,
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

  const brightenCharacter = (model, {
    colorBoost = CHARACTER_COLOR_BOOST,
    emissiveMin = 0.14,
    emissiveMax = null,
    roughnessMax = 0.5,
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

  setEntryDoorVisibility(false);
  setBathroomDoorVisibility(false);
  setBedroomDoorVisibility(false);
  setPersonaje3ColliderVisibility(false);
  setPersonaje4ColliderVisibility(false);

  const placeDoorsFromBox = (box) => {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const facadeZ = box.max.z - 0.15;

    entryDoor.position.set(
      center.x - size.x * 0.1 + ENTRY_DOOR_OFFSET.x,
      1.2 + ENTRY_DOOR_OFFSET.y,
      facadeZ + ENTRY_DOOR_OFFSET.z,
    );
    bathroomDoor.position.set(
      center.x + size.x * 0.18 + BATHROOM_DOOR_OFFSET.x,
      BATHROOM_DOOR_HEIGHT * 0.5 + BATHROOM_DOOR_OFFSET.y,
      facadeZ - size.z * 0.28 + BATHROOM_DOOR_OFFSET.z,
    );

    setEntryDoorVisibility(!sceneState.isInsideDuplex);
    setBathroomDoorVisibility(sceneState.isInsideDuplex);
    setBedroomDoorVisibility(sceneState.isInsideDuplex && sceneState.isUpstairsFloor && sceneState.bedroomDoorPlaced);
  };

  const placeCameraFromBox = (box) => {
    const size = box.getSize(new THREE.Vector3());
    const doorX = entryDoor.position.x;
    const doorZ = entryDoor.position.z;
    const startDistance = THREE.MathUtils.clamp(size.z * 0.44, 4.4, 6.8);

    const startPosition = new THREE.Vector3(
      doorX,
      exteriorEyeHeight,
      doorZ + startDistance,
    );
    const startLookAt = new THREE.Vector3(
      doorX,
      exteriorEyeHeight + 0.08,
      doorZ - 0.2,
    );

    sceneState.isInsideDuplex = false;
    sceneState.isUpstairsFloor = false;
    setEntryDoorVisibility(true);
    setBathroomDoorVisibility(false);
    setBedroomDoorVisibility(false);
    setStairArrowVisibility(false);
    setPersonaje3ColliderVisibility(false);
    setPersonaje4ColliderVisibility(false);
    controller.eyeHeight = exteriorEyeHeight;
    controller.setPosition(startPosition);
    controller.lookAt(startLookAt);
    hud?.setSceneLabel('Exterior');
  };

  const getBathroomReturnView = () => {
    if (!sceneState.duplexWorldBox) {
      return null;
    }

    const boxCenter = sceneState.duplexWorldBox.getCenter(new THREE.Vector3());
    const doorPosition = new THREE.Vector3(
      bathroomDoor.position.x,
      interiorEyeHeight,
      bathroomDoor.position.z,
    );
    const toInterior = boxCenter.clone().sub(doorPosition).setY(0);
    if (toInterior.lengthSq() < 1e-6) {
      toInterior.set(0, 0, -1);
    }
    toInterior.normalize();

    const spawnPosition = new THREE.Vector3(
      doorPosition.x + toInterior.x * BATHROOM_RETURN_SPAWN_DISTANCE,
      interiorEyeHeight,
      doorPosition.z + toInterior.z * BATHROOM_RETURN_SPAWN_DISTANCE,
    );
    const backwardDirection = toInterior.clone().multiplyScalar(-1);
    const turnedDirection = backwardDirection.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.degToRad(-BATHROOM_RETURN_EXTRA_TURN_DEG),
    );

    return {
      position: spawnPosition,
      lookAt: new THREE.Vector3(
        spawnPosition.x + turnedDirection.x * BATHROOM_RETURN_LOOK_DISTANCE,
        interiorEyeHeight + 0.06,
        spawnPosition.z + turnedDirection.z * BATHROOM_RETURN_LOOK_DISTANCE,
      ),
      forward: turnedDirection,
    };
  };

  const getStairArrowAnchorFromView = (view) => {
    if (!view) {
      return null;
    }

    const forward = view.forward.clone().setY(0);
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    return {
      position: new THREE.Vector3(
        view.position.x + forward.x * STAIR_ARROW_INITIAL_DISTANCE + STAIR_ARROW_MANUAL_OFFSET.x,
        interiorEyeHeight + STAIR_ARROW_INITIAL_HEIGHT_OFFSET + STAIR_ARROW_MANUAL_OFFSET.y,
        view.position.z + forward.z * STAIR_ARROW_INITIAL_DISTANCE + STAIR_ARROW_MANUAL_OFFSET.z,
      ),
      forward,
    };
  };

  const getUpstairsViewFromReturn = (returnView) => {
    const arrowAnchor = getStairArrowAnchorFromView(returnView);
    if (!arrowAnchor) {
      return null;
    }

    const right = arrowAnchor.forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI * 0.5);

    const spawnPosition = new THREE.Vector3(
      arrowAnchor.position.x
        + arrowAnchor.forward.x * UPSTAIRS_SPAWN_FROM_ARROW.forward
        + right.x * UPSTAIRS_SPAWN_FROM_ARROW.side,
      interiorEyeHeight + UPSTAIRS_SPAWN_FROM_ARROW.y,
      arrowAnchor.position.z
        + arrowAnchor.forward.z * UPSTAIRS_SPAWN_FROM_ARROW.forward
        + right.z * UPSTAIRS_SPAWN_FROM_ARROW.side,
    );
    spawnPosition.x += UPSTAIRS_SPAWN_NUDGE_XYZ.x;
    spawnPosition.y += UPSTAIRS_SPAWN_NUDGE_XYZ.y;
    spawnPosition.z += UPSTAIRS_SPAWN_NUDGE_XYZ.z;

    return {
      position: spawnPosition,
      lookAt: new THREE.Vector3(
        spawnPosition.x
          + arrowAnchor.forward.x * UPSTAIRS_LOOK_FROM_SPAWN.forward
          + right.x * UPSTAIRS_LOOK_FROM_SPAWN.side,
        interiorEyeHeight + UPSTAIRS_LOOK_FROM_SPAWN.y + UPSTAIRS_LOOK_NUDGE_XYZ.y,
        spawnPosition.z
          + arrowAnchor.forward.z * UPSTAIRS_LOOK_FROM_SPAWN.forward
          + right.z * UPSTAIRS_LOOK_FROM_SPAWN.side,
      ).add(new THREE.Vector3(UPSTAIRS_LOOK_NUDGE_XYZ.x, 0, UPSTAIRS_LOOK_NUDGE_XYZ.z)),
    };
  };

  const placeStairArrowInFrontOfCamera = () => {
    controller.camera.getWorldPosition(cameraPositionVector);
    controller.camera.getWorldDirection(cameraForwardVector);
    cameraForwardVector.y = 0;
    if (cameraForwardVector.lengthSq() < 1e-6) {
      cameraForwardVector.set(0, 0, -1);
    } else {
      cameraForwardVector.normalize();
    }

    stairArrow.position.set(
      cameraPositionVector.x + cameraForwardVector.x * STAIR_ARROW_INITIAL_DISTANCE + STAIR_ARROW_MANUAL_OFFSET.x,
      interiorEyeHeight + STAIR_ARROW_INITIAL_HEIGHT_OFFSET + STAIR_ARROW_MANUAL_OFFSET.y,
      cameraPositionVector.z + cameraForwardVector.z * STAIR_ARROW_INITIAL_DISTANCE + STAIR_ARROW_MANUAL_OFFSET.z,
    );
    stairArrow.userData.baseY = stairArrow.position.y;
    stairArrow.visible = true;
    sceneState.stairArrowPlaced = true;
  };

  const placeBedroomDoorInFrontOfCamera = () => {
    controller.camera.getWorldPosition(cameraPositionVector);
    controller.camera.getWorldDirection(cameraForwardVector);
    cameraForwardVector.y = 0;
    if (cameraForwardVector.lengthSq() < 1e-6) {
      cameraForwardVector.set(0, 0, -1);
    } else {
      cameraForwardVector.normalize();
    }

    bedroomDoor.position.set(
      cameraPositionVector.x + cameraForwardVector.x * BEDROOM_DOOR_INITIAL_DISTANCE + BEDROOM_DOOR_MANUAL_OFFSET.x,
      interiorEyeHeight + BEDROOM_DOOR_INITIAL_HEIGHT_OFFSET + BEDROOM_DOOR_MANUAL_OFFSET.y,
      cameraPositionVector.z + cameraForwardVector.z * BEDROOM_DOOR_INITIAL_DISTANCE + BEDROOM_DOOR_MANUAL_OFFSET.z,
    );
    bedroomDoor.rotation.y = Math.atan2(cameraForwardVector.x, -cameraForwardVector.z)
      + THREE.MathUtils.degToRad(BEDROOM_DOOR_YAW_OFFSET_DEG);
    sceneState.bedroomDoorPlaced = true;
    setBedroomDoorVisibility(true);
  };

  const enterDuplexInterior = ({ fromBathroom = false, fromUpstairs = false } = {}) => {
    sceneState.isInsideDuplex = true;
    sceneState.isUpstairsFloor = fromUpstairs;
    if (fromBathroom) {
      sceneState.stairArrowUnlocked = true;
    }
    setEntryDoorVisibility(false);
    setBathroomDoorVisibility(true);
    setBedroomDoorVisibility(sceneState.bedroomDoorPlaced && sceneState.isUpstairsFloor);
    setStairArrowVisibility(sceneState.stairArrowPlaced && sceneState.stairArrowUnlocked && !sceneState.isUpstairsFloor);
    setPersonaje3ColliderVisibility(true);
    setPersonaje4ColliderVisibility(true);

    if (sceneState.duplexWorldBox) {
      const interiorView = sceneState.interiorSpawnView ?? getInteriorViewFromBox(sceneState.duplexWorldBox);
      const targetView = {
        position: interiorView.position.clone(),
        lookAt: rotateLookRight90(interiorView.position, interiorView.lookAt),
        eyeHeight: interiorEyeHeight,
      };

      if (fromBathroom) {
        const forcedReturnView = sceneState.bathroomReturnView ?? getBathroomReturnView();
        if (forcedReturnView) {
          targetView.position = forcedReturnView.position.clone();
          targetView.lookAt = forcedReturnView.lookAt.clone();
        }
      } else if (fromUpstairs) {
        const returnView = sceneState.bathroomReturnView ?? getBathroomReturnView();
        const upstairsView = getUpstairsViewFromReturn(returnView);
        if (upstairsView) {
          targetView.position = upstairsView.position.clone();
          targetView.lookAt = upstairsView.lookAt.clone();
          targetView.eyeHeight = upstairsView.position.y;
          targetView.position.y = targetView.eyeHeight;
          targetView.lookAt.y += targetView.eyeHeight - interiorEyeHeight;
        }
      }

      controller.eyeHeight = targetView.eyeHeight;
      controller.setPosition(targetView.position);
      controller.lookAt(targetView.lookAt);
      if (!sceneState.stairArrowPlaced) {
        placeStairArrowInFrontOfCamera();
      }
      setStairArrowVisibility(sceneState.stairArrowUnlocked && !sceneState.isUpstairsFloor);
      if (BEDROOM_DOOR_REPOSITION_EACH_ENTRY || !sceneState.bedroomDoorPlaced) {
        placeBedroomDoorInFrontOfCamera();
      }
      setBedroomDoorVisibility(sceneState.isUpstairsFloor);
      hud?.setSceneLabel(sceneState.isUpstairsFloor ? 'Upstairs' : 'Interior');
      return;
    }

    const fallbackInsideEyeY = interiorEyeHeight;
    controller.eyeHeight = interiorEyeHeight;
    const fallbackPosition = new THREE.Vector3(0.4, fallbackInsideEyeY, 1.55);
    const fallbackLookAt = new THREE.Vector3(0.4, fallbackInsideEyeY + 0.05, -1.1);
    controller.setPosition(fallbackPosition);
    controller.lookAt(rotateLookRight90(fallbackPosition, fallbackLookAt));
    setStairArrowVisibility(sceneState.stairArrowUnlocked && !sceneState.isUpstairsFloor);
    if (BEDROOM_DOOR_REPOSITION_EACH_ENTRY || !sceneState.bedroomDoorPlaced) {
      placeBedroomDoorInFrontOfCamera();
    }
    setBedroomDoorVisibility(sceneState.isUpstairsFloor);
    hud?.setSceneLabel(sceneState.isUpstairsFloor ? 'Upstairs' : 'Interior');
  };

  const detectInteriorFloorPoint = (box) => {
    const size = box.getSize(new THREE.Vector3());
    const minX = box.min.x + size.x * 0.1;
    const maxX = box.max.x - size.x * 0.1;
    const nearFacadeZ = box.max.z - size.z * 0.08;
    const deepInsideZ = box.max.z - size.z * 0.62;
    const originY = box.max.y + 3.5;
    const hits = [];

    const xSamples = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const zSamples = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const xi of xSamples) {
      const x = THREE.MathUtils.lerp(minX, maxX, xi / 8);
      for (const zi of zSamples) {
        const z = THREE.MathUtils.lerp(nearFacadeZ, deepInsideZ, zi / 9);
        probingRaycaster.set(new THREE.Vector3(x, originY, z), downDirection);
        const rayHits = probingRaycaster.intersectObject(duplexAnchor, true);
        const floorHit = rayHits.find((hit) => {
          if (!hit.face) {
            return false;
          }

          const worldNormalY = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y;
          return worldNormalY > 0.55;
        });

        if (floorHit) {
          hits.push(floorHit.point.clone());
        }
      }
    }

    if (hits.length === 0) {
      return null;
    }

    const probeEyeY = (controller.eyeHeight ?? 1.65) - 0.2;
    const maxWallDistance = Math.max(size.x, size.z) * 0.7;
    const best = {
      candidate: null,
      wallCount: 0,
      score: -1,
    };

    hits.forEach((point) => {
      const sampleOrigin = new THREE.Vector3(point.x, probeEyeY, point.z);
      const wallStats = sideDirections.reduce((acc, direction) => {
        probingRaycaster.set(sampleOrigin, direction);
        const wallHit = probingRaycaster
          .intersectObject(duplexAnchor, true)
          .find((hit) => hit.distance > 0.2 && hit.distance < maxWallDistance);

        if (wallHit) {
          acc.count += 1;
          acc.distance += wallHit.distance;
        }
        return acc;
      }, { count: 0, distance: 0 });

      // Prioritize candidates enclosed by 4 walls; fallback to most enclosed.
      const score = wallStats.count * 1000 - wallStats.distance;
      if (score > best.score) {
        best.score = score;
        best.candidate = point;
        best.wallCount = wallStats.count;
      }
    });

    if (!best.candidate) {
      return null;
    }

    return { point: best.candidate, wallCount: best.wallCount };
  };

  const getInteriorViewFromBox = (box) => {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const floorPoint = sceneState.detectedFloorInfo?.point ?? new THREE.Vector3(center.x, box.min.y, center.z);
    const interiorZ = Math.min(floorPoint.z + INTERIOR_SPAWN_OFFSET.z, entryDoor.position.z - size.z * 0.22);
    const spawnX = floorPoint.x + INTERIOR_SPAWN_OFFSET.x;

    return {
      position: new THREE.Vector3(
        spawnX,
        interiorEyeHeight,
        interiorZ,
      ),
      lookAt: new THREE.Vector3(
        spawnX,
        interiorEyeHeight + 0.06,
        interiorZ + INTERIOR_SPAWN_OFFSET.lookZ,
      ),
    };
  };

  const rotateLookRight90 = (position, lookAt) => {
    const forward = lookAt.clone().sub(position);
    forward.y = 0;

    if (forward.lengthSq() < 1e-6) {
      return lookAt.clone();
    }

    forward.normalize();
    const right = forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI * 0.5);

    return new THREE.Vector3(
      position.x + right.x,
      lookAt.y,
      position.z + right.z,
    );
  };

  const setupInteriorParty = (box) => {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const floorPoint = sceneState.detectedFloorInfo?.point ?? new THREE.Vector3(center.x, box.min.y, center.z);
    const interiorBaseZ = Math.min(floorPoint.z - size.z * 0.06, entryDoor.position.z - size.z * 0.3);
    const ceilingY = floorPoint.y + Math.max(2.3, size.y * 0.22);
    const lightSpreadX = Math.max(1.2, size.x * 0.2);
    const lightSpreadZ = Math.max(1.1, size.z * 0.14);

    const lightSetups = [
      { x: floorPoint.x, y: ceilingY, z: interiorBaseZ, hue: 0.02, pulse: 0.0 },
      { x: floorPoint.x - lightSpreadX, y: ceilingY - 0.2, z: interiorBaseZ - lightSpreadZ, hue: 0.28, pulse: 1.3 },
      { x: floorPoint.x + lightSpreadX, y: ceilingY - 0.26, z: interiorBaseZ - lightSpreadZ * 1.2, hue: 0.56, pulse: 2.1 },
      { x: floorPoint.x, y: ceilingY - 0.34, z: interiorBaseZ - lightSpreadZ * 2.0, hue: 0.84, pulse: 2.8 },
    ];

    lightSetups.forEach((setup) => {
      const light = new THREE.PointLight('#ff58c5', 0, Math.max(6, size.x * 0.9), 1.7);
      light.position.set(setup.x, setup.y, setup.z);
      duplexAnchor.add(light);
      partyLights.push({ light, hueOffset: setup.hue, pulseOffset: setup.pulse });
    });

    const residents = [
      {
        id: 'PROTA',
        url: '/models/characters/PROTA.glb',
        offsetX: -Math.max(0.55, size.x * 0.09),
        offsetZ: -Math.max(0.75, size.z * 0.12),
        yaw: 0.1,
        motionPhase: 0.2,
        motionRadius: 0.42,
        motionSpeed: 1.0,
        targetHeight: 1.6,
      },
      {
        id: 'PERSONAJE3',
        url: '/models/characters/PERSONAJE3.glb',
        offsetX: Math.max(0.65, size.x * 0.12),
        offsetZ: -Math.max(0.5, size.z * 0.08),
        yaw: -0.35,
        motionPhase: 1.7,
        motionRadius: 0.36,
        motionSpeed: 1.15,
        targetHeight: 1.55,
      },
      {
        id: 'PERSONAJE4',
        url: '/models/characters/PERSONAJE4.glb',
        offsetX: 0,
        offsetZ: -Math.max(1.05, size.z * 0.17),
        yaw: Math.PI,
        motionPhase: 3.0,
        motionRadius: 0.48,
        motionSpeed: 0.9,
        targetHeight: 1.52,
      },
    ];

    residents.forEach((resident) => {
      const manual = RESIDENTS_TUNING[resident.id] ?? { x: 0, y: 0, z: 0, scale: 1 };
      const anchor = new THREE.Group();
      const origin = new THREE.Vector3(
        floorPoint.x + resident.offsetX + manual.x,
        floorPoint.y + RESIDENTS_GLB_FLOOR_OFFSET + manual.y,
        interiorBaseZ + resident.offsetZ + manual.z,
      );
      anchor.position.copy(origin);
      anchor.rotation.y = resident.yaw;
      duplexAnchor.add(anchor);
      movingResidents.push({
        anchor,
        origin,
        yawBase: resident.yaw,
        phase: resident.motionPhase,
        radius: resident.motionRadius,
        speed: resident.motionSpeed,
      });

      if (resident.id === 'PERSONAJE3') {
        anchor.add(personaje3TalkCollider);
      }
      if (resident.id === 'PERSONAJE4') {
        anchor.add(personaje4TalkCollider);
      }

      loadModelInstance(resident.url)
        .then(({ model, animations }) => {
          if (sceneState.disposed) {
            return;
          }

          stylizeModelMaterials(model, {
            roughness: 0.5,
            metalness: 0.07,
            emissiveIntensity: 0.12,
          });
          normalizeModelToHeight(
            model,
            resident.targetHeight * CHARACTER_GLB_SCALE_MULTIPLIER * manual.scale,
          );
          if (resident.id === 'PERSONAJE3') {
            brightenCharacter(model, {
              colorBoost: CHARACTER3_COLOR_BOOST,
              emissiveMin: CHARACTER3_EMISSIVE_MIN,
              emissiveMax: CHARACTER3_EMISSIVE_MAX,
              roughnessMax: 1,
              roughnessMin: CHARACTER3_ROUGHNESS_MIN,
              metalnessMax: CHARACTER3_METALNESS_MAX,
              envMapIntensityMax: CHARACTER3_ENV_MAP_INTENSITY_MAX,
            });
          } else {
            brightenCharacter(model);
          }
          model.rotation.y = 0.1;
          anchor.add(model);

          if (resident.id === 'PERSONAJE3') {
            anchor.updateWorldMatrix(true, true);
            fitColliderToModelBounds(personaje3TalkCollider, model);
          }
          if (resident.id === 'PERSONAJE4') {
            anchor.updateWorldMatrix(true, true);
            fitColliderToModelBounds(personaje4TalkCollider, model, {
              paddingXZ: PERSONAJE4_COLLIDER_PADDING_XZ,
              paddingY: PERSONAJE4_COLLIDER_PADDING_Y,
            });
          }

          const animator = createModelAnimationController(model, animations, 1);
          if (animator) {
            modelAnimators.push(animator);
          }
        })
        .catch((error) => {
          console.warn(`Could not load ${resident.url}`, error);
        });
    });
  };

  loadModelInstance('/models/map/Duplex2.glb')
    .then(({ model }) => {
      if (sceneState.disposed) {
        return;
      }

      stylizeModelMaterials(model, {
        roughness: 0.64,
        metalness: 0.06,
        emissiveIntensity: 0.03,
      });
      normalizeModelToHeight(model, 10.0);
      model.position.z = -0.25;
      duplexAnchor.add(model);

      duplexAnchor.updateWorldMatrix(true, true);
      sceneState.duplexWorldBox = new THREE.Box3().setFromObject(duplexAnchor);
      placeDoorsFromBox(sceneState.duplexWorldBox);
      sceneState.detectedFloorInfo = detectInteriorFloorPoint(sceneState.duplexWorldBox);
      if (!sceneState.detectedFloorInfo) {
        console.warn('Could not find enclosed interior floor point in duplex model.');
      } else if (sceneState.detectedFloorInfo.wallCount < 4) {
        console.warn(`Duplex interior is not fully enclosed (detected walls: ${sceneState.detectedFloorInfo.wallCount}/4).`);
      }
      sceneState.interiorSpawnView = getInteriorViewFromBox(sceneState.duplexWorldBox);
      sceneState.bathroomReturnView = getBathroomReturnView();
      setupInteriorParty(sceneState.duplexWorldBox);
      placeCameraFromBox(sceneState.duplexWorldBox);
      if (forceInteriorEntryFromBathroom) {
        sceneState.bathroomDoorUnlocked = true;
        enterDuplexInterior({ fromBathroom: true });
      } else if (forceUpstairsEntry) {
        sceneState.bathroomDoorUnlocked = true;
        enterDuplexInterior({ fromUpstairs: true });
      }
    })
    .catch((error) => {
      console.warn('Could not load /models/map/Duplex2.glb', error);
    });

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(45, 14, 10),
    new THREE.MeshBasicMaterial({ color: '#101426', side: THREE.BackSide }),
  );

  const sentence = createTextBillboard('I came to get my money.', {
    color: '#ffd2ef',
    glow: '#ff4ca9',
    background: 'rgba(0, 0, 0, 0.45)',
    scale: 1.8,
  });
  sentence.mesh.position.set(0, 5.8, 7.2);

  const bedroomDoorMarker = createTextBillboard('BEDROOM', {
    color: '#ffe7ff',
    glow: '#ff4fcf',
    background: 'rgba(9, 6, 14, 0.5)',
    scale: 0.95,
    width: 760,
    height: 170,
  });
  bedroomDoorMarker.mesh.visible = false;

  updatables.push((_, time) => {
    sentence.faceCamera(controller.camera);
    sentence.mesh.position.y = 5.8 + Math.sin(time * 1.2) * 0.12;
    bedroomDoorMarker.mesh.visible = bedroomDoor.visible;
    if (bedroomDoorMarker.mesh.visible) {
      bedroomDoorMarker.faceCamera(controller.camera);
      bedroomDoorMarker.mesh.position.set(
        bedroomDoor.position.x,
        bedroomDoor.position.y + BEDROOM_DOOR_SIZE.height * 0.75,
        bedroomDoor.position.z,
      );
    }
    entryDoor.material.emissiveIntensity = DOOR_RECTANGLE_EMISSIVE_BASE + Math.sin(time * 3.1) * 0.32;
    bathroomDoor.material.emissiveIntensity = DOOR_RECTANGLE_EMISSIVE_BASE + Math.sin(time * 3.6) * 0.36;
    bedroomDoor.material.emissiveIntensity = 1.05 + Math.sin(time * 4.1) * 0.28;
    porchLight.intensity = 5.1 + Math.sin(time * 2.8) * 1.05;
    if (stairArrow.visible) {
      stairArrowMaterial.opacity = 0.78 + (Math.sin(time * 5.4) * 0.5 + 0.5) * 0.2;
      stairArrow.position.y = (stairArrow.userData.baseY ?? stairArrow.position.y) + Math.sin(time * 3.1) * 0.08;
      stairArrow.rotation.y += 0.02;
    }

    const partyMultiplier = sceneState.isInsideDuplex ? 1 : 0.35;
    partyLights.forEach((entry, index) => {
      const hue = (time * 0.24 + entry.hueOffset) % 1;
      const pulse = 0.55 + 0.45 * Math.sin(time * (5.4 + index * 0.85) + entry.pulseOffset);
      entry.light.color.setHSL(hue, 0.94, 0.62);
      entry.light.intensity = (2.3 + pulse * 3.1) * partyMultiplier;
    });

    const beamMultiplier = sceneState.isInsideDuplex ? 1 : 0.22;
    partyBeamA.color.setHSL((time * 0.33) % 1, 0.95, 0.58);
    partyBeamB.color.setHSL((time * 0.33 + 0.37) % 1, 0.95, 0.58);
    partyBeamA.intensity = (2.4 + Math.sin(time * 7.4) * 1.15) * beamMultiplier;
    partyBeamB.intensity = (2.2 + Math.cos(time * 6.9) * 1.1) * beamMultiplier;
    partyTargetA.position.x = -0.9 + Math.sin(time * 0.9) * 1.4;
    partyTargetB.position.x = 0.8 + Math.cos(time * 1.0) * 1.35;
    skyFill.intensity = 0.58 + Math.sin(time * 2.4) * 0.08;
    ambient.intensity = 0.68 + Math.sin(time * 2.2 + 0.8) * 0.07;

    movingResidents.forEach((resident) => {
      const t = time * resident.speed + resident.phase;
      resident.anchor.position.x = resident.origin.x + Math.sin(t) * resident.radius;
      resident.anchor.position.z = resident.origin.z + Math.cos(t * 1.15) * resident.radius * 0.55;
      resident.anchor.position.y = resident.origin.y;
      resident.anchor.rotation.y = resident.yawBase + Math.sin(t * 1.5) * 0.5;
    });
  });

  updatables.push((deltaTime) => {
    modelAnimators.forEach((animator) => animator.update(deltaTime));
  });

  root.add(
    ground,
    sky,
    duplexAnchor,
    entryDoor,
    bathroomDoor,
    bedroomDoor,
    ambient,
    moon,
    skyFill,
    porchLight,
    partyBeamA,
    partyBeamB,
    partyTargetA,
    partyTargetB,
    sentence.mesh,
    bedroomDoorMarker.mesh,
  );

  return {
    id: 'exterior',
    label: forceUpstairsEntry ? 'Upstairs' : ((forceInteriorEntryFromBathroom) ? 'Interior' : 'Exterior'),
    root,
    background: '#090915',
    fog: {
      color: '#12182d',
      near: 8,
      far: 70,
    },
    spawn: new THREE.Vector3(-0.35, 1.65, 4.4),
    lookAt: new THREE.Vector3(-0.35, 1.75, 2.4),
    turn: {
      minDeg: -52,
      maxDeg: 52,
      stepDeg: 14,
    },
    bounds: {
      minX: -18,
      maxX: 18,
      minZ: -2.5,
      maxZ: 16,
    },
    updatables,
    interactions: [
      {
        object: entryDoor,
        label: 'enter',
        onClick: async () => {
          enterDuplexInterior();
        },
      },
      {
        object: stairArrow,
        label: 'upstairs',
        onClick: async () => {
          await sceneManager.goTo('upstairs', { color: '#120f16' });
        },
      },
      {
        object: bedroomDoor,
        label: 'bedroom',
        onClick: async () => {
          await sceneManager.goTo('finalBedroom', { color: '#000000' });
        },
      },
      {
        object: personaje3TalkCollider,
        label: 'talk',
        onClick: async () => {
          if (sceneState.bathroomDoorUnlocked) {
            await dialogue?.showLine('CHARACTER 3: I told you already, the bathroom door is open.');
            return;
          }

          if (!dialogue) {
            sceneState.bathroomDoorUnlocked = true;
            hud?.showCenterMessage('Bathroom unlocked');
            return;
          }

          await dialogue.showLine('CHARACTER 3: The bathroom is locked. Not everyone gets in.');

          // Conversation gate: insist to get hints, then unlock.
          while (!sceneState.bathroomDoorUnlocked) {
            const choice = await dialogue.showChoice('What do you want me to do?', [
              { id: 'insist', label: 'insist' },
              { id: 'ask', label: 'open the door' },
            ]);

            if (choice === 'insist') {
              sceneState.personaje3HintStep += 1;

              if (sceneState.personaje3HintStep === 1) {
                await dialogue.showLine('CHARACTER 3: Hint: follow the blue light in the corridor.');
                continue;
              }

              if (sceneState.personaje3HintStep === 2) {
                await dialogue.showLine('CHARACTER 3: Another hint: do not look down, look behind the mirror.');
                continue;
              }

              await dialogue.showLine('CHARACTER 3: Fine. You insist well. I will let you pass.');
              sceneState.bathroomDoorUnlocked = true;
              hud?.showCenterMessage('Bathroom unlocked');
              return;
            }

            await dialogue.showLine('CHARACTER 3: Fine. Go in, look around, and come back out.');
            sceneState.bathroomDoorUnlocked = true;
            hud?.showCenterMessage('Bathroom unlocked');
          }
        },
      },
      {
        object: personaje4TalkCollider,
        label: 'talk',
        onClick: async () => {
          if (!dialogue) {
            hud?.showCenterMessage('Upstairs is loud tonight');
            return;
          }

          await dialogue.showLine('CHARACTER 4: If you like this floor, wait until you see upstairs.');
        },
      },
      {
        object: bathroomDoor,
        label: 'bathroom',
        onClick: async () => {
          if (!sceneState.bathroomDoorUnlocked) {
            await dialogue?.showLine('The bathroom door is locked. Talk to CHARACTER 3.');
            return;
          }

          await sceneManager.goTo('bathroom', { color: '#0f1924' });
        },
      },
    ],
    cleanup: [
      () => {
        sceneState.disposed = true;
        controller.eyeHeight = originalEyeHeight;
        modelAnimators.forEach((animator) => animator.dispose());
      },
    ],
  };
}
