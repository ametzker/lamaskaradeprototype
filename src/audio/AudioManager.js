const TRACKS = [
  '/models/music/Safety%20Trance%20-%20se%20me%20ocurrio%20(Official%20Visualizer)%20-%20Safety%20Trance.mp3',
  '/models/music/Destruccion%20-%20Safety%20Trance.mp3',
];

const FIRST_TO_SECOND_CROSSFADE_SECONDS = 1.8;

const SCENE_SPACE_BY_ID = {
  upstairs: 'upstairs',
  bathroom: 'bathroom',
  finalBedroom: 'finalChoice',
};

const SPACE_PROFILES = {
  exterior: {
    gain: 0.62,
    lowpassHz: 1200,
    highpassHz: 110,
    reverbMix: 0.14,
  },
  interior: {
    gain: 0.9,
    lowpassHz: 18000,
    highpassHz: 36,
    reverbMix: 0.04,
  },
  bathroom: {
    gain: 0.76,
    lowpassHz: 2600,
    highpassHz: 210,
    reverbMix: 0.58,
  },
  upstairs: {
    gain: 0.47,
    lowpassHz: 700,
    highpassHz: 95,
    reverbMix: 0.24,
  },
  finalChoice: {
    gain: 0.4,
    lowpassHz: 240,
    highpassHz: 24,
    reverbMix: 0.2,
  },
};

const DIALOGUE_DUCKING = {
  gainMultiplier: 0.82,
  lowpassMultiplier: 0.9,
  highpassBoost: 18,
  wetBoost: 0.03,
};

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeImpulseResponse(context, { duration = 1.3, decay = 2.2 } = {}) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / (length - 1);
      const envelope = Math.pow(1 - t, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }

  return impulse;
}

export class AudioManager {
  constructor() {
    this.unlocked = false;
    this.currentScene = null;
    this.currentSpace = null;

    this.context = null;
    this.masterGain = null;
    this.sceneGain = null;
    this.lowpass = null;
    this.highpass = null;
    this.reverbSend = null;
    this.reverbReturn = null;
    this.reverb = null;
    this.dryGain = null;
    this.mixBus = null;

    this.trackStates = [];
    this.activeTrackIndex = 0;
    this.playbackStarted = false;
    this.pendingCrossfade = false;
    this.dialogueActive = false;
  }

  async unlock() {
    this.#ensureGraph();

    if (this.context?.state === 'suspended') {
      try {
        await this.context.resume();
      } catch (error) {
        // Ignore resume failures and keep trying in future gestures.
      }
    }

    this.unlocked = true;

    if (this.currentScene) {
      this.playScene(this.currentScene);
    }
  }

  playScene(sceneId) {
    this.currentScene = sceneId;
    const defaultSpace = SCENE_SPACE_BY_ID[sceneId];
    if (defaultSpace) {
      this.setSpace(defaultSpace);
    }

    if (!this.unlocked) {
      return;
    }

    this.#ensurePlaybackStarted();
  }

  setSpace(spaceId, { duration = 0.9, immediate = false } = {}) {
    this.currentSpace = spaceId;
    this.#applyCurrentSpace({ duration, immediate });
  }

  setDialogueActive(active, { duration = 0.22, immediate = false } = {}) {
    this.dialogueActive = Boolean(active);
    this.#applyCurrentSpace({ duration, immediate });
  }

  #applyCurrentSpace({ duration = 0.9, immediate = false } = {}) {
    if (!this.context) {
      return;
    }

    const baseProfile = SPACE_PROFILES[this.currentSpace] ?? SPACE_PROFILES.interior;
    const ducking = this.dialogueActive ? DIALOGUE_DUCKING : null;
    const gainValue = clamp(
      baseProfile.gain * (ducking ? ducking.gainMultiplier : 1),
      0,
      1.4,
    );
    const lowpassValue = clamp(
      baseProfile.lowpassHz * (ducking ? ducking.lowpassMultiplier : 1),
      180,
      22000,
    );
    const highpassValue = clamp(
      baseProfile.highpassHz + (ducking ? ducking.highpassBoost : 0),
      20,
      1200,
    );
    const wet = clamp(
      baseProfile.reverbMix + (ducking ? ducking.wetBoost : 0),
      0,
      0.98,
    );
    const dry = 1 - wet;

    const now = this.context.currentTime;
    const rampSeconds = immediate ? 0.001 : Math.max(0.06, duration);

    this.sceneGain.gain.cancelScheduledValues(now);
    this.lowpass.frequency.cancelScheduledValues(now);
    this.highpass.frequency.cancelScheduledValues(now);
    this.reverbReturn.gain.cancelScheduledValues(now);
    this.dryGain.gain.cancelScheduledValues(now);

    this.sceneGain.gain.setTargetAtTime(gainValue, now, rampSeconds * 0.28);
    this.lowpass.frequency.setTargetAtTime(lowpassValue, now, rampSeconds * 0.22);
    this.highpass.frequency.setTargetAtTime(highpassValue, now, rampSeconds * 0.22);
    this.reverbReturn.gain.setTargetAtTime(wet, now, rampSeconds * 0.3);
    this.dryGain.gain.setTargetAtTime(dry, now, rampSeconds * 0.3);
  }

  async fadeOutAndReset({ duration = 1.05 } = {}) {
    if (!this.context) {
      this.#resetTrackPlaybackState();
      return;
    }

    const now = this.context.currentTime;
    const safeDuration = Math.max(0.05, duration);
    const currentGain = this.masterGain.gain.value;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(currentGain, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + safeDuration);

    await wait(Math.ceil(safeDuration * 1000));

    this.trackStates.forEach((trackState) => {
      try {
        trackState.element.pause();
      } catch (error) {
        // Ignore pause failures.
      }
      trackState.element.currentTime = 0;
      trackState.gain.gain.setValueAtTime(0, this.context.currentTime);
    });

    this.#resetTrackPlaybackState();
    this.masterGain.gain.setValueAtTime(1, this.context.currentTime);
  }

  #ensureGraph() {
    if (this.context) {
      return;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    this.context = new AudioContextCtor();

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 1;

    this.sceneGain = this.context.createGain();
    this.sceneGain.gain.value = SPACE_PROFILES.exterior.gain;

    this.mixBus = this.context.createGain();
    this.mixBus.gain.value = 1;

    this.lowpass = this.context.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = SPACE_PROFILES.exterior.lowpassHz;
    this.lowpass.Q.value = 0.8;

    this.highpass = this.context.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = SPACE_PROFILES.exterior.highpassHz;
    this.highpass.Q.value = 0.4;

    this.dryGain = this.context.createGain();
    this.reverbSend = this.context.createGain();
    this.reverbReturn = this.context.createGain();
    this.reverb = this.context.createConvolver();

    this.reverb.buffer = makeImpulseResponse(this.context, {
      duration: 1.35,
      decay: 2.05,
    });

    const initialWet = SPACE_PROFILES.exterior.reverbMix;
    this.reverbReturn.gain.value = initialWet;
    this.dryGain.gain.value = 1 - initialWet;
    this.reverbSend.gain.value = 0.8;

    this.mixBus.connect(this.sceneGain);
    this.sceneGain.connect(this.lowpass);
    this.lowpass.connect(this.highpass);
    this.highpass.connect(this.dryGain);
    this.dryGain.connect(this.masterGain);
    this.highpass.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.reverbReturn);
    this.reverbReturn.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.trackStates = TRACKS.map((src, index) => this.#createTrackState(src, index));
    this.#applyCurrentSpace({ immediate: true, duration: 0.01 });
  }

  #createTrackState(src, index) {
    const element = new Audio(src);
    element.preload = 'auto';
    element.crossOrigin = 'anonymous';
    element.loop = index === 1;

    const source = this.context.createMediaElementSource(element);
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.mixBus);

    element.addEventListener('timeupdate', () => {
      if (!this.playbackStarted || this.pendingCrossfade || this.activeTrackIndex !== 0 || index !== 0) {
        return;
      }

      if (!Number.isFinite(element.duration) || element.duration <= 0) {
        return;
      }

      const remaining = element.duration - element.currentTime;
      if (remaining <= FIRST_TO_SECOND_CROSSFADE_SECONDS) {
        this.#startFirstToSecondCrossfade();
      }
    });

    element.addEventListener('ended', () => {
      if (this.activeTrackIndex !== 0 || index !== 0) {
        return;
      }

      if (!this.pendingCrossfade) {
        this.#hardSwitchToSecondTrack();
      }
    });

    return {
      element,
      gain,
    };
  }

  #ensurePlaybackStarted() {
    if (!this.context || this.playbackStarted || this.trackStates.length === 0) {
      return;
    }

    const first = this.trackStates[0];
    const second = this.trackStates[1];
    if (!first) {
      return;
    }

    this.activeTrackIndex = 0;
    this.pendingCrossfade = false;

    first.element.currentTime = 0;
    first.gain.gain.setValueAtTime(0, this.context.currentTime);
    first.element.play().then(() => {
      const now = this.context.currentTime;
      first.gain.gain.cancelScheduledValues(now);
      first.gain.gain.setValueAtTime(0, now);
      first.gain.gain.linearRampToValueAtTime(1, now + 1.1);
    }).catch(() => {
      // Playback can fail before user gesture; unlock() will retry.
    });

    if (second) {
      second.element.pause();
      second.element.currentTime = 0;
      second.gain.gain.setValueAtTime(0, this.context.currentTime);
    }

    this.playbackStarted = true;
  }

  #startFirstToSecondCrossfade() {
    if (!this.context || this.pendingCrossfade || this.trackStates.length < 2) {
      return;
    }

    const first = this.trackStates[0];
    const second = this.trackStates[1];
    this.pendingCrossfade = true;

    second.element.currentTime = 0;
    second.gain.gain.setValueAtTime(0, this.context.currentTime);
    second.element.play().then(() => {
      const now = this.context.currentTime;
      const fadeSeconds = FIRST_TO_SECOND_CROSSFADE_SECONDS;

      first.gain.gain.cancelScheduledValues(now);
      second.gain.gain.cancelScheduledValues(now);
      first.gain.gain.setValueAtTime(first.gain.gain.value, now);
      second.gain.gain.setValueAtTime(0, now);
      first.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      second.gain.gain.linearRampToValueAtTime(1, now + fadeSeconds);

      window.setTimeout(() => {
        try {
          first.element.pause();
        } catch (error) {
          // Ignore pause failures.
        }
        first.element.currentTime = 0;
        this.activeTrackIndex = 1;
        this.pendingCrossfade = false;
      }, Math.ceil(fadeSeconds * 1000) + 20);
    }).catch(() => {
      this.pendingCrossfade = false;
    });
  }

  #hardSwitchToSecondTrack() {
    if (!this.context || this.trackStates.length < 2) {
      return;
    }

    const second = this.trackStates[1];
    this.activeTrackIndex = 1;
    second.gain.gain.setValueAtTime(1, this.context.currentTime);
    second.element.currentTime = 0;
    second.element.play().catch(() => {
      // If this fails, unlock will retry on next gesture.
    });
  }

  #resetTrackPlaybackState() {
    this.playbackStarted = false;
    this.pendingCrossfade = false;
    this.activeTrackIndex = 0;
    this.currentScene = null;
    this.currentSpace = null;
    this.dialogueActive = false;
  }
}
