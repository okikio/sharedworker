# @okikio/sharedworker

[![Open Bundle](https://bundlejs.com/badge-light.svg)](https://bundlejs.com/?q=@okikio/sharedworker&bundle)

[NPM](https://www.npmjs.com/package/@okikio/sharedworker) <span style="padding-inline: 1rem">|</span> [Github](https://github.com/okikio/sharedworker#readme) <span style="padding-inline: 1rem">|</span> [Docs](https://sharedworker.okikio.dev) <span style="padding-inline: 1rem">|</span> [Licence](./LICENSE)  


Use one messaging API with a native `SharedWorker` or a dedicated `Worker` fallback. A native shared worker can serve several documents. The fallback creates a separate worker for each document, so it does not share in-memory state between pages.

`SharedWorkerPolyfill` selects the available native constructor. `SharedWorkerPonyfill` wraps a worker that your application creates. Both expose messaging methods directly on the wrapper. Importing these classes does not replace the browser's global constructors.

> Check out the [blog post](https://blog.okikio.dev/sharedworker), created for it's launch. 

## Installation
```bash
npm install @okikio/sharedworker
```

<details>
    <summary>Others</summary>

```bash
yarn add @okikio/sharedworker
```

or 

```bash
pnpm install @okikio/sharedworker
```
</details>

## Usage

```ts
import { SharedWorkerPolyfill as SharedWorker } from "@okikio/sharedworker";
// or 
import SharedWorker from "@okikio/sharedworker";
```

You can also use it directly through a script tag:
```html
<script src="https://unpkg.com/@okikio/sharedworker"></script>
<script type="module">
    // You can then use it like this
    const { SharedWorkerPolyfill: SharedWorker } = window.sharedworker; 
</script>
```

You can also use it via a CDN, e.g.
```ts
import SharedWorker from "https://cdn.skypack.dev/@okikio/sharedworker";
// or 
import SharedWorker from "https://cdn.jsdelivr.net/npm/@okikio/sharedworker";
// or
import SharedWorker from "https://esm.sh/@okikio/sharedworker";
// or any number of other CDN's
```

For Vite and other bundlers you can also use the `SharedWorkerPonyfill` like so ([#9](https://github.com/okikio/sharedworker/issues/9)), to address one-off issues with workers:

```ts
import { SharedWorkerPonyfill, SharedWorkerSupported } from "@okikio/sharedworker";

let worker: SharedWorkerPonyfill;

if (SharedWorkerSupported) {
    worker = new SharedWorkerPonyfill(new SharedWorker(new URL("./../worker.ts", import.meta.url), { name: "position-sync", type: "module" }));
} else {
    worker = new SharedWorkerPonyfill(new Worker(new URL("./../worker.ts", import.meta.url), { name: "position-sync", type: "module" }));
}
```

See [Using `SharedWorkerPonyfill`](https://github.com/okikio/sharedworker/blob/main/docs/ponyfill.md) for the native-versus-fallback behavior, Vite worker-discovery constraints, cleanup semantics, shared-state limitations, and restart/reconnect patterns.

## Write a worker that supports both constructors

A native shared worker receives a `MessagePort` for each connection. A dedicated worker receives messages through its global scope. Pass either object to the same `start()` function:

```ts
/* 
 * A native shared worker shares this scope between connected documents.
 * Each dedicated-worker fallback has its own copy of this scope.
 */
const start = (port) => {
    // Set up messaging for this connection.
    
    /** 
     * Local variables belong to this call to start(). A native shared worker
     * calls start() for each connection; the fallback calls it once.
     */
    port.onmessage = ({ data }) => {
        console.log("Cool")
    };
};

self.onconnect = e => {
    let [port] = e.ports;
    start(port);
};

// This is the fallback for WebWorkers, in case the browser doesn't support SharedWorkers natively
if (!("SharedWorkerGlobalScope" in self)) 
    start(self);
```

Keep per-connection state inside `start()`. If several pages must share state when the fallback is used, provide a separate coordination mechanism. The wrapper does not add one.

## Showcase

A couple sites that use `@okikio/sharedworker`:
* [astro.build/play](https://astro.build/play) - [GitHub](https://github.com/snowpackjs/astro-repl)
* [bundlejs.com](https://bundlejs.com) - [GitHub](https://github.com/okikio/bundle)
* Your site here...

## API

The API of `@okikio/sharedworker` closely match the web `SharedWorker` API, except that all the major methods and properties of `SharedWorker.prototype.port` are available directly on `SharedWorker.prototype` including `addEventListener` and `removeEventListener`. 

> _**Note:** the normal functionality of the methods and properties that are normally available on `SharedWorker.prototype` will still be kept intact, in `@okikio/sharedworker`._ 

The package adds `close()` and `terminate()` convenience methods. For a native `SharedWorker`, both close the current document's `MessagePort`; they do not forcibly terminate the shared worker for other connected documents. For the dedicated-worker fallback, they call `Worker.terminate()`.

Check out the [API site](https://sharedworker.okikio.dev) for detailed API documentation.

## Browser Support

Browser support changes independently for `SharedWorker`, dedicated `Worker`, and individual worker features. Check the current [SharedWorker compatibility data on MDN](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker#browser_compatibility) and [Worker compatibility data](https://developer.mozilla.org/en-US/docs/Web/API/Worker#browser_compatibility) for the runtimes you target.

The package can fall back to a dedicated worker when the base `SharedWorker` constructor is absent, but that fallback does not reproduce native cross-document shared memory or shared-worker lifetime semantics. Design required coordination and persistence around the weaker fallback guarantee.

## Contributing

See [CONTRIBUTING.md](https://github.com/okikio/sharedworker/blob/main/CONTRIBUTING.md) for the repository-native setup, validation, review, and release workflow.

> _**Note**: this project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard for commits, so, please format your commits using the rules it sets out._

## Licence
See the [LICENSE](./LICENSE) file for license rights and limitations (MIT).
