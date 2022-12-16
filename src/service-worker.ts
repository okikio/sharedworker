// Adapted from https://github.com/okikio/bundle/blob/main/src/ts/util/WebWorker.ts, which is licensed under the MIT license.
// If the above file is removed or modified, you can access the original state in the following GitHub Gist: https://gist.github.com/okikio/6809cfc0cdbf1df4c0573addaaf7e259

/**
 * Indicates if SharedWorker is supported, in the global scope
 */
export const SharedWorkerSupported = "SharedWorker" in globalThis;

const SW = 'serviceWorker' in navigator ? navigator.serviceWorker.register(new URL('./utils/sw.ts', import.meta.url)) : null;

/**
 * A ponyfill class for `SharedWorker`, it accepts a URL/string as well as any other options the spec. allows for `SharedWorker`. It supports all the same methods and properties as the original, except it adds compatibility methods and properties for older browsers that don't support `SharedWorker`, so, it can switch to normal `Workers` instead. 
 */
export class ServiceWorkerSharedWorker implements SharedWorker, EventTarget, AbstractWorker {
  // public readonly port: SharedWorkerMessagePort;

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

    // this.port = new SharedWorkerMessagePort(this.ActualWorker);
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

export default ServiceWorkerSharedWorker;