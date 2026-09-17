import assert from "node:assert/strict";
import test from "node:test";

// Reproduce the regression condition while keeping the process global isolated:
// native SharedWorker support exists when the package is evaluated, but the
// caller can still deliberately wrap a dedicated Worker.
const sharedWorkerDescriptor = Object.getOwnPropertyDescriptor(globalThis, "SharedWorker");
let SharedWorkerPonyfill;

try {
  Object.defineProperty(globalThis, "SharedWorker", {
    configurable: true,
    writable: true,
    value: class SharedWorker {},
  });

  ({ SharedWorkerPonyfill } = await import("../lib/ponyfill.js"));
} finally {
  if (sharedWorkerDescriptor) {
    Object.defineProperty(globalThis, "SharedWorker", sharedWorkerDescriptor);
  } else {
    delete globalThis.SharedWorker;
  }
}

/** Creates a dedicated-worker test double and records calls made through it. */
const createDedicatedWorker = () => {
  const calls = [];
  const worker = {
    onmessage: null,
    onmessageerror: null,
    onerror: null,
    postMessage(message) { calls.push(["postMessage", message]); },
    terminate() { calls.push(["terminate"]); },
    addEventListener(type) { calls.push(["addEventListener", type]); },
    removeEventListener(type) { calls.push(["removeEventListener", type]); },
    dispatchEvent(event) {
      calls.push(["dispatchEvent", event.type]);
      return true;
    },
  };

  return { calls, worker };
};

/** Creates a shared-worker test double with separate worker and port records. */
const createSharedWorker = () => {
  const portCalls = [];
  const workerCalls = [];
  const port = {
    onmessage: null,
    onmessageerror: null,
    start() { portCalls.push(["start"]); },
    postMessage(message) { portCalls.push(["postMessage", message]); },
    close() { portCalls.push(["close"]); },
    addEventListener(type) { portCalls.push(["addEventListener", type]); },
    removeEventListener(type) { portCalls.push(["removeEventListener", type]); },
    dispatchEvent(event) {
      portCalls.push(["dispatchEvent", event.type]);
      return true;
    },
  };
  const worker = {
    port,
    onerror: null,
    addEventListener(type) { workerCalls.push(["addEventListener", type]); },
    removeEventListener(type) { workerCalls.push(["removeEventListener", type]); },
    dispatchEvent(event) {
      workerCalls.push(["dispatchEvent", event.type]);
      return true;
    },
  };

  return { port, portCalls, worker, workerCalls };
};

test("routes an injected dedicated Worker through the Worker API", () => {
  const { calls, worker } = createDedicatedWorker();
  const ponyfill = new SharedWorkerPonyfill(worker);

  ponyfill.postMessage("hello");
  ponyfill.addEventListener("message", () => {});
  ponyfill.removeEventListener("message", () => {});
  ponyfill.dispatchEvent({ type: "message" });
  ponyfill.terminate();

  assert.equal(ponyfill.port, worker);
  assert.deepEqual(calls, [
    ["postMessage", "hello"],
    ["addEventListener", "message"],
    ["removeEventListener", "message"],
    ["dispatchEvent", "message"],
    ["terminate"],
  ]);
});

test("routes SharedWorker message APIs through its MessagePort", () => {
  const { port, portCalls, worker, workerCalls } = createSharedWorker();
  const ponyfill = new SharedWorkerPonyfill(worker);

  ponyfill.start();
  ponyfill.postMessage("hello");
  ponyfill.addEventListener("message", () => {});
  ponyfill.addEventListener("error", () => {});
  ponyfill.dispatchEvent({ type: "message" });
  ponyfill.dispatchEvent({ type: "error" });
  ponyfill.close();

  assert.equal(ponyfill.port, port);
  assert.deepEqual(portCalls, [
    ["start"],
    ["postMessage", "hello"],
    ["addEventListener", "message"],
    ["dispatchEvent", "message"],
    ["close"],
  ]);
  assert.deepEqual(workerCalls, [
    ["addEventListener", "error"],
    ["dispatchEvent", "error"],
  ]);
});
