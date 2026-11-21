// Public API of the package. Domain logic lives in one file per area; this
// barrel re-exports it so consumers keep a single, stable import surface.
export { GameError } from './errors.js';
export { settleWorldEvents } from './village-engine.js';

export {
  listWorlds,
  readWorldBySlug,
  enterWorld,
  updateWorldSpeed,
  updateWorldBarbarians,
  updateBarbarianMaxPoints,
  processWorldEvents,
} from './world.js';
export { populateBarbarianVillages } from './barbarians.js';
export { createVillage, readVillage, renameVillage } from './village.js';
export { enqueueConstruction, cancelConstruction } from './construction.js';
export { enqueueResearch } from './research.js';
export { enqueueRecruitment, cancelRecruitment } from './recruitment.js';
export { academyAction } from './academy.js';
export { readMarket, previewMarketTrade, mutateMarket } from './market.js';
export { mutateMap, readMap, readMapVillage, readMapPlayer, readMapPopup } from './map.js';
export { readRally, previewRallySupport, mutateRally } from './rally.js';
export { readMailbox, readMailThread, previewMailMessage, mutateMail } from './mail.js';
export { readReports, readReport, mutateReports } from './reports.js';
export { readRanking } from './ranking.js';
export {
  readProfile,
  mutateProfile,
  checkAvatarUpload,
  saveAvatar,
  removeAvatar,
} from './profile.js';
