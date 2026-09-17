# @okikio/sharedworker

[![Open Bundle](https://bundlejs.com/badge-light.svg)](https://bundlejs.com/?q=@okikio/sharedworker&bundle)

[NPM](https://www.npmjs.com/package/@okikio/sharedworker) <span style="padding-inline: 1rem">|</span> [Github](https://github.com/okikio/sharedworker#readme) <span style="padding-inline: 1rem">|</span> [Docs](https://sharedworker.okikio.dev) <span style="padding-inline: 1rem">|</span> [Licence](./LICENSE)  


A small mostly spec. compliant polyfill/ponyfill for `SharedWorkers`, it acts as a drop in replacement for normal `Workers`, and supports a similar API surface that matches normal `Workers`.

> * [Ponyfills](https://github.com/sindresorhus/ponyfill) are seperate modules that are included to replicate the functionality of the original API, but are not required to be used.
> * [Polyfills](https://developer.mozilla.org/en-US/docs/Glossary/Polyfill) update the original API on the global scope if it isn't supported in that specific environment or it's feature set is lacking compared to modern variations.

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

For vite and other bundlers you can also use the new `SharedWorkerPonyfill` like so ([#9](https://github.com/okikio/sharedworker/issues/9)), to address one-off issues with workers

```ts
import { SharedWorkerPonyfill, SharedWorkerSupported } from "@okikio/sharedworker";

let worker: SharedWorkerPonyfill;

if (SharedWorkerSupported) {
    worker = new SharedWorkerPonyfill(new SharedWorker(new URL("./../worker.ts", import.meta.url), { name: "position-sync", type: "module" }));
} else {
    worker = new SharedWorkerPonyfill(new Worker(new URL("./../worker.ts", import.meta.url), { name: "position-sync", type: "module" }));
}
```

### Extended lifetime

Supporting browsers can keep a native shared worker alive briefly after its last page unloads by setting `extendedLifetime: true`:

```ts
import SharedWorker, { type SharedWorkerOptions } from "@okikio/sharedworker";

const options: SharedWorkerOptions = {
    extendedLifetime: true,
    name: "position-sync",
    type: "module",
};

const worker = new SharedWorker("./worker.js", options);
```

`extendedLifetime` is a native `SharedWorker` capability. `@okikio/sharedworker` forwards the option when the browser supports shared workers, but the dedicated `Worker` fallback cannot reproduce the lifetime guarantee. Browsers that do not implement the option ignore it, so code that requires post-unload work must not treat the option as a portable guarantee.

Use `extendedLifetime` to reduce avoidable interruption, not as the correctness mechanism for important work. For BFCache behavior, `visibilitychange`/`pagehide`/`pageshow`, checkpointing, reconnect handshakes, idempotent retries, and guidance on when a service worker or server-side job is the better fit, see [Worker lifetime, navigation, and recovery](https://github.com/okikio/sharedworker/blob/main/docs/lifecycle.md).

When you use `SharedWorkerPonyfill`, the same exported `SharedWorkerOptions` type can describe the options passed to a native `SharedWorker` constructor before wrapping it.

`@okikio/sharedworker` supports the same API surfaces as `SharedWorker` and `Worker`, except it adds some none spec. compliant properties and methods to the `SharedWorkerPolyfill` class, that enables devs to use `SharedWorker`'s on browsers that don't support it.

In order to support browsers that don't natively support `SharedWorker`'s, the actual worker file needs to be tweaked slightly,

```ts
/* 
 * All variables and values outside the `start(...)` function are shared between all pages, this behavior can cause unexpected bugs if you're not careful
 */
const start = (port) => {
    // All your normal Worker and SharedWorker stuff can be placed here and should just work, with no extra setup required 
    
    /** 
     * All variables and values inside the `start(...)` function are isolated to each page, and will be allocated seperately per page. 
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

> _**Note**: make sure to read the comments in the above code carefully to avoid unexpected bugs._

## Showcase

A couple sites that use `@okikio/sharedworker`:
* [astro.build/play](https://astro.build/play) - [GitHub](https://github.com/snowpackjs/astro-repl)
* [bundlejs.com](https://bundlejs.com) - [GitHub](https://github.com/okikio/bundle)
* Your site here...

## API

The API of `@okikio/sharedworker` closely match the web `SharedWorker` API, except that all the major methods and properties of `SharedWorker.prototype.port` are available directly on `SharedWorker.prototype` including `addEventListener` and `removeEventListener`. 

> _**Note:** the normal functionality of the methods and properties that are normally available on `SharedWorker.prototype` will still be kept intact, in `@okikio/sharedworker`._ 

The package also exposes `close()` and `terminate()` as convenience methods. Their native effects differ by worker type: for a native `SharedWorker`, they close the current document's `MessagePort`; for the dedicated-worker fallback, they call `Worker.terminate()`. Closing one shared-worker port does not forcibly terminate the shared worker for other connected documents.

Check out the [API site](https://sharedworker.okikio.dev) for detailed API documentation.

## Browser Support

Browser support changes independently for `SharedWorker` and individual constructor options. Check the current [SharedWorker compatibility data on MDN](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker#browser_compatibility) for the runtimes you target.

`extendedLifetime` is newer than the base `SharedWorker` API. A browser can support shared workers while ignoring this option, so treat post-unload execution as a capability of the native runtime rather than a guarantee supplied by this package.

## Contributing

I encourage you to use [pnpm](https://pnpm.io/configuring) to contribute to this repo, but you can also use [yarn](https://classic.yarnpkg.com/lang/en/) or [npm](https://npmjs.com) if you prefer.

Install all necessary packages
```bash
pnpm install
```

Run the TypeScript checks
```bash
pnpm typecheck
```

Build the package
```bash
pnpm build
```

Generate the API docs
```bash
pnpm typedoc
```

> _**Note**: this project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard for commits, so, please format your commits using the rules it sets out._

## Licence
See the [LICENSE](./LICENSE) file for license rights and limitations (MIT).
