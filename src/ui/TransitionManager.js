import { gsap } from 'gsap';

export class TransitionManager {
  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'transition-overlay';
    document.body.appendChild(this.overlay);
  }

  async fadeOut({ duration = 0.9, color = '#000000' } = {}) {
    this.overlay.style.background = color;
    this.overlay.style.pointerEvents = 'auto';

    await this.#tweenTo({
      opacity: 1,
      duration,
      ease: 'power2.inOut',
    });
  }

  async fadeIn({ duration = 0.9 } = {}) {
    await this.#tweenTo({
      opacity: 0,
      duration,
      ease: 'power2.inOut',
    });

    this.overlay.style.pointerEvents = 'none';
  }

  async flash({ duration = 0.45, color = '#ffffff' } = {}) {
    this.overlay.style.background = color;
    this.overlay.style.pointerEvents = 'auto';

    await this.#tweenTo({
      opacity: 1,
      duration,
      ease: 'power1.out',
    });

    await this.#tweenTo({
      opacity: 0,
      duration,
      ease: 'power2.in',
    });

    this.overlay.style.pointerEvents = 'none';
  }

  #tweenTo(config) {
    return new Promise((resolve) => {
      gsap.to(this.overlay, {
        ...config,
        onComplete: resolve,
      });
    });
  }
}
