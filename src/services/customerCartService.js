import { isFirebase } from './backend.js';
import * as firebase from './firebaseCustomerCartService.js';

export const load = () => (isFirebase ? firebase.loadAccountCart() : Promise.resolve(null));
export const save = (items) => (isFirebase ? firebase.saveAccountCart(items) : Promise.resolve(null));
