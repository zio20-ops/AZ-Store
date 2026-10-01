// Shared helpers for the in-browser demo backend.

import { readStorage } from '../utils/format.js';
import { initializeCatalog } from './localProductService.js';

export const ensureCatalog = () => initializeCatalog();

export const readSettings = () => readStorage('az.settings', {});
