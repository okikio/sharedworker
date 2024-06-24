/// <reference lib="dom" />
// Adaptation note: This code is based on a utility for web workers found at https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts under the MIT license.
// For historical reference or in case of future changes, the original version is preserved at https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259.

/**
 * Checks if the current environment supports SharedWorkers.
 * This is a simple feature detection that looks for "SharedWorker" in the global scope.
 */
export const SharedWorkerSupported = "SharedWorker" in globalThis;

/**
 * Acts as a wrapper around the MessagePort interface of a SharedWorker or a Worker,
 * providing a consistent API for message handling regardless of the underlying worker type.
 * @internal Can be used if required, but meant for internal use
 */
export class SharedWorkerMessagePort implements MessagePort, EventTarget {
  /**
   * Initializes a new instance of the SharedWorkerMessagePort class.
   * @param MessagePortSource The underlying worker instance, which can be either a SharedWorker or a Worker, depending on browser support.
   */
  constructor(
    protected MessagePortSource: SharedWorker | Worker
  ) {}

  /**
   * Getter for the 'onmessage' handler, which is triggered when the port receives a message.
   * Returns the appropriate event listener based on the type of worker being used.
   */
  public get onmessage() {
    if (SharedWorkerSupported) {
      return (this.MessagePortSource as SharedWorker)?.port.onmessage;
    } else {
      return (this.MessagePortSource as Worker).onmessage as unknown as MessagePort["onmessage"];
    }
  }

  /**
   * Setter for the 'onmessage' event handler.
   * Assigns the provided handler to the appropriate worker type.
   */
  public set onmessage(value: MessagePort["onmessage"]) {
    if (SharedWorkerSupported) {
      (this.MessagePortSource as SharedWorker).port.onmessage = value;
    } else {
      (this.MessagePortSource as Worker).onmessage = value as unknown as Worker["onmessage"];
    }
  }

  /**
   * Getter for the 'onmessageerror' handler, which is triggered when the port receives a message that cannot be deserialized.
   */
  public get onmessageerror() {
    if (SharedWorkerSupported) {
      return (this.MessagePortSource as SharedWorker)?.port.onmessageerror;
    } else {
      return (this.MessagePortSource as Worker).onmessageerror as unknown as MessagePort["onmessageerror"];
    }
  }
  
  /**
   * Setter for the 'onmessageerror' event handler.
   */
  public set onmessageerror(value: MessagePort["onmessageerror"]) {
    if (SharedWorkerSupported) {
      (this.MessagePortSource as SharedWorker).port.onmessageerror = value;
    } else {
      (this.MessagePortSource as Worker).onmessageerror = value as unknown as Worker["onmessageerror"];
    }
  }

  /**
   * Starts the sending of messages queued on the port. This method is only required when using `addEventListener`; it is implicitly called otherwise.
   */
  public start() {
    if (SharedWorkerSupported) {
      (this.MessagePortSource as SharedWorker)?.port.start();
    }
  }

  /**
   * Sends a message to the worker's global environment. The message can be transferred directly or cloned, depending on the provided argument.
   */
  public postMessage(message: any, transfer: Transferable[]): void;
  public postMessage(message: any, options?: StructuredSerializeOptions): void;
  public postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions) {
    if (SharedWorkerSupported) {
      (this.MessagePortSource as SharedWorker)?.port.postMessage(message, transfer as unknown as Transferable[]);
    } else {
      (this.MessagePortSource as Worker).postMessage(message, transfer as unknown as Transferable[]);
    }
  }

  /**
   * Closes the message port, terminating the connection.
   */
  public close() {
    if (SharedWorkerSupported) {
      (this.MessagePortSource as SharedWorker)?.port.close();
    } else {
      (this.MessagePortSource as Worker).terminate();
    }
  }

  /**
   * Error event handler. Called whenever an error occurs in the worker.
   */
  public get onerror() { return this.MessagePortSource.onerror; }
  public set onerror(value: ((this: AbstractWorker, ev: ErrorEvent) => any) | null) {
    this.MessagePortSource.onerror = value;
  }

  /**
   * Registers an event listener for a specific event type on the worker.
   */
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof MessagePortEventMap>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject | 
      ((this: MessagePort, ev: MessagePortEventMap[K]) => any), 
    options?: boolean | AddEventListenerOptions
  ) {
    if (SharedWorkerSupported) {
      return (this.MessagePortSource as SharedWorker)?.port.addEventListener(type, listener as EventListenerOrEventListenerObject, options);
    } else {
      return (this.MessagePortSource as Worker).addEventListener(type, listener as EventListenerOrEventListenerObject, options);
    }
  }

  /**
   * Removes a previously registered event listener from the worker.
   */
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof MessagePortEventMap>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject |
      ((this: MessagePort, ev: MessagePortEventMap[K]) => any),
    options?: boolean | EventListenerOptions
  ) {
    if (SharedWorkerSupported) {
      return (this.MessagePortSource as SharedWorker)?.port.removeEventListener(type, listener as EventListenerOrEventListenerObject, options)
    } else {
      return (this.MessagePortSource as Worker).removeEventListener(type, listener as EventListenerOrEventListenerObject, options);
    }
  }

  /**
   * Dispatches an event to the worker.
   */
  public dispatchEvent(event: Event) {
    return this.MessagePortSource.dispatchEvent(event);
  }
}

/**
 * A ponyfill for `SharedWorker`, designed to offer compatibility with environments that do not support `SharedWorker` natively.
 * This class mimics the `SharedWorker` interface, allowing code to use shared workers in a uniform way, regardless of browser support.
 */
export class SharedWorkerPonyfill implements SharedWorker, EventTarget, AbstractWorker {
  /**
   * The actual worker that is used, depending on browser support it can be either a `SharedWorker` or a normal `Worker`.
   */
  protected SharedWorkerSource: SharedWorker | Worker;
  public readonly port: SharedWorkerMessagePort;

  /**
   * Constructs a new instance of the ponyfill, creating either a `SharedWorker` or a `Worker` based on browser support.
   * @param url The URL of the worker script.
   * @param opts Options for the worker.
   */
  constructor(url: string | URL, opts?: WorkerOptions) {
    if (SharedWorkerSupported) {
      this.SharedWorkerSource = new SharedWorker(url, opts);
    } else {
      this.SharedWorkerSource = new Worker(url, opts);
    }

    this.port = new SharedWorkerMessagePort(this.SharedWorkerSource);
  }

  /**
   * Error event handler for the worker.
   */
  public get onerror() { return this.port.onerror; }
  public set onerror(value: ((this: AbstractWorker, ev: ErrorEvent) => any) | null) {
    this.port.onerror = value;
  }

  /**
   * Registers an event listener for a specific event type on the worker.
   */
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof AbstractWorkerEventMap>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject |
      ((this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any),  
    options?: boolean | AddEventListenerOptions
  ) {
    return this.port.addEventListener(type, listener as EventListenerOrEventListenerObject, options);
  }

  /**
   * Removes a previously registered event listener from the worker.
   */
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof AbstractWorkerEventMap>(
    type: K | string,
    listener: EventListenerOrEventListenerObject | 
      ((this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any),
    options?: boolean | AddEventListenerOptions
  ) {
    return this.port.removeEventListener(type, listener as EventListenerOrEventListenerObject, options);
  }

  /**
   * Dispatches an event to the worker.
   */
  public dispatchEvent(event: Event) {
    return this.port.dispatchEvent(event);
  }
}

export default SharedWorkerPonyfill;