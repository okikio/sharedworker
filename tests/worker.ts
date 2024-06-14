import { SharedWorkerSupported } from "../src/ponyfill.ts";
export {};

console.log(SharedWorkerSupported ? "SharedWorker" : "Worker")