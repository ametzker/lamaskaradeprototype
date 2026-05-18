export class DialogueSystem {
  constructor({ onVisibilityChange } = {}) {
    this.onVisibilityChange = onVisibilityChange;
    this.visible = false;

    this.root = document.createElement('div');
    this.root.className = 'dialogue-root';

    this.panel = document.createElement('div');
    this.panel.className = 'dialogue-panel';

    this.line = document.createElement('p');
    this.line.className = 'dialogue-line';

    this.actions = document.createElement('div');
    this.actions.className = 'dialogue-actions';

    this.panel.append(this.line, this.actions);
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
  }

  isOpen() {
    return this.visible;
  }

  async showLine(text, actionLabel = 'continue') {
    return new Promise((resolve) => {
      this.#open();
      this.line.textContent = text;
      this.actions.innerHTML = '';

      const button = this.#makeButton(actionLabel, () => {
        this.#close();
        resolve();
      });

      this.actions.appendChild(button);
    });
  }

  async showChoice(text, choices = []) {
    return new Promise((resolve) => {
      this.#open();
      this.line.textContent = text;
      this.actions.innerHTML = '';

      choices.forEach((choice) => {
        const normalized = typeof choice === 'string'
          ? { id: choice, label: choice }
          : choice;

        const button = this.#makeButton(normalized.label, () => {
          this.#close();
          resolve(normalized.id);
        });

        this.actions.appendChild(button);
      });
    });
  }

  #makeButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'dialogue-button';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick, { once: true });
    return button;
  }

  #open() {
    this.visible = true;
    this.root.classList.add('is-visible');
    this.onVisibilityChange?.(true);
  }

  #close() {
    this.visible = false;
    this.root.classList.remove('is-visible');
    this.onVisibilityChange?.(false);
  }
}
