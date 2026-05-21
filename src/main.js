import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import './style.css';

import { SceneManager } from './scenes/SceneManager';
import { ClickOnlyCameraController } from './utils/ClickOnlyCameraController';
import { InteractionSystem } from './utils/InteractionSystem';
import { AudioManager } from './audio/AudioManager';
import { DialogueSystem } from './ui/DialogueSystem';
import { CameraTurnControls } from './ui/CameraTurnControls';
import { TransitionManager } from './ui/TransitionManager';
import { HUDSystem } from './ui/HUDSystem';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = false;
renderer.domElement.style.touchAction = 'none';
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 120);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.26,
  0.58,
  0.78,
);
composer.addPass(bloomPass);

const retroPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0 },
    uPixelSize: { value: 2.6 },
    uLevels: { value: 24.0 },
    uScanlineStrength: { value: 0.08 },
    uNoiseStrength: { value: 0.04 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uPixelSize;
    uniform float uLevels;
    uniform float uScanlineStrength;
    uniform float uNoiseStrength;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    vec3 quantize(vec3 c, float levels) {
      return floor(c * levels) / levels;
    }

    void main() {
      vec2 pixelGrid = uResolution / uPixelSize;
      vec2 uv = floor(vUv * pixelGrid) / pixelGrid;
      vec2 aberr = vec2(1.0 / uResolution.x, 0.0) * 0.85;

      float r = texture2D(tDiffuse, uv + aberr).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - aberr).b;
      vec3 col = vec3(r, g, b);

      col = quantize(col, uLevels);

      float scan = sin((uv.y * uResolution.y + uTime * 42.0) * 3.14159265);
      col *= 1.0 - (scan * 0.5 + 0.5) * uScanlineStrength;

      float grain = hash(uv * uResolution + vec2(uTime * 30.0, 17.0)) - 0.5;
      col += grain * uNoiseStrength;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
});
composer.addPass(retroPass);

const hud = new HUDSystem();
hud.enableClickOnlyMode();
const transitionManager = new TransitionManager();
const audioManager = new AudioManager();

const controller = new ClickOnlyCameraController({
  camera,
  scene,
});
const turnControls = new CameraTurnControls({
  controller,
});

const interactionSystem = new InteractionSystem({
  camera,
  hud,
});

const START_SCREEN_EVENT = 'lamask:showStartScreen';
const EXTERIOR_HELP_EVENT = 'lamask:showExteriorLookHelp';
let sceneManager;
let dialogueOpen = false;
let startScreenVisible = true;
let startScreenStarting = false;
let hasStartedOnce = false;
let exteriorHelpVisible = false;

const dialogue = new DialogueSystem({
  onVisibilityChange: (visible) => {
    dialogueOpen = visible;
    audioManager.setDialogueActive(visible);

    if (!sceneManager) {
      return;
    }

    if (visible) {
      sceneManager.lockInteractions();
      turnControls.setEnabled(false);
      return;
    }

    sceneManager.unlockInteractions();
    turnControls.setEnabled(true);
  },
});

sceneManager = new SceneManager({
  scene,
  controller,
  interactionSystem,
  audioManager,
  dialogueSystem: dialogue,
  transitionManager,
  hud,
});

const startScreen = document.createElement('div');
startScreen.className = 'prototype-start is-visible';

const startScreenStripe = document.createElement('div');
startScreenStripe.className = 'prototype-start-stripe';

const startScreenInner = document.createElement('div');
startScreenInner.className = 'prototype-start-inner';

const startScreenLogo = document.createElement('img');
startScreenLogo.className = 'prototype-start-logo';
startScreenLogo.src = '/logo/lamaskarade-logo.svg';
startScreenLogo.alt = 'LA MASKARADE';

const startScreenSubtitle = document.createElement('p');
startScreenSubtitle.className = 'prototype-start-subtitle';
startScreenSubtitle.textContent = 'The House Prototype';

const startScreenHint = document.createElement('button');
startScreenHint.className = 'prototype-start-cta';
startScreenHint.type = 'button';
startScreenHint.textContent = 'Click to start';

startScreenInner.append(startScreenLogo, startScreenSubtitle, startScreenHint);
startScreen.append(startScreenStripe, startScreenInner);
document.body.appendChild(startScreen);

const exteriorHelp = document.createElement('div');
exteriorHelp.className = 'prototype-help';

const exteriorHelpPanel = document.createElement('div');
exteriorHelpPanel.className = 'prototype-help-panel';

const exteriorHelpText = document.createElement('p');
exteriorHelpText.className = 'prototype-help-text';
exteriorHelpText.textContent = 'Use the yellow scroll bar to look around.';

const exteriorHelpButton = document.createElement('button');
exteriorHelpButton.className = 'prototype-help-ok';
exteriorHelpButton.type = 'button';
exteriorHelpButton.textContent = 'OK';

exteriorHelpPanel.append(exteriorHelpText, exteriorHelpButton);
exteriorHelp.append(exteriorHelpPanel);
document.body.appendChild(exteriorHelp);

const showExteriorHelp = () => {
  if (exteriorHelpVisible) {
    return;
  }

  exteriorHelpVisible = true;
  exteriorHelp.classList.add('is-visible');
  sceneManager?.lockInteractions();
  turnControls.setEnabled(false);
};

const hideExteriorHelp = () => {
  if (!exteriorHelpVisible) {
    return;
  }

  exteriorHelpVisible = false;
  exteriorHelp.classList.remove('is-visible');
  sceneManager?.unlockInteractions();
  turnControls.setEnabled(true);
};

exteriorHelp.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

exteriorHelpButton.addEventListener('click', (event) => {
  event.stopPropagation();
  hideExteriorHelp();
});

const showStartScreen = () => {
  hideExteriorHelp();
  startScreenVisible = true;
  startScreen.classList.add('is-visible');
  startScreen.classList.remove('is-starting');
  startScreenHint.disabled = false;
  startScreenHint.textContent = 'Click to start';
  hud.setPrompt('');
  hud.setHint('');
  hud.setSceneLabel('');
  sceneManager?.setFlag('exteriorLookHelpShown', false);
};

const hideStartScreen = () => {
  startScreenVisible = false;
  startScreen.classList.remove('is-visible');
  startScreen.classList.remove('is-starting');
  startScreenHint.disabled = false;
  startScreenHint.textContent = 'Click to start';
};

const startExperience = async () => {
  if (startScreenStarting) {
    return;
  }

  startScreenStarting = true;
  startScreen.classList.add('is-starting');
  startScreenHint.disabled = true;
  startScreenHint.textContent = 'Loading...';
  await audioManager.unlock();

  if (hasStartedOnce) {
    await sceneManager.restart();
  } else {
    await sceneManager.start();
    hasStartedOnce = true;
  }

  hideStartScreen();
  startScreenStarting = false;
};

startScreen.addEventListener('pointerdown', (event) => {
  event.stopPropagation();
});

startScreen.addEventListener('click', async (event) => {
  event.stopPropagation();
  await startExperience();
});

window.addEventListener(START_SCREEN_EVENT, () => {
  showStartScreen();
  void audioManager.fadeOutAndReset({ duration: 1.05 });
});

window.addEventListener(EXTERIOR_HELP_EVENT, () => {
  showExteriorHelp();
});

const syncTurnControlsState = () => {
  const canTurn = !startScreenVisible
    && !dialogueOpen
    && !exteriorHelpVisible
    && !sceneManager.transitioning
    && sceneManager.state.interactionLocks === 0;
  const hideTurnControls = startScreenVisible || exteriorHelpVisible || sceneManager.getFlag('hideTurnControls');
  turnControls.setVisible(!hideTurnControls);
  turnControls.setEnabled(canTurn);
};

window.addEventListener('pointermove', (event) => {
  interactionSystem.setPointerFromScreen(event.clientX, event.clientY);
});

window.addEventListener('pointerdown', async (event) => {
  if (event.button !== 0 || dialogueOpen || startScreenVisible || exteriorHelpVisible) {
    return;
  }

  interactionSystem.setPointerFromScreen(event.clientX, event.clientY);
  await audioManager.unlock();
  await interactionSystem.click(event);
});

renderer.domElement.addEventListener('touchmove', (event) => {
  event.preventDefault();
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  retroPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  controller.update(deltaTime);
  interactionSystem.update();
  sceneManager.update(deltaTime, elapsedTime);
  turnControls.sync();
  syncTurnControlsState();
  retroPass.enabled = !sceneManager.getFlag('disableRetroPass');
  retroPass.uniforms.uTime.value = elapsedTime;

  composer.render();
});

async function bootstrap() {
  showStartScreen();
}

bootstrap();
