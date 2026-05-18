import { createExteriorScene } from './scenes.exterior';
import { createUpstairsScene } from './scenes.upstairs';
import { createBathroomScene } from './scenes.bathroom';
import { createFinalBedroomScene } from './scenes.finalBedroom';

export const SCENE_ORDER = ['exterior'];

export const SCENE_REGISTRY = {
  exterior: createExteriorScene,
  upstairs: createUpstairsScene,
  bathroom: createBathroomScene,
  finalBedroom: createFinalBedroomScene,
};
