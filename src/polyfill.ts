// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259

import { SharedWorkerSupported } from "./constants.ts";
import { SharedWorkerPonyfill } from "./ponyfill.ts";

/**
 * Creates a native `SharedWorker` when available, or a dedicated `Worker` otherwise.
 *
 * The wrapper exposes the selected worker's messaging API. The dedicated-worker
 * fallback has its own memory and lifetime; it does not share state between
 * documents. Importing this class does not replace either global constructor.
 */
export class SharedWorkerPolyfill extends SharedWorkerPonyfill {
  constructor(url: string | URL, opts?: WorkerOptions) {
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