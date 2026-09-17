// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259

import { SharedWorkerSupported } from "./constants.ts";
import { SharedWorkerPonyfill } from "./ponyfill.ts";

/**
 * Options for constructing a shared worker through {@link SharedWorkerPolyfill}.
 *
 * `extendedLifetime` requests that a supporting browser keep the native shared
 * worker alive briefly after its last owner disappears. The browser controls
 * the exact timeout. This package cannot emulate that lifetime when it falls
 * back to a dedicated `Worker`; browsers that do not implement the option will
 * ignore it.
 *
 * @see https://html.spec.whatwg.org/multipage/workers.html#dom-sharedworkeroptions-extendedlifetime
 * @see https://github.com/okikio/sharedworker/blob/main/docs/lifecycle.md
 */
export interface SharedWorkerOptions extends WorkerOptions {
  /**
   * Requests extra lifetime after all documents using the native shared worker
   * have unloaded. The default is `false`.
   */
  extendedLifetime?: boolean;
}

/**
 * Creates a native `SharedWorker` when the runtime supports it and otherwise
 * falls back to a dedicated `Worker`.
 *
 * Shared-worker-only behavior is forwarded to the native constructor. The
 * fallback preserves this package's messaging API, but it cannot reproduce
 * lifecycle semantics such as {@link SharedWorkerOptions.extendedLifetime}.
 * Applications that depend on page restoration or restart-safe state should use
 * the lifecycle workflow documented in the package guide.
 *
 * @see https://github.com/okikio/sharedworker/blob/main/docs/lifecycle.md
 */
export class SharedWorkerPolyfill extends SharedWorkerPonyfill {
  constructor(url: string | URL, opts?: SharedWorkerOptions) {
    let worker: SharedWorker | Worker;
    if (SharedWorkerSupported) {
      worker = new SharedWorker(url, opts);
    } else {
      worker = new Worker(url, opts);
    }

    super(worker);
  }
}

export default SharedWorkerPolyfill;
