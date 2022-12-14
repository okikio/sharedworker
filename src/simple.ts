// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259
import { SharedWorkerPonyfill, SharedWorkerSupported } from "./ponyfill";

/**
 * A polyfill class for `SharedWorker`, it accepts a URL/string as well as any other options the spec. allows for `SharedWorker`. It supports all the same methods and properties as the original, except it adds compatibility methods and properties for older browsers that don't support `SharedWorker`, so, it can switch to normal `Workers` instead. 
 */
export class SimpleSharedWorker extends SharedWorkerPonyfill {
  constructor(url: string | URL, opts?: WorkerOptions) {
    super(url, opts);
  }

  /**
   * An EventListener called when MessageEvent of type "message" is fired on the port—that is, when the port receives a message.
   */
  public get onmessage() {
    return this.port.onmessage;
  }

  public set onmessage(value: MessagePort["onmessage"] | Worker["onmessage"]) {
    this.port.onmessage = value as MessagePort["onmessage"];
  }

  /**
   * An EventListener called when a MessageEvent of type "messageerror" is fired—that is, when it receives a message that cannot be deserialized.
   */
  public get onmessageerror() {
    return this.port.onmessageerror;
  }

  public set onmessageerror(value: MessagePort["onmessageerror"] | Worker["onmessageerror"]) {
    this.port.onmessageerror = value as MessagePort["onmessageerror"];
  }

  /**
   * Starts the sending of messages queued on the port (only needed when using EventTarget.addEventListener; it is implied when using MessagePort.onmessage.)
   */
  public start() {
    return this.port.start();
  }

  /**
   * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
   */
  public postMessage(message: any, transfer: Transferable[]): void;
  public postMessage(message: any, options?: StructuredSerializeOptions): void;
  public postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions) {
    return this.port.postMessage(message, transfer as unknown);
  }

  /**
   * Immediately terminates the worker. This does not let worker finish its operations; it is halted at once. ServiceWorker instances do not support this method.
   */
  public terminate() {
    return this.port.close();
  }

  /**
   * Disconnects the port, so it is no longer active.
   */
  public close() {
    return this.terminate();
  }

  /**
   * Is an EventListener that is called whenever an ErrorEvent of type error event occurs.
   */
  public get onerror() { return this.port.onerror; }
  public set onerror(value: (this: AbstractWorker, ev: ErrorEvent) => any) {
    this.port.onerror = value;
  }

  /**
   * Registers an event handler of a specific event type on the EventTarget
   */
  public addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  public addEventListener<K extends keyof (WorkerEventMap | MessagePortEventMap)>(
    type: K | string, 
    listener: EventListenerOrEventListenerObject | 
      ((this: MessagePort, ev: MessagePortEventMap[K]) => any) | 
      ((this: Worker, ev: WorkerEventMap[K]) => any), 
    options?: boolean | AddEventListenerOptions
  ) {
    const events = ["error"];
    if (events.includes(type)) {
      return super.addEventListener(type, listener, options);
    } else {
      return this.port.addEventListener(type, listener, options)
    }
  }

  /**
   * Removes an event listener from the EventTarget.
   */
  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  public removeEventListener<K extends keyof (WorkerEventMap | MessagePortEventMap)>(
    type: K | string,
    listener: EventListenerOrEventListenerObject |
      ((this: MessagePort, ev: MessagePortEventMap[K]) => any) |
      ((this: Worker, ev: WorkerEventMap[K]) => any),
    options?: boolean | AddEventListenerOptions
  ) {
    const events = ["error"];
    if (events.includes(type)) {
      return super.removeEventListener(type, listener, options);
    } else {
      return this.port.removeEventListener(type, listener, options)
    }
  }
}

export { SharedWorkerSupported };

export default SimpleSharedWorker;