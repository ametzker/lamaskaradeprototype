import { Howl, Howler } from 'howler';
import { getSceneAudioLayers } from './syntheticLoops';

export class AudioManager {
  constructor() {
    this.unlocked = false;
    this.currentScene = null;
    this.activeHowls = [];
  }

  async unlock() {
    if (this.unlocked) {
      return;
    }

    try {
      await Howler.ctx.resume();
    } catch (error) {
      // Ignore context resume issues on browsers that auto-unlock.
    }

    this.unlocked = true;

    if (this.currentScene) {
      this.#playSceneInternal(this.currentScene);
    }
  }

  playScene(sceneId) {
    if (sceneId === this.currentScene && this.activeHowls.length > 0) {
      return;
    }

    this.currentScene = sceneId;

    if (!this.unlocked) {
      return;
    }

    this.#playSceneInternal(sceneId);
  }

  #playSceneInternal(sceneId) {
    const layers = getSceneAudioLayers(sceneId);

    this.activeHowls.forEach(({ howl, gain }) => {
      howl.fade(gain, 0, 900);
      window.setTimeout(() => howl.stop(), 950);
    });

    this.activeHowls = layers.map((layer) => {
      const howl = new Howl({
        src: [layer.src],
        loop: true,
        volume: 0,
        html5: false,
      });

      howl.rate(layer.rate);
      howl.play();
      howl.fade(0, layer.volume, 1200);

      return {
        howl,
        gain: layer.volume,
      };
    });
  }
}
