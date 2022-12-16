import { SharedWorkerSupported } from "../src/ponyfill";
export {};

console.log(SharedWorkerSupported ? "SharedWorker" : "Worker")