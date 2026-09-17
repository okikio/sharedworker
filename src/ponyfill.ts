// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259

/**
 * Identifies the concrete worker wrapped by the ponyfill.
 *
 * `SharedWorkerPonyfill` can wrap a dedicated `Worker` even when the current
 * browser also supports `SharedWorker`. Routing must therefore follow the
 * injected worker instead of the browser's global capabilities.
 */
const isSharedWorker = (worker: SharedWorker | Worker): worker is SharedWorker => "port" in worker;

/**
 * Adapts an existing `SharedWorker` or dedicated `Worker` to one facade.
 *
 * The caller creates and selects the worker. Shared-worker message operations
 * are routed through its `MessagePort`; dedicated-worker operations are routed
 * directly to the `Worker`. Explicit `close()` or `terminate()` calls affect
 * the supplied worker connection according to its native lifecycle semantics.
 */
export class SharedWorkerPonyfill implements SharedWorker, EventTarget, AbstractWorker {
  /** The concrete worker supplied by the caller. */
  public ActualWorker: SharedWorker | Worker;
  constructor(worker: SharedWorker | Worker) {
    this.ActualWorker = worker;
  }

  /**
   * An EventListener called when MessageEvent of type message is fired on the port—that is, when the port receives a message.
   */
  public get onmessage() {
    if (isSharedWorker(this.ActualWorker)) {
      return this.ActualWorker.port.onmessage;
    } else {
      return this.ActualWorker.onmessage as unknown as MessagePort["onmessage"];
    }
  }

  public set onmessage(value: MessagePort["onmessage"] | Worker["onmessage"]) {
    if (isSharedWorker(this.ActualWorker)) {
      this.ActualWorker.port.onmessage = value as MessagePort["onmessage"];
    } else {
      this.ActualWorker.onmessage = value as Worker["onmessage"];
    }
  }

  /**
   * An EventListener called when a MessageEvent of type MessageError is fired—that is, when it receives a message that cannot be deserialized.
   */
  public get onmessageerror() {
    if (isSharedWorker(this.ActualWorker)) {
      return this.ActualWorker.port.onmessageerror;
    } else {
      return this.ActualWorker.onmessageerror;
    }
  }

  public set onmessageerror(value: MessagePort["onmessageerror"] | Worker["onmessageerror"]) {
    if (isSharedWorker(this.ActualWorker)) {
      this.ActualWorker.port.onmessageerror = value as MessagePort["onmessageerror"];
    } else {
      this.ActualWorker.onmessageerror = value as Worker["onmessageerror"];
    }
  }

  /**
   * Starts the sending of messages queued on the port (only needed when using EventTarget.addEventListener; it is implied when using MessagePort.onmessage.)
   */
  public start() {
    if (isSharedWorker(this.ActualWorker)) {
      return this.ActualWorker.port.start();
    }
  }

  /**
   * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
   */
  public postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions) {
    if (isSharedWorker(this.ActualWorker)) {
      return this.ActualWorker.port.postMessage(message, transfer as Transferable[]);
    } else {
      return this.ActualWorker.postMessage(message, transfer as Transferable[]);
    }
  }

  /**
   * Ends this facade's worker connection.
   *
   * For a native `SharedWorker`, this closes the current `MessagePort`; it does
   * not forcibly terminate the shared worker for other connected documents. For
   * a dedicated `Worker`, this calls `Worker.terminate()` and stops that worker.
   */
  public terminate() {
    if (isSharedWorker(this.ActualWorker)) {
      return this.ActualWorker.port.close();
    } else {
      return this.ActualWorker.terminate();
    }
  }

  /**
   * Alias for {@link terminate}. Shared workers close their current port while
   * dedicated workers are terminated.
   */
  public close() {
    return this.terminate();
  }

  /**
   * Returns the native `MessagePort` for a shared worker. For the dedicated
   * worker fallback, the `Worker` itself is exposed through this compatibility
   * property and should not be assumed to have MessagePort-only semantics.
   */
  public get port() {
    return (isSharedWorker(this.ActualWorker) ? this.ActualWorker.port : this.ActualWorker) as MessagePort;
  }

  /**
   * Is an EventListener that is called whenever an ErrorEvent of type error event occurs.
   */
  public get onerror() { return this.ActualWorker.onerror; }
  public set onerror(value: ((this: AbstractWorker, ev: ErrorEvent) => any) | null) {
    this.ActualWorker.onerror = value;
  }

  /**
   * Registers an event handler of a specific event type on the EventTarget
   */
  public addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
    if (isSharedWorker(this.ActualWorker) && type !== "error") {
      return this.ActualWorker.port.addEventListener(type, listener, options);
    } else {
      return this.ActualWorker.addEventListener(type, listener, options);
    }
  }

  /**
   * Removes an event listener from the EventTarget.
   */
  public removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    if (isSharedWorker(this.ActualWorker) && type !== "error") {
      return this.ActualWorker.port.removeEventListener(type, listener, options);
    } else {
      return this.ActualWorker.removeEventListener(type, listener, options);
    }
  }

  /**
   * Dispatches an event to the same target used by the corresponding listener API.
   */
  public dispatchEvent(event: Event) {
    if (isSharedWorker(this.ActualWorker) && event.type !== "error") {
      return this.ActualWorker.port.dispatchEvent(event);
    }

    return this.ActualWorker.dispatchEvent(event);
  }
}

export default SharedWorkerPonyfill;