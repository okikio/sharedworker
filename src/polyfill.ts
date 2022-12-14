import { SharedWorkerPonyfill, SharedWorkerSupported } from "./ponyfill";

if (!SharedWorkerSupported) {
  globalThis.SharedWorker = SharedWorkerPonyfill;
}

export { SharedWorkerSupported };