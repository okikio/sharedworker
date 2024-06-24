/// <reference lib="dom" />
import type { EncryptedMessage, Frame, RequestEnum, RequestFrame } from "./types.ts";

import { BROADCAST_CHANNEL_PREFIX, RequestMessage, SEPERATOR } from "./utils/const.ts";
import { createMessage, decryptMessage, generateValidationHash, initializeSecretKey } from "./utils/crypto.ts";
import { compareIds, generateUniqueId } from "./utils/id.ts";

export function noop() {}
export function request<T>(type: RequestEnum, data: T | null = null, frame: Frame): RequestFrame<T> {
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();

  Object.assign(frame, { uniqueId, timestamp, ttl: 2 });
  return { type, data, frame };
}

export function getChannelName(id: string, channelPrefix = BROADCAST_CHANNEL_PREFIX) {
  return `${channelPrefix}${SEPERATOR}${id}`
}

export class DistributeSharedWorker extends EventTarget implements SharedWorker {
  #channelPrefix: string;
  #channelId: string;

  #broadcast: BroadcastChannel;
  #channel: BroadcastChannel;

  #id = generateUniqueId();
  #leader: string | null;

  #worker: Worker; 
  #neighbors = new Set<string>();
  #blacklist = new Set<string>();

  #url: string | URL;
  #opts?: WorkerOptions;
  
  // Event handlers
  #resolvers = {
    elections: new Map<string, ReturnType<typeof Promise.withResolvers<string>>>(),
    leaders: new Map<string, ReturnType<typeof Promise.withResolvers<string>>>(), 
  };

  #secretKey: CryptoKey | null = null;

  static #privatedatacloneerr = class PrivateDataCloneError extends DOMException {
    constructor(message?: string, name?: string) {
      super(message, name);
    }
  }

  /** 
   * For perf. reasons use a class to delagate event handlers,
   * this lets us avoid binds and arrow functions which have memory overhead, 
   * in addition since it's always the same instance of the same class,
   * it's super easy to remove later on
   * 
   * Based on https://webreflection.medium.com/dom-handleevent-a-cross-platform-standard-since-year-2000-5bf17287fd38
   */
  static #eventhandlers = new WeakMap();
  static #eventhandler = class PrivateEventHandler {
    #delegated: DistributeSharedWorker;
    constructor(delegated: DistributeSharedWorker) { 
      this.#delegated = delegated; 
    }

    handleEvent(event: MessageEvent) { 
      this.#delegated.#handleEvent(event); 
    }
  }

  static #custommessagechannel = class CustomMessageChannel extends MessageChannel {
    #delegated: DistributeSharedWorker;
    constructor(delegated: DistributeSharedWorker) { 
      super(); 
      this.#delegated = delegated;

      const port1 = this.port1;
      const port2 = this.port2;

      Object.assign(this.port1, {
        async start() {
          port1.start();
          port2.start();

          await delegated.#useSecretKey();
          await delegated.#connect();
        },
        
        close() {
          port1.close();
          port2.close();
          
          delegated.#disconnect();
          delegated.#secretKey = null;
        }
      })
    }
  }

  static #generateValidationPayload() {
    try {
      structuredClone(noop);
    } catch (e) {
      console.log({ e, stack: e.stack });
      return {
        stack: e.stack,
        name: e.name,
        message: e.message,
        err: e,
        privateErr: new DistributeSharedWorker.#privatedatacloneerr(e.message, e.name),
      };
    }
  }

  #messagechannel = new DistributeSharedWorker.#custommessagechannel(this);
  port = this.#messagechannel.port1;

  constructor(url: string | URL, opts?: WorkerOptions) {
    super();

    this.#url = url;
    this.#opts = opts;

    this.#channelPrefix = getChannelName(url.toString());
    this.#channelId = getChannelName(this.#id, this.#channelPrefix);

    this.#broadcast = new BroadcastChannel(this.#channelPrefix);
    this.#channel = new BroadcastChannel(this.#channelId);

    const eventhandler = new DistributeSharedWorker.#eventhandler(this);
    DistributeSharedWorker.#eventhandlers.set(this, eventhandler);
    this.#broadcast.addEventListener("message", eventhandler);
    
    this.#messagechannel.port2.addEventListener("message", eventhandler);
    this.#messagechannel.port2.start();
  }
  
  async #useSecretKey() {
    if (this.#secretKey) return this.#secretKey;
    this.#secretKey = await initializeSecretKey();
    return this.#secretKey;
  }

  /**
   * Called by the Private Event Handler
   * @param evt 
   * @returns 
   */
  #handleEvent(evt: MessageEvent<RequestFrame<unknown>>) {
    const { type, data, frame } = evt.data;
    if (this.#blacklist.has(frame.from)) {
      console.log(`Message from blacklisted node ${frame.from} ignored.`);
      return;
    }

    switch (type) {
      case RequestMessage.Connect: {
        this.#onConnection(frame);
        break;
      }

      case RequestMessage.Election: {
        this.#onElection(frame);
        break;
      }

      case RequestMessage.Leader: {
        const _data = data as { leader: string };
        this.#leader = _data.leader;
        
        if (frame.to === this.#id) {
          this.#broadcast.postMessage(request(
            RequestMessage.Leader,
            { leader: this.#leader },
            { to: this.#id, from: this.#id }
          ))
        }

        this.#resolvers.leaders.get(frame.from)?.resolve?.(frame.from);
        break;
      }

      case RequestMessage.Disconnect: {
        break;
      }

      case RequestMessage.Blacklist: {
        break;
      }
    }
  }

  async #connect(to: string | null = null, ttl = 2) {
    if (ttl <= 0) return;

    const validationPayload = DistributeSharedWorker.#generateValidationPayload();
    const { validationHash, timestamp, uniqueId, encryptedMessage } = await createMessage(
      JSON.stringify(validationPayload),
      await this.#useSecretKey()
    );

    this.#broadcast.postMessage(request(
      RequestMessage.Connect,
      { validationPayload, encryptedMessage },
      {
        to, from: this.#id,
        hash: validationHash,
        id: uniqueId,
        timestamp,
        ttl,
      }
    ));
  }

  async #onConnection(frame: Frame) {
    const ttl = frame.ttl! - 1;
    if (frame.to && frame.to !== this.#id) return;
    if (this.#id !== frame.from) {
      this.#neighbors.add(frame.from!);
      await this.#connect(frame.from, ttl);
    }
  }

  #elect(ttl = 2) {
    if (ttl <= 0) return;

    this.#broadcast.postMessage(request(
      RequestMessage.Election, 
      null, 
      { from: this.#id, ttl }
    ));

    const resolvable = Promise.withResolvers<string>();
    this.#resolvers.elections.set(this.#id, resolvable);
    return resolvable.promise;
  }

  #onElection(frame: Frame) {
    if (compareIds(frame.from, this.#id) > 0) {
      this.#leader = null;
    } else if (compareIds(frame.from, this.#id) < 0) {
      const ttl = frame.ttl! - 1;
      this.#elect(ttl);
    }

    this.#resolvers.elections.get(frame.from)?.resolve?.(frame.from);
  }

  #lead(data: { leader: string }, frame: Frame) {
    this.#leader = data.leader;

    if (frame.to === this.#id) {
      this.#broadcast.postMessage(request(
        RequestMessage.Leader,
        { leader: this.#leader },
        { to: this.#id, from: this.#id }
      ))
    }

    this.#resolvers.leaders.get(frame.from)?.resolve?.(frame.from);
  }

  #disconnect(id?: string) {
    if (id && this.#id !== id) {
      this.#neighbors.add(id!);
    }

    this.#broadcast.postMessage(request(
      RequestMessage.Connect,
      null,
      { from: this.#id }
    ));
  }

  // Public method to handle incoming messages
  async handleMessage(event: MessageEvent<EncryptedMessage>) {
    const secretKey = await this.#useSecretKey();

    const { uniqueId, timestamp, validationHash, encryptedMessage } = event.data;
    const expectedHash = await generateValidationHash(secretKey, uniqueId, timestamp);

    if (validationHash === expectedHash) {
      const decryptedMessage = await decryptMessage(encryptedMessage, secretKey);
      console.log("Decrypted message:", decryptedMessage);
    } else {
      console.log("Message validation failed");
    }
  }
}

export default DistributeSharedWorker;