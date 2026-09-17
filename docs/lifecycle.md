# Worker lifetime, navigation, and recovery

`@okikio/sharedworker` can normalize a useful part of the `SharedWorker` and dedicated `Worker` messaging APIs. It cannot make their ownership and lifetime models identical.

This matters most when a page navigates away, enters the back/forward cache (bfcache), is restored, or disappears while work is still running.

## What `extendedLifetime` changes

The current HTML Standard defines `SharedWorkerOptions.extendedLifetime`. When a supporting browser receives `extendedLifetime: true`, it protects that native shared worker for an implementation-defined period after all owners disappear. During that period, the worker must remain alive and must not be suspended.

The timeout is controlled by the browser. `extendedLifetime` is therefore a short post-owner execution window, not indefinite background execution and not a durable job system.

```ts
import SharedWorker, { type SharedWorkerOptions } from "@okikio/sharedworker";

const options: SharedWorkerOptions = {
  name: "state-sync",
  type: "module",
  extendedLifetime: true,
};

const worker = new SharedWorker("./worker.js", options);
```

The package forwards the option to a native `SharedWorker`. It does not reimplement the lifetime algorithm.

If the package falls back to a dedicated `Worker`, `extendedLifetime` cannot be reproduced. A dedicated worker belongs to its owning document; a DOM event cannot transfer that worker to a new owner after the document disappears.

## Brief navigation survival is a different mechanism

The HTML Standard also defines an implementation-specific **between-loads shared worker timeout**. It lets a browser keep an unowned shared worker permissible for a short time while another page is loading and might reconnect to it. The specification notes that a typical value might be about five seconds.

That mechanism is weaker than `extendedLifetime`:

- between-loads survival makes the worker *permissible*, but does not require the browser to keep it alive;
- `extendedLifetime` makes the worker *protected* for its extended-lifetime timeout, so the browser must keep it alive and not suspend it.

Do not build correctness around the between-loads timeout. Treat it as a browser optimization that can avoid unnecessary worker restarts during normal navigation.

## BFCache is not an `extendedLifetime` fallback

A document placed in bfcache is kept for possible restoration. The HTML worker-lifetime model allows a worker whose owners are all in bfcache to be permissible without being protected or actively needed. Such a worker can be suspended.

`pagehide` and `pageshow` are therefore useful lifecycle **signals**, but they cannot make a dedicated worker continue executing while its owner is frozen or gone.

Use them for checkpointing, reconnection, and resynchronization instead of pretending to extend worker lifetime.

### `visibilitychange`

When `document.visibilityState` becomes `hidden`, the page may be at the last reliably observable point in its session. Use this as an early, best-effort opportunity to request a checkpoint, flush small analytics payloads, or stop unnecessary work.

Do not make a final `visibilitychange` message your only persistence mechanism. The page can disappear before asynchronous work completes. Important state should already have a durable home or be checkpointed throughout normal operation.

### `pagehide`

`pagehide` is bfcache-compatible and exposes `event.persisted`.

When `event.persisted === true`, the page is being retained for possible restoration. Avoid destructive cleanup that would make a restored page unusable unless you intentionally plan to rebuild that state on `pageshow`.

`pagehide` is not guaranteed to fire in every shutdown scenario, especially on mobile. It is a lifecycle hint, not a transaction commit hook.

### `pageshow`

`pageshow` fires when a page is loaded or restored, including restoration from bfcache. When `event.persisted === true`, revalidate assumptions that could have changed while the page was frozen: worker connection state, server state, credentials, timestamps, and cached application data.

## A restart-safe connection workflow

Treat workers as restartable resources unless your application has a stronger platform guarantee.

A useful application protocol is:

1. keep authoritative state in durable storage when losing it would be incorrect;
2. give every page/connection a fresh connection ID;
3. perform a `hello`/`sync` handshake after creation and after bfcache restoration;
4. give state-changing requests stable request IDs;
5. make retries idempotent or detect duplicates;
6. include a protocol/state version so stale clients can be resynchronized;
7. treat a missing worker response as a reconnect/retry condition rather than proof that the original worker is still alive.

For example:

```ts
import SharedWorker, { type SharedWorkerOptions } from "@okikio/sharedworker";

const options: SharedWorkerOptions = {
  name: "state-sync",
  type: "module",
  extendedLifetime: true,
};

const worker = new SharedWorker("./worker.js", options);
let connectionId = crypto.randomUUID();

const sync = () => {
  worker.postMessage({ type: "sync", connectionId });
};

sync();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    // Best effort only. Important state should already be checkpointed durably.
    worker.postMessage({ type: "checkpoint", connectionId });
  }
});

window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    // Do not tear down solely because the page entered bfcache.
    return;
  }

  // Do not wait here for a worker round trip. The document can disappear.
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    connectionId = crypto.randomUUID();
    sync();
  }
});
```

The worker should answer the handshake with enough state to let the page decide whether to continue, reload durable state, or recreate the worker connection.

## Persist state before the final lifecycle event

If a worker owns important mutable state, checkpoint it as part of normal state transitions instead of only during unload-like events.

Useful approaches include:

- write durable state after each important mutation;
- debounce frequent checkpoints, but bound the amount of state that can be lost;
- include a monotonically increasing revision or generation in persisted state;
- write state atomically where the storage API allows it;
- keep request IDs with durable side effects so retries can be reconciled;
- reconstruct in-memory caches from authoritative state after a restart.

For small analytics or diagnostics that belong to the page rather than the worker, `navigator.sendBeacon()` on `visibilitychange` can be a better fit than trying to keep a worker alive only to send a final request.

## Avoid `unload` as a lifecycle strategy

Do not depend on `unload` for correctness. Modern browsers may skip it, and unload handlers can interfere with bfcache behavior.

Use `visibilitychange` for early state/analytics handling, `pagehide` when you need navigation/bfcache context, and `pageshow` to reconnect or resynchronize after restoration.

Use `beforeunload` only for its intended user-facing unsaved-changes warning, and only while such a warning is actually needed.

## Keep shared-worker constructor options consistent

A shared worker is identified by its script URL and name. Once a worker exists, constructor options including `type`, `credentials`, and `extendedLifetime` are part of the established worker configuration. Creating the same URL/name with conflicting options produces an option mismatch.

Centralize worker construction so every caller uses the same option set:

```ts
const sharedWorkerOptions = {
  name: "state-sync",
  type: "module",
  extendedLifetime: true,
} satisfies SharedWorkerOptions;

export const createStateWorker = () =>
  new SharedWorker("./worker.js", sharedWorkerOptions);
```

If you intentionally need different configurations for the same script, give them different names.

## Know what can and cannot be detected

`SharedWorkerSupported` tells you whether the runtime exposes the base `SharedWorker` constructor. It does not tell you whether that browser implements every current `SharedWorkerOptions` member.

If `SharedWorkerSupported` is `false` and you requested `extendedLifetime`, you know the package will use a dedicated-worker fallback and therefore cannot supply the extended-lifetime semantics. Applications that want to surface that downgrade can warn at that point:

```ts
import { SharedWorkerSupported } from "@okikio/sharedworker";

if (!SharedWorkerSupported && options.extendedLifetime) {
  console.warn("extendedLifetime is unavailable on the dedicated Worker fallback");
}
```

Do not throw only because the stronger lifetime is unavailable unless your application truly cannot operate without it. The fallback can still provide useful worker messaging.

Also avoid treating base SharedWorker support as proof of `extendedLifetime` support. Check current browser compatibility for the option when it is a product requirement.

## When a different architecture is required

Choose the mechanism from the guarantee you need:

| Requirement | Better fit |
| --- | --- |
| Share live state while one or more pages are connected | Native `SharedWorker` |
| Smooth over a short page-to-page navigation | Native shared-worker lifetime behavior; reconnect defensively |
| Finish a small amount of work after the last owner disappears | Native `SharedWorker` with `extendedLifetime`, where supported |
| Save page state or small analytics near session end | `visibilitychange`, durable browser storage, and/or `sendBeacon()` |
| Survive worker/page restart without duplicate effects | Durable state + request IDs + idempotent/reconcilable protocol |
| Run work under a service-worker event lifecycle | `ServiceWorker` when the task matches that event model |
| Guarantee long-running work after the browser/page is gone | A durable server-side job/workflow |

A dedicated worker plus page lifecycle events is not equivalent to an extended-lifetime shared worker. Document and design around the weaker guarantee instead of hiding it.

## References

- [HTML Standard: Web workers and worker lifetime](https://html.spec.whatwg.org/multipage/workers.html)
- [MDN: SharedWorker constructor](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker/SharedWorker)
- [MDN: `visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [MDN: `pagehide`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)
- [MDN: `pageshow`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event)
- [MDN: `sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [Interop proposal: extended-lifetime SharedWorkers](https://github.com/web-platform-tests/interop/issues/1382)
