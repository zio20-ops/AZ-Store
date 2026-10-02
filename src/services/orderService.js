// Orders service facade — see services/backend.js for transport selection.

import { isFirebase } from './backend.js';
import * as fb from './firebaseOrderService.js';
import * as local from './localOrderService.js';

const impl = isFirebase ? fb : local;

export const listOrders = () => impl.listOrders();
export const listMyOrders = () => impl.listMyOrders();
export const createOrder = (order) => impl.createOrder(order);
export const updateOrder = (id, patch) => impl.updateOrder(id, patch);
export const trackOrder = (id, phone) => impl.trackOrder(id, phone);
export const findOrder = (id, phone) => impl.findOrder(id, phone);
