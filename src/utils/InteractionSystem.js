import * as THREE from 'three';

export class InteractionSystem {
  constructor({ camera, hud }) {
    this.camera = camera;
    this.hud = hud;

    this.raycaster = new THREE.Raycaster();
    this.objects = [];
    this.entryByMeshId = new Map();
    this.hoveredEntry = null;
    this.emissiveCache = new WeakMap();
    this.enabled = true;
    this.pointer = new THREE.Vector2(0, 0);
  }

  setEnabled(flag) {
    this.enabled = flag;
    if (!flag) {
      this.#setHover(null);
      this.hud.setPrompt('');
    }
  }

  clear() {
    this.#setHover(null);
    this.objects.length = 0;
    this.entryByMeshId.clear();
    this.hud.setPrompt('');
  }

  register(target, config) {
    const entry = {
      target,
      label: config.label ?? 'click',
      onClick: config.onClick,
      onHoverStart: config.onHoverStart,
      onHoverEnd: config.onHoverEnd,
    };

    target.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      this.objects.push(child);
      this.entryByMeshId.set(child.id, entry);
    });
  }

  setPointerFromScreen(clientX, clientY) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;

    this.pointer.x = (clientX / width) * 2 - 1;
    this.pointer.y = -(clientY / height) * 2 + 1;
  }

  update() {
    if (!this.enabled || this.objects.length === 0) {
      this.#setHover(null);
      return;
    }

    this.#setHover(this.#getEntryAtPointer());
  }

  async click(event) {
    if (!this.enabled) {
      return;
    }

    if (event?.clientX != null && event?.clientY != null) {
      this.setPointerFromScreen(event.clientX, event.clientY);
    }

    const entry = this.#getEntryAtPointer();
    this.#setHover(entry);

    if (!entry?.onClick) {
      return;
    }

    await entry.onClick();
  }

  #getEntryAtPointer() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.objects, false);

    const firstHit = intersections.find((hit) => this.entryByMeshId.has(hit.object.id));
    return firstHit ? this.entryByMeshId.get(firstHit.object.id) : null;
  }

  #setHover(entry) {
    if (this.hoveredEntry === entry) {
      return;
    }

    if (this.hoveredEntry) {
      this.#setEntryGlow(this.hoveredEntry, false);
      this.hoveredEntry.onHoverEnd?.();
    }

    this.hoveredEntry = entry;

    if (this.hoveredEntry) {
      this.hud.setPrompt(this.hoveredEntry.label);
      this.#setEntryGlow(this.hoveredEntry, true);
      this.hoveredEntry.onHoverStart?.();
      return;
    }

    this.hud.setPrompt('');
  }

  #setEntryGlow(entry, active) {
    entry.target.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!('emissiveIntensity' in material)) {
          return;
        }

        if (!this.emissiveCache.has(material)) {
          this.emissiveCache.set(material, material.emissiveIntensity ?? 0);
        }

        const baseIntensity = this.emissiveCache.get(material);
        material.emissiveIntensity = active ? baseIntensity + 0.5 : baseIntensity;
      });
    });
  }
}
