import * as THREE from 'three';

export class ClickOnlyCameraController {
  constructor({ camera, scene, eyeHeight = 1.65 }) {
    this.camera = camera;
    this.scene = scene;
    this.eyeHeight = eyeHeight;

    this.anchor = new THREE.Object3D();
    this.anchor.position.set(0, eyeHeight, 0);
    this.anchor.add(camera);
    this.scene.add(this.anchor);

    this.enabled = true;
    this.lockedAnchorPosition = this.anchor.position.clone();

    this.baseYaw = 0;
    this.pitch = 0;
    this.yawOffset = 0;
    this.targetYawOffset = 0;
    this.minYawOffset = THREE.MathUtils.degToRad(-55);
    this.maxYawOffset = THREE.MathUtils.degToRad(55);
    this.turnStep = THREE.MathUtils.degToRad(16);
    this.turnSmoothing = 12;
  }

  requestPointerLock() {}

  setEnabled(flag) {
    this.enabled = flag;
  }

  setPosition(position) {
    this.anchor.position.copy(position);
    this.anchor.position.y = this.eyeHeight;
    this.lockedAnchorPosition.copy(this.anchor.position);
  }

  lookAt(target) {
    const direction = new THREE.Vector3().subVectors(target, this.anchor.position).normalize();
    this.baseYaw = Math.atan2(direction.x, -direction.z);
    this.pitch = -Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
    this.yawOffset = 0;
    this.targetYawOffset = 0;
    this.#applyTransform();
  }

  configureTurn({
    minDeg = -55,
    maxDeg = 55,
    stepDeg = 16,
    initialDeg = 0,
  } = {}) {
    this.minYawOffset = THREE.MathUtils.degToRad(minDeg);
    this.maxYawOffset = THREE.MathUtils.degToRad(maxDeg);
    this.turnStep = THREE.MathUtils.degToRad(stepDeg);

    const initialOffset = THREE.MathUtils.clamp(
      THREE.MathUtils.degToRad(initialDeg),
      this.minYawOffset,
      this.maxYawOffset,
    );

    this.yawOffset = initialOffset;
    this.targetYawOffset = initialOffset;
    this.#applyTransform();
  }

  turnLeft() {
    this.rotateBy(-this.turnStep);
  }

  turnRight() {
    this.rotateBy(this.turnStep);
  }

  rotateBy(deltaRadians) {
    if (!this.enabled) {
      return;
    }

    this.targetYawOffset = THREE.MathUtils.clamp(
      this.targetYawOffset + deltaRadians,
      this.minYawOffset,
      this.maxYawOffset,
    );
  }

  setTurnOffsetRadians(offsetRadians, { immediate = true } = {}) {
    const clamped = THREE.MathUtils.clamp(offsetRadians, this.minYawOffset, this.maxYawOffset);
    this.targetYawOffset = clamped;

    if (immediate) {
      this.yawOffset = clamped;
      this.#applyTransform();
    }
  }

  getTurnState() {
    return {
      minYawOffset: this.minYawOffset,
      maxYawOffset: this.maxYawOffset,
      turnStep: this.turnStep,
      yawOffset: this.yawOffset,
      targetYawOffset: this.targetYawOffset,
    };
  }

  getObject() {
    return this.anchor;
  }

  getPosition(target = new THREE.Vector3()) {
    return target.copy(this.anchor.position);
  }

  update(deltaTime = 0) {
    if (!this.enabled) {
      return;
    }

    this.anchor.position.copy(this.lockedAnchorPosition);

    if (deltaTime > 0) {
      this.yawOffset = THREE.MathUtils.damp(
        this.yawOffset,
        this.targetYawOffset,
        this.turnSmoothing,
        deltaTime,
      );
    } else {
      this.yawOffset = this.targetYawOffset;
    }

    this.#applyTransform();
  }

  #applyTransform() {
    this.anchor.rotation.set(0, this.baseYaw + this.yawOffset, 0);
    this.camera.rotation.set(this.pitch, 0, 0);
  }
}
