import * as THREE from 'three';

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

export class FirstPersonController {
  constructor({ camera, domElement, scene, speed = 2.1, lookSpeed = 0.0017 }) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.speed = speed;
    this.lookSpeed = lookSpeed;
    this.enabled = true;
    this.eyeHeight = 1.65;

    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(this.camera);

    this.yawObject = new THREE.Object3D();
    this.yawObject.position.set(0, this.eyeHeight, 0);
    this.yawObject.add(this.pitchObject);

    this.scene.add(this.yawObject);

    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    };

    this.#bindEvents();
  }

  #bindEvents() {
    window.addEventListener('keydown', (event) => {
      if (MOVE_KEYS.includes(event.code)) {
        this.keys[event.code] = true;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (MOVE_KEYS.includes(event.code)) {
        this.keys[event.code] = false;
      }
    });

    window.addEventListener('mousemove', (event) => {
      if (!this.enabled || document.pointerLockElement !== this.domElement) {
        return;
      }

      this.yawObject.rotation.y -= event.movementX * this.lookSpeed;
      this.pitchObject.rotation.x -= event.movementY * this.lookSpeed;
      this.pitchObject.rotation.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitchObject.rotation.x));
    });
  }

  requestPointerLock() {
    this.domElement.requestPointerLock?.();
  }

  setEnabled(flag) {
    this.enabled = flag;
    if (!flag && document.pointerLockElement === this.domElement) {
      document.exitPointerLock?.();
    }
  }

  setPosition(position) {
    this.yawObject.position.copy(position);
    this.yawObject.position.y = this.eyeHeight;
  }

  lookAt(target) {
    const direction = new THREE.Vector3().subVectors(target, this.yawObject.position).normalize();
    const yaw = Math.atan2(direction.x, -direction.z);
    const pitch = -Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));

    this.yawObject.rotation.y = yaw;
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(pitch, -Math.PI / 2.3, Math.PI / 2.3);
  }

  getObject() {
    return this.yawObject;
  }

  getPosition(target = new THREE.Vector3()) {
    return target.copy(this.yawObject.position);
  }

  update(deltaTime) {
    if (!this.enabled) {
      return;
    }

    const moveZ = Number(this.keys.KeyW || this.keys.ArrowUp) - Number(this.keys.KeyS || this.keys.ArrowDown);
    const moveX = Number(this.keys.KeyD || this.keys.ArrowRight) - Number(this.keys.KeyA || this.keys.ArrowLeft);

    if (moveX === 0 && moveZ === 0) {
      return;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.yawObject.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.yawObject.quaternion);
    right.y = 0;
    right.normalize();

    const movement = new THREE.Vector3();
    movement.addScaledVector(forward, moveZ);
    movement.addScaledVector(right, moveX);

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(this.speed * deltaTime);
      this.yawObject.position.add(movement);
    }
  }
}
