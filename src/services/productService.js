// Catalog service facade — pages import this module only.
// The active transport (Firestore or in-browser demo backend) is chosen by
// services/backend.js so the same UI runs in dev, static previews and the
// Vercel + Firebase production deployment.

import { isFirebase } from './backend.js';
import * as fb from './firebaseProductService.js';
import * as local from './localProductService.js';

const impl = isFirebase ? fb : local;

export const DEFAULT_SETTINGS = fb.DEFAULT_SETTINGS;
export const validateProduct = (draft, all) => impl.validateProduct(draft, all);
export const initializeCatalog = () => impl.initializeCatalog();
export const getSeedProducts = () => fb.getSeedProducts();
export const listProducts = () => impl.listProducts();
export const getProduct = (id) => impl.getProduct(id);
export const createProduct = (draft) => impl.createProduct(draft);
export const updateProduct = (id, patch) => impl.updateProduct(id, patch);
export const deleteProduct = (id) => impl.deleteProduct(id);
export const duplicateProduct = (id) => impl.duplicateProduct(id);
export const listCategories = () => impl.listCategories();
export const saveCategory = (category) => impl.saveCategory(category);
export const deleteCategory = (id) => impl.deleteCategory(id);
export const getSettings = () => impl.getSettings();
export const saveSettings = (patch) => impl.saveSettings(patch);
