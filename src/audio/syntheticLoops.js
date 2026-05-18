const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function toBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }

  return btoa(binary);
}

function buildWaveDataUri({ duration, sampleRate, generator }) {
  const sampleCount = Math.floor(duration * sampleRate);
  const byteLength = 44 + sampleCount * 2;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  let offset = 44;
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const sample = clamp(generator(t, i / sampleCount), -1, 1);
    view.setInt16(offset, sample * 32767, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  return `data:audio/wav;base64,${toBase64(bytes)}`;
}

function renderProfile(profile, seed) {
  const rng = makeRng(seed);
  const duration = 4;
  const sampleRate = 16000;

  return buildWaveDataUri({
    duration,
    sampleRate,
    generator: (t, phase) => {
      const pulse = (frequency, width = 0.2) => {
        const cycle = (t * frequency) % 1;
        return cycle < width ? 1 - cycle / width : 0;
      };

      const noise = rng() * 2 - 1;

      switch (profile) {
        case 'wind': {
          const sway = Math.sin(t * 0.5) * 0.2;
          return noise * 0.16 + sway;
        }
        case 'distantParty': {
          const bass = Math.sin(TAU * 46 * t) * pulse(2.1, 0.32);
          const hat = (noise * 0.25) * pulse(8.5, 0.08);
          return bass * 0.6 + hat * 0.35;
        }
        case 'house': {
          const beat = Math.sin(TAU * 120 * t) * pulse(2.03, 0.27);
          const synth = Math.sin(TAU * 260 * t + Math.sin(t * 1.3)) * 0.3;
          return beat * 0.55 + synth * 0.35 + noise * 0.1;
        }
        case 'crowd': {
          const murmur = Math.sin(TAU * (140 + 40 * Math.sin(t * 0.2)) * t) * 0.2;
          return murmur + noise * 0.25;
        }
        case 'fridge': {
          return Math.sin(TAU * 58 * t) * 0.35 + Math.sin(TAU * 116 * t) * 0.12;
        }
        case 'metal': {
          const tick = pulse(6 + Math.sin(t) * 2, 0.03);
          const ring = Math.sin(TAU * 900 * t) * Math.exp(-((phase * 8) % 1) * 5);
          return noise * 0.08 + tick * ring * 0.65;
        }
        case 'bathroom': {
          const tone = Math.sin(TAU * 170 * t + Math.sin(t * 0.4) * 2.5);
          const echo = Math.sin(TAU * 87 * t + Math.sin(t * 1.5)) * 0.5;
          return tone * 0.26 + echo * 0.2 + noise * 0.18;
        }
        case 'drone': {
          const sub = Math.sin(TAU * 34 * t);
          const wobble = Math.sin(TAU * 0.25 * t) * 0.3;
          return sub * (0.65 + wobble) + noise * 0.05;
        }
        case 'heaven': {
          const pad = Math.sin(TAU * 220 * t) * 0.2 + Math.sin(TAU * 330 * t) * 0.12;
          const shimmer = Math.sin(TAU * 12 * t + Math.sin(t * 0.8) * 5) * 0.08;
          return pad + shimmer;
        }
        default:
          return noise * 0.1;
      }
    },
  });
}

const SCENE_LAYERS = {
  exterior: [
    { profile: 'wind', volume: 0.25, rate: 0.9 },
    { profile: 'distantParty', volume: 0.22, rate: 0.86 },
  ],
  livingRoom: [
    { profile: 'house', volume: 0.4, rate: 1 },
    { profile: 'crowd', volume: 0.23, rate: 0.9 },
  ],
  upstairs: [
    { profile: 'house', volume: 0.42, rate: 1.03 },
    { profile: 'crowd', volume: 0.2, rate: 0.95 },
  ],
  kitchen: [
    { profile: 'fridge', volume: 0.3, rate: 1.02 },
    { profile: 'metal', volume: 0.15, rate: 0.94 },
    { profile: 'distantParty', volume: 0.11, rate: 0.75 },
  ],
  bathroom: [
    { profile: 'bathroom', volume: 0.24, rate: 0.84 },
    { profile: 'house', volume: 0.14, rate: 0.72 },
  ],
  darkRoom: [
    { profile: 'drone', volume: 0.34, rate: 0.74 },
    { profile: 'crowd', volume: 0.08, rate: 0.5 },
  ],
  heaven: [
    { profile: 'heaven', volume: 0.2, rate: 0.63 },
  ],
};

const srcCache = new Map();

export function getSceneAudioLayers(sceneId) {
  const layers = SCENE_LAYERS[sceneId] ?? [];

  return layers.map((layer, index) => {
    const key = `${layer.profile}-${index}`;

    if (!srcCache.has(key)) {
      srcCache.set(key, renderProfile(layer.profile, 3891 + index * 17 + layer.profile.length * 5));
    }

    return {
      src: srcCache.get(key),
      volume: layer.volume,
      rate: layer.rate,
    };
  });
}
