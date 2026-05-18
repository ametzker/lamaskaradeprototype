const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export class CameraTurnControls {
  constructor({ controller }) {
    this.controller = controller;
    this.enabled = true;
    this.dragging = false;
    this.lastRangeKey = '';
    this.activePointerId = null;

    this.root = document.createElement('div');
    this.root.className = 'camera-turn-controls';

    this.shell = document.createElement('div');
    this.shell.className = 'camera-turn-slider-shell';
    this.shell.style.setProperty('--turn-progress', '50%');

    this.sliderWrap = document.createElement('div');
    this.sliderWrap.className = 'camera-turn-slider-wrap';

    this.sliderFill = document.createElement('div');
    this.sliderFill.className = 'camera-turn-slider-fill';

    this.slider = document.createElement('input');
    this.slider.className = 'camera-turn-slider';
    this.slider.type = 'range';
    this.slider.min = '-55';
    this.slider.max = '55';
    this.slider.step = '0.1';
    this.slider.value = '0';
    this.slider.setAttribute('aria-label', 'camera turn');

    this.sliderWrap.append(this.sliderFill, this.slider);
    this.shell.append(this.sliderWrap);
    this.root.appendChild(this.shell);
    document.body.appendChild(this.root);

    this.sliderWrap.addEventListener('pointerdown', (event) => {
      if (!this.enabled || !this.controller) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      this.dragging = true;
      this.activePointerId = event.pointerId ?? null;
      this.sliderWrap.setPointerCapture?.(event.pointerId);
      this.#setFromClientX(event.clientX);
    });

    this.sliderWrap.addEventListener('pointermove', (event) => {
      if (!this.dragging || !this.enabled || !this.controller) {
        return;
      }

      if (this.activePointerId != null && event.pointerId !== this.activePointerId) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      this.#setFromClientX(event.clientX);
    });

    this.sliderWrap.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      this.dragging = false;
      if (this.activePointerId != null && event.pointerId === this.activePointerId) {
        this.sliderWrap.releasePointerCapture?.(event.pointerId);
      }
      this.activePointerId = null;
    });

    this.sliderWrap.addEventListener('pointercancel', (event) => {
      event.stopPropagation();
      this.dragging = false;
      if (this.activePointerId != null && event.pointerId === this.activePointerId) {
        this.sliderWrap.releasePointerCapture?.(event.pointerId);
      }
      this.activePointerId = null;
    });

    this.slider.addEventListener('input', (event) => {
      event.stopPropagation();
      if (!this.enabled || !this.controller) {
        return;
      }

      const deg = Number(this.slider.value);
      // Inverted mapping so slider drag direction matches expected turn direction.
      this.controller.setTurnOffsetRadians(-deg * DEG_TO_RAD, { immediate: true });
      this.#updateReadout(deg, Number(this.slider.min), Number(this.slider.max));
    });
  }

  sync() {
    if (!this.controller?.getTurnState) {
      return;
    }

    const state = this.controller.getTurnState();
    const minDeg = state.minYawOffset * RAD_TO_DEG;
    const maxDeg = state.maxYawOffset * RAD_TO_DEG;
    const stepDeg = 0.1;
    const sliderMin = -maxDeg;
    const sliderMax = -minDeg;
    const rangeKey = `${sliderMin.toFixed(3)}|${sliderMax.toFixed(3)}|${stepDeg.toFixed(3)}`;

    if (this.lastRangeKey !== rangeKey) {
      this.lastRangeKey = rangeKey;
      this.slider.min = `${sliderMin}`;
      this.slider.max = `${sliderMax}`;
      this.slider.step = `${stepDeg}`;
    }

    if (!this.dragging) {
      this.slider.value = `${-state.targetYawOffset * RAD_TO_DEG}`;
    }

    this.#updateReadout(Number(this.slider.value), sliderMin, sliderMax);
  }

  setEnabled(flag) {
    this.enabled = flag;
    this.root.classList.toggle('is-disabled', !flag);
    if (!flag) {
      this.dragging = false;
      this.activePointerId = null;
    }
  }

  setVisible(flag) {
    this.root.classList.toggle('is-hidden', !flag);
  }

  #updateReadout(valueDeg, minDeg, maxDeg) {
    const span = maxDeg - minDeg;
    const progress = span <= 1e-6
      ? 50
      : ((valueDeg - minDeg) / span) * 100;
    const clampedProgress = Math.min(100, Math.max(0, progress));
    this.shell.style.setProperty('--turn-progress', `${clampedProgress.toFixed(2)}%`);
  }

  #setFromClientX(clientX) {
    const rect = this.sliderWrap.getBoundingClientRect();
    if (!rect.width) {
      return;
    }

    const ratio = (clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(1, Math.max(0, ratio));
    const min = Number(this.slider.min);
    const max = Number(this.slider.max);
    const nextDeg = min + clampedRatio * (max - min);

    this.slider.value = `${nextDeg}`;
    // Inverted mapping so drag direction matches turn direction.
    this.controller.setTurnOffsetRadians(-nextDeg * DEG_TO_RAD, { immediate: true });
    this.#updateReadout(nextDeg, min, max);
  }
}
