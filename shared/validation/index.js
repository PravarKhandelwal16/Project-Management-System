import * as authSchemas from './authSchemas.js';
import * as projectSchemas from './projectSchemas.js';
import * as taskSchemas from './taskSchemas.js';
import * as notificationSchemas from './notificationSchemas.js';

export * from './authSchemas.js';
export * from './projectSchemas.js';
export * from './taskSchemas.js';
export * from './notificationSchemas.js';

export default {
  ...authSchemas,
  ...projectSchemas,
  ...taskSchemas,
  ...notificationSchemas
};
