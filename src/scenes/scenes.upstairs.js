import { createExteriorScene } from './scenes.exterior';

export function createUpstairsScene(context) {
  return createExteriorScene(context, { mode: 'upstairs' });
}
