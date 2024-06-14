import { SharedWorkerSupported } from "../ponyfill.ts";
export {};

console.log(SharedWorkerSupported ? "SharedWorker" : "Worker")