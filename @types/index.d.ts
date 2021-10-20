/// <reference types="web" />
/**
 * indicates if SharedWorker is supported, in the global scope
 */
export declare const SharedWorkerSupported: boolean;
/**
 * A polyfill class for `SharedWorker`, it accepts a URL/string as well as any other options the spec. allows for `SharedWorker`. It supports all the same methods and properties as the original, except it adds compatibility methods and properties for older browsers that don't support `SharedWorker`, so, it can switch to normal `Workers` instead.
 */
export declare class SharedWorkerPolyfill implements SharedWorker, EventTarget, AbstractWorker {
    /**
     * The actual worker that is used, depending on browser support it can be either a `SharedWorker` or a normal `Worker`.
     */
    ActualWorker: SharedWorker | Worker;
    constructor(url: string | URL, opts?: WorkerOptions);
    /**
     * An EventListener called when MessageEvent of type message is fired on the port—that is, when the port receives a message.
     */
    get onmessage(): MessagePort["onmessage"] | Worker["onmessage"];
    set onmessage(value: MessagePort["onmessage"] | Worker["onmessage"]);
    /**
     * An EventListener called when a MessageEvent of type MessageError is fired—that is, when it receives a message that cannot be deserialized.
     */
    get onmessageerror(): MessagePort["onmessageerror"] | Worker["onmessageerror"];
    set onmessageerror(value: MessagePort["onmessageerror"] | Worker["onmessageerror"]);
    /**
     * Starts the sending of messages queued on the port (only needed when using EventTarget.addEventListener; it is implied when using MessagePort.onmessage.)
     */
    start(): void;
    /**
     * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
     */
    postMessage(message: any, transfer?: Transferable[] | StructuredSerializeOptions): void;
    /**
     * Immediately terminates the worker. This does not let worker finish its operations; it is halted at once. ServiceWorker instances do not support this method.
     */
    terminate(): void;
    /**
     * Disconnects the port, so it is no longer active.
     */
    close(): void;
    /**
     * Returns a MessagePort object used to communicate with and control the shared worker.
     */
    get port(): MessagePort;
    /**
     * Is an EventListener that is called whenever an ErrorEvent of type error event occurs.
     */
    get onerror(): (this: AbstractWorker, ev: ErrorEvent) => any;
    set onerror(value: (this: AbstractWorker, ev: ErrorEvent) => any);
    /**
     * Registers an event handler of a specific event type on the EventTarget
     */
    addEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    addEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    /**
     * Removes an event listener from the EventTarget.
     */
    removeEventListener<K extends keyof WorkerEventMap>(type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    removeEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    /**
     * Dispatches an event to this EventTarget.
     */
    dispatchEvent(event: Event): boolean;
}
export default SharedWorkerPolyfill;
