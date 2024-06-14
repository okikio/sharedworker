import { SharedWorkerPonyfill, SharedWorkerSupported } from "./ponyfill.ts";

// Augment the module to include the polyfill type.
declare module globalThis {
  // Extend the global interface conditionally
  var SharedWorker: typeof SharedWorkerPonyfill;
}

// Conditionally apply the polyfill to the global scope.
if (!SharedWorkerSupported) {
  globalThis.SharedWorker = SharedWorkerPonyfill;
}

export { SharedWorkerSupported };