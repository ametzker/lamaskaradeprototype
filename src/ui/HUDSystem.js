export class HUDSystem {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'hud-root';

    this.crosshair = document.createElement('div');
    this.crosshair.className = 'hud-crosshair';

    this.prompt = document.createElement('div');
    this.prompt.className = 'hud-prompt';

    this.hint = document.createElement('div');
    this.hint.className = 'hud-hint';
    this.hint.textContent = 'click to enter';

    this.sceneLabel = document.createElement('div');
    this.sceneLabel.className = 'hud-scene-label';

    this.centerMessage = document.createElement('div');
    this.centerMessage.className = 'hud-center-message';

    this.root.append(this.crosshair, this.prompt, this.hint, this.sceneLabel, this.centerMessage);
    document.body.appendChild(this.root);

    this.centerMessageTimer = null;
  }

  enableClickOnlyMode() {
    this.root.classList.add('click-only');
    this.setHint('');
  }

  setPrompt(text = '') {
    this.prompt.textContent = text;
    this.prompt.classList.toggle('is-visible', Boolean(text));
  }

  setHint(text = '') {
    this.hint.textContent = text;
    this.hint.classList.toggle('is-visible', Boolean(text));
  }

  setSceneLabel(text = '') {
    this.sceneLabel.textContent = text;
    this.sceneLabel.classList.toggle('is-visible', Boolean(text));

    if (text) {
      window.clearTimeout(this.sceneLabelTimer);
      this.sceneLabelTimer = window.setTimeout(() => {
        this.sceneLabel.classList.remove('is-visible');
      }, 2200);
    }
  }

  showCenterMessage(text, durationMs = 1800) {
    this.centerMessage.textContent = text;
    this.centerMessage.classList.add('is-visible');

    window.clearTimeout(this.centerMessageTimer);
    if (durationMs > 0) {
      this.centerMessageTimer = window.setTimeout(() => {
        this.centerMessage.classList.remove('is-visible');
      }, durationMs);
    }
  }

  hideCenterMessage() {
    window.clearTimeout(this.centerMessageTimer);
    this.centerMessage.classList.remove('is-visible');
  }
}
