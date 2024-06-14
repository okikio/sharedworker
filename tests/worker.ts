/// <reference types="webworker" />
import { SharedWorkerSupported } from "../src/ponyfill.ts";

console.log(SharedWorkerSupported ? "SharedWorker" : "Worker");
globalThis.postMessage("Hello from the worker!");

export { };
