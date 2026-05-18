import * as THREE from 'three';
import { createRoom, createStandardMaterial } from '../objects/ScenePrimitives';
import {
  createModelAnimationController,
  loadModelInstance,
  normalizeModelToHeight,
  stylizeModelMaterials,
} from '../utils/ModelLoader';

export function createFinalBedroomScene({ sceneManager, dialogue, controller, hud, transition }) {
  sceneManager.setFlag('disableRetroPass', false);
  sceneManager.setFlag('hideTurnControls', false);
  const root = new THREE.Group();
  const updatables = [];
  const sceneState = {
    disposed: false,
    finalAnimator: null,
    finalModel: null,
    endingStarted: false,
    replayLocked: false,
  };

  const FINAL_CAMERA_HEIGHT_OFFSET = 0.2; // AJUSTE RAPIDO: altura extra de camara en sala final
  const FINAL_CAMERA_SPAWN_Z = 2.2; // AJUSTE RAPIDO: distancia de camara al personaje final (50% mas cerca que 4.4)
  const FINAL_CHARACTER_URL = '/models/characters/PERSONAJE%20FINAL.glb'; // AJUSTE RAPIDO: modelo final
  const FINAL_CHARACTER_SCALE = 0.36; // AJUSTE RAPIDO: escala personaje final (0.36 = 60% mas pequeno que 0.9)
  const FINAL_CHARACTER_YAW_OFFSET_DEG = 180; // AJUSTE RAPIDO: giro extra del personaje final en grados
  const FINAL_CHARACTER_HITBOX_PADDING_XZ = 1.3; // AJUSTE RAPIDO: ancho/fondo hitbox personaje final
  const FINAL_CHARACTER_HITBOX_PADDING_Y = 6.0; // AJUSTE RAPIDO: hitbox vertical completa personaje final
  const ENDING_LINE_READ_MS = 2600; // AJUSTE RAPIDO: tiempo de lectura de frase potente
  const ENDING_FINAL_FADE_MS = 520; // AJUSTE RAPIDO: duracion fade entre frase y cierre final
  const ENDING_SOLID_YELLOW = '#ffdf00'; // AJUSTE RAPIDO: unico amarillo banana intenso para toda la secuencia final
  const FINAL_CHARACTER_TUNING = {
    x: 0,
    y: 0,
    z: 0,
    scale: FINAL_CHARACTER_SCALE,
    yaw: Math.PI + THREE.MathUtils.degToRad(FINAL_CHARACTER_YAW_OFFSET_DEG),
    targetHeight: 1.82,
  }; // AJUSTE RAPIDO: posicion/escala/rotacion personaje final

  const previousEyeHeight = controller.eyeHeight ?? 1.65;
  const finalEyeHeight = previousEyeHeight + FINAL_CAMERA_HEIGHT_OFFSET;
  controller.eyeHeight = finalEyeHeight;

  const room = createRoom({
    width: 12,
    depth: 12,
    height: 4.8,
    floorColor: ENDING_SOLID_YELLOW,
    wallColor: ENDING_SOLID_YELLOW,
    ceilingColor: ENDING_SOLID_YELLOW,
  });

  const ambient = new THREE.AmbientLight('#fff27a', 1.28);
  const hemi = new THREE.HemisphereLight('#fff14a', '#ffdf00', 0.72);
  const key = new THREE.PointLight('#ffe91f', 3.1, 16, 1.2);
  key.position.set(0, 3.3, 1.2);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.92, 0.28, 24),
    createStandardMaterial({
      color: '#ffe84a',
      emissive: '#e3c600',
      emissiveIntensity: 0.34,
      roughness: 0.5,
      metalness: 0.04,
    }),
  );
  pedestal.position.set(0, 0.14, 0);

  const finalCharacterAnchor = new THREE.Group();
  finalCharacterAnchor.position.set(
    FINAL_CHARACTER_TUNING.x,
    FINAL_CHARACTER_TUNING.y,
    FINAL_CHARACTER_TUNING.z,
  );
  finalCharacterAnchor.rotation.y = FINAL_CHARACTER_TUNING.yaw;

  const finalTalkCollider = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.4, 1.2),
    createStandardMaterial({
      color: '#ffffff',
      emissive: '#d6e8ff',
      emissiveIntensity: 0.1,
      roughness: 1,
      metalness: 0,
    }),
  );
  finalTalkCollider.material.transparent = true;
  finalTalkCollider.material.opacity = 0.02;
  finalTalkCollider.position.set(0, 1.2, 0);
  finalCharacterAnchor.add(finalTalkCollider);

  const endingRoot = document.createElement('div');
  endingRoot.className = 'prototype-ending';

  const endingLine = document.createElement('p');
  endingLine.className = 'prototype-ending-line';

  const endingFinal = document.createElement('div');
  endingFinal.className = 'prototype-ending-final';

  const endingCode = document.createElement('p');
  endingCode.className = 'prototype-ending-code';

  const endingText = document.createElement('p');
  endingText.className = 'prototype-ending-text';

  const replayButton = document.createElement('button');
  replayButton.className = 'prototype-ending-replay';
  replayButton.type = 'button';
  replayButton.textContent = 'Replay';

  endingFinal.append(endingCode, endingText, replayButton);
  endingRoot.append(endingLine, endingFinal);
  document.body.appendChild(endingRoot);

  const wait = (ms) => new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

  const setEndingMode = (mode) => {
    endingRoot.classList.toggle('is-visible', mode !== 'hidden');
    endingRoot.classList.toggle('is-line', mode === 'line');
    endingRoot.classList.toggle('is-final', mode === 'final');
  };

  const setFinalTalkColliderInteractive = (interactive) => {
    finalTalkCollider.visible = interactive;
    finalTalkCollider.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.layers.set(interactive ? 0 : 1);
    });
  };

  const endingContentByChoice = {
    pink_goat: {
      line: 'YOU CHOSE THE PINK GOAT. DESIRE OVER ACCOUNTING.',
      code: 'MASK-PINK-17',
    },
    money: {
      line: 'YOU CHOSE THE MONEY. VALUE OVER MYTH.',
      code: 'MASK-CASH-17',
    },
    both: {
      line: 'YOU CHOSE BOTH. GREED WITH STYLE.',
      code: 'MASK-DUAL-17',
    },
  };

  const fitColliderToModelBounds = (collider, model) => {
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) {
      return;
    }

    const size = bounds.getSize(new THREE.Vector3());
    const centerWorld = bounds.getCenter(new THREE.Vector3());
    const centerLocal = collider.parent ? collider.parent.worldToLocal(centerWorld.clone()) : centerWorld;

    collider.geometry.dispose();
    collider.geometry = new THREE.BoxGeometry(
      Math.max(size.x * FINAL_CHARACTER_HITBOX_PADDING_XZ, 1.0),
      Math.max(size.y * FINAL_CHARACTER_HITBOX_PADDING_Y, 2.2),
      Math.max(size.z * FINAL_CHARACTER_HITBOX_PADDING_XZ, 1.0),
    );
    collider.position.copy(centerLocal);
  };

  loadModelInstance(FINAL_CHARACTER_URL)
    .then(({ model, animations }) => {
      if (sceneState.disposed) {
        return;
      }

      stylizeModelMaterials(model, {
        roughness: 0.5,
        metalness: 0.04,
        emissiveIntensity: 0.02,
      });
      normalizeModelToHeight(model, FINAL_CHARACTER_TUNING.targetHeight * FINAL_CHARACTER_TUNING.scale);
      model.traverse((child) => {
        if (!child.isMesh || !child.material) {
          return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material.color) {
            material.color.multiplyScalar(1.05);
          }
          if ('emissiveIntensity' in material) {
            material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity ?? 0, 0.02), 0.08);
          }
          material.needsUpdate = true;
        });
      });

      finalCharacterAnchor.add(model);
      sceneState.finalModel = model;
      fitColliderToModelBounds(finalTalkCollider, model);
      sceneState.finalAnimator = createModelAnimationController(model, animations, 0.85);
    })
    .catch((error) => {
      console.warn(`Could not load ${FINAL_CHARACTER_URL}`, error);
    });

  updatables.push((deltaTime, time) => {
    sceneState.finalAnimator?.update(deltaTime);
    key.intensity = 2.65 + Math.sin(time * 2.3) * 0.28;
    pedestal.material.emissiveIntensity = 0.22 + Math.sin(time * 2.9) * 0.07;

    if (sceneState.finalModel) {
      sceneState.finalModel.position.y = Math.sin(time * 1.1) * 0.03;
      sceneState.finalModel.rotation.z = Math.sin(time * 0.8) * 0.03;
    }
  });

  const runEndingSequence = async (choice) => {
    const selected = endingContentByChoice[choice] ?? endingContentByChoice.both;

    sceneManager.setFlag('disableRetroPass', true);
    sceneManager.setFlag('hideTurnControls', true);
    setFinalTalkColliderInteractive(false);
    sceneManager.interactionSystem?.setEnabled(false);
    room.visible = false;
    pedestal.visible = false;
    finalCharacterAnchor.visible = false;
    ambient.visible = false;
    hemi.visible = false;
    key.visible = false;
    controller.setEnabled(false);
    hud?.setPrompt('');
    hud?.setHint('');

    // Avoid pure white clipping so the retro post-process stays visible.
    const endingYellow = new THREE.Color(ENDING_SOLID_YELLOW);
    sceneManager.scene.background = endingYellow;
    if (sceneManager.scene.fog) {
      sceneManager.scene.fog.color.copy(endingYellow);
    }

    endingLine.textContent = selected.line;
    setEndingMode('line');

    if (transition) {
      await transition.fadeOut({ color: ENDING_SOLID_YELLOW, duration: 0.82 });
      await transition.fadeIn({ duration: 0.62 });
    }

    await wait(ENDING_LINE_READ_MS);

    endingCode.textContent = `DISCOUNT CODE: ${selected.code}`;
    endingText.textContent = 'END OF PROTOTYPE. THIS IS ONLY A TEST FROM THE LAMASKARADE UNIVERSE.';
    endingRoot.classList.add('is-fading');
    await wait(ENDING_FINAL_FADE_MS);
    endingRoot.classList.remove('is-fading');
    setEndingMode('final');
  };

  replayButton.addEventListener('click', async () => {
    if (sceneState.replayLocked) {
      return;
    }

    sceneState.replayLocked = true;
    setEndingMode('hidden');
    hud?.hideCenterMessage();

    // Restart from the true beginning of the prototype.
    sceneManager.state.bathroomUnlocked = false;
    sceneManager.setFlag('interiorEntryFromBathroom', false);
    sceneManager.setFlag('upstairsEntry', false);
    window.dispatchEvent(new CustomEvent('lamask:showStartScreen'));
    sceneState.replayLocked = false;
  });

  root.add(room, ambient, hemi, key, pedestal, finalCharacterAnchor);

  return {
    id: 'finalBedroom',
    label: '',
    root,
    background: ENDING_SOLID_YELLOW,
    fog: {
      color: ENDING_SOLID_YELLOW,
      near: 4,
      far: 24,
    },
    spawn: new THREE.Vector3(0, finalEyeHeight, FINAL_CAMERA_SPAWN_Z),
    lookAt: new THREE.Vector3(0, finalEyeHeight + 0.02, 0),
    turn: {
      minDeg: -70,
      maxDeg: 70,
      stepDeg: 14,
      initialDeg: 0,
    },
    bounds: {
      minX: -4.8,
      maxX: 4.8,
      minZ: -4.8,
      maxZ: 4.8,
    },
    updatables,
    interactions: [
      {
        object: finalTalkCollider,
        label: '',
        onClick: async () => {
          if (sceneState.endingStarted) {
            return;
          }

          if (!dialogue) {
            hud?.showCenterMessage('Final prototype choice');
            return;
          }

          sceneState.endingStarted = true;
          await dialogue.showLine('FINAL CHARACTER: Last question.');

          const choice = await dialogue.showChoice('What do you want: the pink goat or the money?', [
            { id: 'pink_goat', label: 'pink goat' },
            { id: 'money', label: 'money' },
            { id: 'both', label: 'both' },
          ]);

          await runEndingSequence(choice);
        },
      },
    ],
    cleanup: [
      () => {
        sceneState.disposed = true;
        sceneManager.setFlag('disableRetroPass', false);
        sceneManager.setFlag('hideTurnControls', false);
        sceneManager.interactionSystem?.setEnabled(true);
        endingRoot.remove();
        controller.eyeHeight = previousEyeHeight;
        sceneState.finalAnimator?.dispose();
      },
    ],
  };
}
