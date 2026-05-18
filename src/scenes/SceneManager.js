import * as THREE from 'three';
import { SCENE_ORDER, SCENE_REGISTRY } from './sceneRegistry';

const DEBUG_RESPAWN_AFTER_STAIRS_ARROW = false; // AJUSTE RAPIDO: respawn temporal tras flecha de escaleras

export class SceneManager {
  constructor({
    scene,
    controller,
    interactionSystem,
    audioManager,
    dialogueSystem,
    transitionManager,
    hud,
  }) {
    this.scene = scene;
    this.controller = controller;
    this.interactionSystem = interactionSystem;
    this.audioManager = audioManager;
    this.dialogueSystem = dialogueSystem;
    this.transitionManager = transitionManager;
    this.hud = hud;

    this.current = null;
    this.transitioning = false;

    this.state = {
      bathroomUnlocked: false,
      interactionLocks: 0,
    };
  }

  async start() {
    if (DEBUG_RESPAWN_AFTER_STAIRS_ARROW) {
      await this.goTo('upstairs', { initial: true, color: '#000000' });
      return;
    }

    await this.goTo(SCENE_ORDER[0], { initial: true, color: '#000000' });
  }

  async restart() {
    this.state.bathroomUnlocked = false;
    this.setFlag('interiorEntryFromBathroom', false);
    this.setFlag('upstairsEntry', false);

    if (DEBUG_RESPAWN_AFTER_STAIRS_ARROW) {
      await this.goTo('upstairs', { initial: true, color: '#000000' });
      return;
    }

    await this.goTo(SCENE_ORDER[0], { initial: true, color: '#000000' });
  }

  lockInteractions() {
    this.state.interactionLocks += 1;
    this.interactionSystem.setEnabled(false);
  }

  unlockInteractions() {
    this.state.interactionLocks = Math.max(0, this.state.interactionLocks - 1);
    if (this.state.interactionLocks === 0) {
      this.interactionSystem.setEnabled(true);
    }
  }

  setFlag(name, value = true) {
    this.state[name] = value;
  }

  getFlag(name) {
    return Boolean(this.state[name]);
  }

  getCurrentId() {
    return this.current?.id ?? null;
  }

  async goTo(sceneId, { color = '#000000', initial = false } = {}) {
    if (this.transitioning) {
      return;
    }

    const factory = SCENE_REGISTRY[sceneId];
    if (!factory) {
      throw new Error(`Unknown scene: ${sceneId}`);
    }

    this.transitioning = true;
    this.lockInteractions();
    this.controller.setEnabled(false);

    if (!initial) {
      await this.transitionManager.fadeOut({ color, duration: 0.85 });
    }

    this.#teardownCurrentScene();

    const context = this.#makeContext();
    const nextScene = factory(context);

    this.current = nextScene;

    this.scene.add(nextScene.root);
    this.#applyEnvironment(nextScene);

    this.controller.setPosition(nextScene.spawn ?? new THREE.Vector3(0, this.controller.eyeHeight, 0));
    if (nextScene.lookAt) {
      this.controller.lookAt(nextScene.lookAt);
    }
    this.controller.configureTurn?.(nextScene.turn ?? {});

    (nextScene.interactions ?? []).forEach((entry) => {
      this.interactionSystem.register(entry.object, {
        label: entry.label,
        onClick: entry.onClick,
        onHoverStart: entry.onHoverStart,
        onHoverEnd: entry.onHoverEnd,
      });
    });

    this.audioManager.playScene(sceneId);
    this.hud.setSceneLabel(nextScene.label ?? sceneId);

    await nextScene.onEnter?.(context);

    if (!initial) {
      await this.transitionManager.fadeIn({ duration: 0.85 });
    }

    this.controller.setEnabled(true);
    this.unlockInteractions();
    this.transitioning = false;
  }

  update(deltaTime, elapsedTime) {
    if (!this.current) {
      return;
    }

    if (this.current.bounds) {
      const player = this.controller.getObject().position;
      player.x = THREE.MathUtils.clamp(player.x, this.current.bounds.minX, this.current.bounds.maxX);
      player.z = THREE.MathUtils.clamp(player.z, this.current.bounds.minZ, this.current.bounds.maxZ);
    }

    this.current.updatables?.forEach((update) => {
      update(deltaTime, elapsedTime);
    });
  }

  #makeContext() {
    return {
      sceneManager: this,
      state: this.state,
      dialogue: this.dialogueSystem,
      transition: this.transitionManager,
      hud: this.hud,
      controller: this.controller,
    };
  }

  #applyEnvironment(sceneData) {
    if (sceneData.background) {
      this.scene.background = new THREE.Color(sceneData.background);
    }

    if (sceneData.fog) {
      this.scene.fog = new THREE.Fog(sceneData.fog.color, sceneData.fog.near, sceneData.fog.far);
    } else {
      this.scene.fog = null;
    }
  }

  #teardownCurrentScene() {
    this.interactionSystem.clear();

    if (!this.current) {
      return;
    }

    this.current.onExit?.();
    this.current.cleanup?.forEach((fn) => fn?.());

    this.scene.remove(this.current.root);
    this.current = null;
  }
}
