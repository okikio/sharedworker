# Using `SharedWorkerPonyfill`

`SharedWorkerPonyfill` adapts an existing `SharedWorker` or dedicated `Worker` to the same top-level messaging facade used by this package.

It does **not** construct a worker, choose a worker type, or make a dedicated worker behave like a shared worker at the lifecycle or state-sharing level. The caller owns that choice.

Use `SharedWorkerPolyfill` when you want the package to choose between `SharedWorker` and `Worker`. Use `SharedWorkerPonyfill` when your bundler or application needs to construct the worker explicitly.

## Explicit construction

Bundlers such as Vite can need to see the `Worker` or `SharedWorker` constructor directly so they can discover and transform the worker entry point. In that case, construct the resource first and then wrap it:

```ts
import { SharedWorkerPonyfill, SharedWorkerSupported } from "@okikio/sharedworker";

const url = new URL("./worker.ts", import.meta.url);
const options = { name: "position-sync", type: "module" } as const;

const actualWorker = SharedWorkerSupported
  ? new SharedWorker(url, options)
  : new Worker(url, options);

const worker = new SharedWorkerPonyfill(actualWorker);
```

The ponyfill routes operations from the worker that you actually pass in. A browser may support `SharedWorker` while your application deliberately injects a dedicated `Worker`; the global feature-detection result must not override that explicit choice.

## The facade does not make the runtimes identical

The two worker types have different native contracts. The ponyfill normalizes the common messaging surface, but it cannot erase those differences.

| Operation | Native `SharedWorker` | Dedicated `Worker` |
| --- | --- | --- |
| `postMessage()` | Sends through `worker.port` | Sends directly to the worker |
| message listeners | Attach to `worker.port` | Attach directly to the worker |
| error listeners | Attach to the `SharedWorker` object | Attach directly to the worker |
| `start()` | Starts the `MessagePort` | No operation is needed |
| `close()` / `terminate()` | Closes this document's `MessagePort` | Calls `Worker.terminate()` |
| `port` | The real `MessagePort` | Compatibility alias for the `Worker` |
| state shared with other pages | Yes, when they connect to the same native shared worker | No; each page owns its dedicated worker |

The `port` property is therefore useful as a compatibility surface, but code using the dedicated-worker fallback must not assume that `worker.port` implements MessagePort-only behavior.

Likewise, `terminate()` cannot forcibly terminate a native shared worker for every connected document. Closing a shared worker's port disconnects the current client. The browser owns the shared worker's global lifetime.

## Write the worker entry point for both modes

A native shared worker receives one `MessagePort` for each connecting document. A dedicated worker receives messages directly on its global scope. A small adapter keeps the worker implementation usable in either mode:

```ts
const start = (port: MessagePort | DedicatedWorkerGlobalScope) => {
  port.addEventListener("message", ({ data }) => {
    // Handle the common protocol here.
  });

  if ("start" in port) port.start();
};

self.onconnect = (event: MessageEvent) => {
  const [port] = event.ports;
  start(port);
};

if (!("SharedWorkerGlobalScope" in self)) {
  start(self as DedicatedWorkerGlobalScope);
}
```

Keep the message protocol independent from where the message arrived. This makes the fallback easier to test and prevents worker-type checks from spreading through application logic.

## Do not put required cross-tab state only in worker memory

A native `SharedWorker` can hold one in-memory state graph that several documents access. The dedicated-worker fallback cannot reproduce that property: every document gets a separate worker and therefore separate memory.

If correctness depends on cross-tab coordination, use a second mechanism with the semantics you need, for example `BroadcastChannel`, durable browser storage, a server, or another application-specific coordinator. Treat the worker facade as a messaging compatibility layer, not as proof that shared state exists on every browser.

A useful protocol pattern is:

1. Give each request a stable request ID.
2. Make repeated requests safe where possible.
3. Keep authoritative state somewhere that survives a worker restart when that state matters.
4. Send a small `hello` or `sync` handshake when a page connects or reconnects.
5. Include a protocol or state version in the handshake so stale clients can be rejected or resynchronized.

This also makes page restoration, worker restarts, and retry logic easier to reason about.

## Cleanup is an application decision

The ponyfill does not take ownership merely because a worker is passed to its constructor. Your application decides when to call `close()` or `terminate()`.

Be especially careful around page lifecycle events. Closing a connection during every `pagehide` event can be wrong when the document is entering the back/forward cache and may be restored. If you need lifecycle-aware persistence and reconnection, see the worker-lifecycle guidance shipped with the `extendedLifetime` support.

## Troubleshooting

### A dedicated worker is used even though the browser supports shared workers

That is valid when you construct and pass the worker explicitly. The ponyfill follows the concrete resource that it wraps rather than the browser's global capabilities.

### Messages work, but shared state is duplicated between tabs

You are probably on the dedicated-worker fallback. The package can normalize the API surface but cannot make separate dedicated workers share one JavaScript heap. Move cross-tab authority to an appropriate shared or durable mechanism.

### `worker.port` behaves differently on the fallback

On a native shared worker it is the real `MessagePort`. On the dedicated-worker fallback it is the `Worker` exposed through a compatibility property. Prefer the top-level ponyfill methods when you need code that works in both modes.

### Closing one tab does not terminate the shared worker

That is native shared-worker behavior. This package closes that tab's connection; other clients may still own the same shared worker.

### A bundler does not discover the worker entry point

Construct `Worker` or `SharedWorker` in application code with `new URL("./worker.ts", import.meta.url)`, then pass the resulting resource into `SharedWorkerPonyfill`. This keeps worker construction visible to the bundler while retaining the common facade.

## Related platform documentation

- [MDN: SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)
- [MDN: Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker)
- [HTML Standard: Web workers](https://html.spec.whatwg.org/multipage/workers.html)
