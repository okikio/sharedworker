// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259

import { SharedWorkerSupported } from "./constants.ts";
import { SharedWorkerPonyfill } from "./ponyfill.ts";

/**
 * A polyfill class for `SharedWorker`, it accepts a URL/string as well as any other options the spec. allows for `SharedWorker`. It supports all the same methods and properties as the original, except it adds compatibility methods and properties for older browsers that don't support `SharedWorker`, so, it can switch to normal `Workers` instead. 
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