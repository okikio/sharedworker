// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259

/**
 * Indicates if SharedWorker is supported, in the global scope
 */
export const SharedWorkerSupported = "SharedWorker" in globalThis;

/**
 * Implementation of SharedWorker MessagePort
 * @internal Can be used if required, but meant for internal use
 */
export class SharedWorkerMessagePort implements MessagePort, EventTarget {
  constructor(
    /**
     * The actual worker that is used, depending on browser support it can be either a `SharedWorker` or a normal `Worker`.
     */
    public ActualWorker: SharedWorker | Worker
  ) {}

  /**
   * An EventListener called when MessageEvent of type "message" is fired on the port—that is, when the port receives a message.
   */
  public get onmessage() {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.onmessage;
    } else {
      return (this.ActualWorker as Worker).onmessage as unknown as MessagePort["onmessage"];
    }
  }

  public set onmessage(value: MessagePort["onmessage"]) {
    if (SharedWorkerSupported) {
      (this.ActualWorker as SharedWorker).port.onmessage = value as MessagePort["onmessage"];
    } else {
      (this.ActualWorker as Worker).onmessage = value as unknown as Worker["onmessage"];
    }
  }

  /**
   * An EventListener called when a MessageEvent of type "messageerror" is fired—that is, when it receives a message that cannot be deserialized.
   */
  public get onmessageerror() {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.onmessageerror;
    } else {
      return (this.ActualWorker as Worker).onmessageerror as unknown as MessagePort["onmessageerror"];
    }
  }
  
  public set onmessageerror(value: MessagePort["onmessageerror"]) {
    if (SharedWorkerSupported) {
      (this.ActualWorker as SharedWorker).port.onmessageerror = value as MessagePort["onmessageerror"];
    } else {
      (this.ActualWorker as Worker).onmessageerror = value as unknown as Worker["onmessageerror"];
    }
  }

  /**
   * Starts the sending of messages queued on the port (only needed when using EventTarget.addEventListener; it is implied when using MessagePort.onmessage.)
   */
  public start() {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.start();
    }
  }

  /**
   * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
   */
  public postMessage(message: any, transfer: Transferable[]): void;
  public postMessage(message: any, options?: StructuredSerializeOptions): void;
  public postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions) {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.postMessage(message, transfer as unknown);
    } else {
      return (this.ActualWorker as Worker).postMessage(message, transfer as unknown);
    }
  }

  /**
   * Disconnects the port, so it is no longer active.
   */
  public close() {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.close();
    } else {
      return (this.ActualWorker as Worker).terminate();
    }
  }

  /**
   * Is an EventListener that is called whenever an ErrorEvent of type error event occurs.
   */
  public get onerror() { return this.ActualWorker.onerror; }
  public set onerror(value: (this: AbstractWorker, ev: ErrorEvent) => any) {
    this.ActualWorker.onerror = value;
  }

  /**
   * Registers an event handler of a specific event type on the EventTarget
   */
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof MessagePortEventMap>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject | ((this: MessagePort, ev: MessagePortEventMap[K]) => any), 
    options?: boolean | AddEventListenerOptions
  ) {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.addEventListener(type, listener, options)
    } else {
      return this.ActualWorker.addEventListener(type, listener, options);
    }
  }

  /**
   * Removes an event listener from the EventTarget.
   */
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof MessagePortEventMap>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject | ((this: MessagePort, ev: MessagePortEventMap[K]) => any), 
    options?: boolean | EventListenerOptions
  ) {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.removeEventListener(type, listener, options)
    } else {
      return this.ActualWorker.removeEventListener(type, listener, options);
    }
  }

  /**
   * Dispatches an event to this EventTarget.
   */
  public dispatchEvent(event: Event) {
    return this.ActualWorker.dispatchEvent(event);
  }
}

/**
 * A ponyfill class for `SharedWorker`, it accepts a URL/string as well as any other options the spec. allows for `SharedWorker`. It supports all the same methods and properties as the original, except it adds compatibility methods and properties for older browsers that don't support `SharedWorker`, so, it can switch to normal `Workers` instead. 
 */
export class SharedWorkerPonyfill implements SharedWorker, EventTarget, AbstractWorker {
  public readonly port: SharedWorkerMessagePort;

  /**
   * The actual worker that is used, depending on browser support it can be either a `SharedWorker` or a normal `Worker`.
   */
  private ActualWorker: SharedWorker | Worker;
  constructor(url: string | URL, opts?: WorkerOptions) {
    if (SharedWorkerSupported) {
      this.ActualWorker = new SharedWorker(url, opts);
    } else {
      this.ActualWorker = new Worker(url, opts);
    }

    this.port = new SharedWorkerMessagePort(this.ActualWorker);
  }

  /**
   * Is an EventListener that is called whenever an ErrorEvent of type error event occurs.
   */
  public get onerror() { return this.ActualWorker.onerror; }
  public set onerror(value: (this: AbstractWorker, ev: ErrorEvent) => any) {
    this.ActualWorker.onerror = value;
  }

  /**
   * Registers an event handler of a specific event type on the EventTarget
   */
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof AbstractWorkerEventMap>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject | ((this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any), 
    options?: boolean | AddEventListenerOptions
  ) {
    if (SharedWorkerSupported) {
      return (this.ActualWorker as SharedWorker)?.port.addEventListener(type, listener, options)
    } else {
      return this.ActualWorker.addEventListener(type, listener, options);
    }
  }

  /**
   * Removes an event listener from the EventTarget.
   */
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof AbstractWorkerEventMap>(
    type: K | string,
    listener: EventListenerOrEventListenerObject | ((this: SharedWorker, ev: AbstractWorkerEventMap[K]) => any),
    options?: boolean | AddEventListenerOptions
  ) {
    return this.ActualWorker.removeEventListener(type, listener, options);
  }

  /**
   * Dispatches an event to this EventTarget.
   */
  public dispatchEvent(event: Event) {
    return this.ActualWorker.dispatchEvent(event);
  }
}

export default SharedWorkerPonyfill;