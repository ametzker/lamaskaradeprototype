const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export class CameraTurnControls {
  constructor({ controller }) {
    this.controller = controller;
    this.enabled = true;
    this.dragging = false;
    this.lastRangeKey = '';

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

    this.slider.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.dragging = true;
    });

    this.slider.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      this.dragging = false;
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
    this.slider.disabled = !flag;
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
}
