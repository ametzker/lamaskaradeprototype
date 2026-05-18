import * as THREE from 'three';

function makeCanvasTexture(text, {
  width = 1024,
  height = 256,
  color = '#ffffff',
  background = 'rgba(0,0,0,0.35)',
  font = '700 74px "Arial Narrow", "Helvetica Neue", sans-serif',
  glow = '#ff5fb1',
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);

  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.shadowColor = glow;
  context.shadowBlur = 16;
  context.fillStyle = color;
  context.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

export function createTextBillboard(text, options = {}) {
  const texture = makeCanvasTexture(text, options);
  const ratio = texture.image.width / texture.image.height;
  const scale = options.scale ?? 2.8;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale * ratio, scale), material);

  const updateText = (nextText) => {
    const nextTexture = makeCanvasTexture(nextText, options);
    mesh.material.map.dispose();
    mesh.material.map = nextTexture;
    mesh.material.needsUpdate = true;
  };

  const faceCamera = (camera) => {
    mesh.lookAt(camera.position);
  };

  return { mesh, updateText, faceCamera };
}
