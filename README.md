# @okikio/sharedworker

[![Open Bundle](https://bundle.js.org/badge-light.svg)](https://bundle.js.org/?q=@okikio/sharedworker&bundle)

[NPM](https://www.npmjs.com/package/@okikio/sharedworker) <span style="padding-inline: 1rem">|</span> [Github](https://github.com/okikio/sharedworker#readme) <span style="padding-inline: 1rem">|</span> [Docs](https://sharedworker.okikio.dev) <span style="padding-inline: 1rem">|</span> [Licence](./LICENSE)  


A small mostly spec. compliant polyfill/ponyfill for `SharedWorkers`, it acts as a drop in replacement for normal `Workers`, and supports a similar API surface that matches normal `Workers`.

> [Ponyfills](https://github.com/sindresorhus/ponyfill) are seperate modules that are included to replicate the functionality of the original API, but are not required to be used, while polyfills are update the original API on the global scope if it isn't supported in that specific environment or it's feature set is lacking compared to modern variations.

> Check out the [blog post](https://blog.okikio.dev/sharedworker), created for it's launch. 

## Installation
```bash
npm install sharedworker
```

<details>
    <summary>Others</summary>

```bash
yarn add sharedworker
```

or 

```bash
pnpm install sharedworker
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
<script src="https://unpkg.com/@okikio/sharedworker" type="module"></script>
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
// or any number of other CDN's
```

`@okikio/sharedworker` supports the same API surface as the `SharedWorker` and `Worker` classes, except it adds some none spec. compliant properties and methods to the `SharedWorkerPolyfill` class, this enables you to use `SharedWorker`'s on browsers that don't support it.

In order to support browsers that don't support `SharedWorker`'s the actual worker file needs to be setup slightly differently,

```ts
/* 
 * All variables and values outside the `start(...)` function are shared between all pages, this behavior can cause unexpected bugs if you're not careful
 */
const start = (port) => {
    // All your normal Worker and SharedWorker stuff should just work
    // With no more setup 
    
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

// This is the fallback, just in case the browser doesn't support SharedWorkers
if ("SharedWorkerGlobalScope" in self) 
    start(self);
```

> _**Note**: make sure to read the comments in the above code carefully to avoid unexpected bugs._

## Showcase

A couple sites that use `@okikio/sharedworker`:
* [astro.build/play](https://astro.build/play) - [GitHub](https://github.com/snowpackjs/astro-repl)
* [bundle.js.org](https://bundle.js.org) - [GitHub](https://github.com/okikio/bundle)
* Your site here...

## API

The basics of `@okikio/sharedworker` rather closely match `SharedWorker`'s the main differences are that all the major methods and properties of `SharedWorker.prototype.port` are available directly on `SharedWorker.prototype` including `addEventListener` and `removeEventListener`. 

> _**Note:** the normal functionality of the methods and properties that were already there on `SharedWorker.prototype` will still be kept intact._ 

In addition, the `terminate()` method was added to `@okikio/sharedworker` this allows both the `close()` method (this is from `SharedWorker.prototype.port` methods being available directly on `SharedWorker.prototype`) and the `terminate()` method to manually close workers. 

Check out the [API site](https://sharedworker.okikio.dev) for detailed API documentation.

## Browser Support

| Chrome | Edge | Firefox | Safari | IE  |
| ------ | ---- | ------- | ------ | --- |
| 4+     | 12+  | 4+      | 4+     | 10+ |

Native support for `SharedWorker` is not supported at all on Safari and IE, as well as all mobile browsers (excluding Firefox For Android).

> _**Note:** some features of `Workers` appeared at later versions of the spec., so, I suggest looking into the feature support table for [Workers](https://developer.mozilla.org/en-US/docs/Web/API/Worker#browser_compatibility) and [SharedWorkers](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker#browser_compatibility)._ 


## Contributing

I encourage you to use [pnpm](https://pnpm.io/configuring) to for this repo, but you can also use [yarn](https://classic.yarnpkg.com/lang/en/) or [npm](https://npmjs.com) if you prefer.

Install all necessary packages
```bash
npm install
```

Then run tests (WIP)
```bash
npm test
```

Build project 
```bash
npm run build
```

Preview API Docs
```bash
npm run typedoc && npm run preview
```

## Licence
See the [LICENSE](./LICENSE) file for license rights and limitations (MIT).
