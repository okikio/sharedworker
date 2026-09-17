import SharedWorkerPolyfill, { type SharedWorkerOptions } from "../src/index.ts";

/** A representative standards-compatible option set used for compile-time checks. */
const options: SharedWorkerOptions = {
  extendedLifetime: true,
  name: "extended-lifetime",
  type: "module",
};

new SharedWorkerPolyfill("worker.js", options);
new SharedWorkerPolyfill("worker.js", { extendedLifetime: true });

// SharedWorkerOptions remains a WorkerOptions subtype, so the same object can be
// forwarded to runtimes whose TypeScript declarations have not added the new key.
const workerOptions: WorkerOptions = options;
void workerOptions;
