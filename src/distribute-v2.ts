/// <reference lib="dom" />
import type { EncryptedMessage, Frame, RequestEnum, RequestFrame } from "./types.ts";

import { BROADCAST_CHANNEL_PREFIX, RequestMessage, SEPERATOR } from "./utils/const.ts";
import { createMessage, decryptMessage, generateValidationHash, initializeSecretKey } from "./utils/crypto.ts";
import { compareIds, generateUniqueId } from "./utils/id.ts";

export function noop() {}
export function request<T>(type: RequestEnum, data: T | null = null, frame: Frame): RequestFrame<T> {
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();

  Object.assign(frame, { uniqueId, timestamp, ttl: frame.ttl ?? 2 });
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
    connections: new Map<string, ReturnType<typeof Promise.withResolvers<void>>>(),
    elections: new Map<string, ReturnType<typeof Promise.withResolvers<string>>>(),
    leaders: new Map<string, ReturnType<typeof Promise.withResolvers<string>>>(),
  };

  #timeouts: Record<'election' | 'leader', number | null> = {
    election: null,
    leader: null
  };

  #secretKey: CryptoKey | null = null;

  static #privatedatacloneerr = class PrivateDataCloneError extends DOMException {
    constructor(message?: string, name?: string) {
      super(message, name);
    }
  }

  static #generateValidationPayload() {
    try {
      structuredClone(noop);
    } catch (e) {
      return {
        stack: e.stack,
        name: e.name,
        message: e.message,
        err: e,
        privateErr: new DistributeSharedWorker.#privatedatacloneerr(e.message, e.name),
      };
    }
  }

  static #custommessagechannel = class CustomMessageChannel extends MessageChannel {
    #delegated: DistributeSharedWorker;
    constructor(delegated: DistributeSharedWorker) {
      super();
      this.#delegated = delegated;

      const port1 = this.port1;
      const port2 = this.port2;

      // Store original start methods to avoid recursion
      const originalPort1Start = port1.start.bind(port1);
      const originalPort2Start = port2.start.bind(port2);

      const originalPort1Close = port1.close.bind(port1);
      const originalPort2Close = port2.close.bind(port2);

      Object.assign(this.port1, {
        async start() {
          const eventhandler = new DistributeSharedWorker.#eventhandler(delegated);
          DistributeSharedWorker.#eventhandlers.set(delegated, eventhandler);
          delegated.#broadcast.addEventListener("message", eventhandler);

          originalPort1Start();
          originalPort2Start();

          await delegated.#start();
        },

        close() {
          originalPort1Close();
          originalPort2Close();

          delegated.#disconnect();
          delegated.#secretKey = null;
        }
      })
    }

    #handleEvent(evt: MessageEvent<RequestFrame<unknown>>) {
      this.#delegated.#broadcast.postMessage(evt.data);
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
  static #eventhandler = class PrivateEventHandler<T extends DistributeSharedWorker> {
    #delegated: T;
    constructor(delegated: T) { 
      this.#delegated = delegated; 
    }

    handleEvent(event: MessageEvent) {
      this.#delegated.#handleEvent(event); 
    }
  }

  #messagechannel = new DistributeSharedWorker.#custommessagechannel(this);
  port = this.#messagechannel.port1;

  constructor(url: string | URL, opts?: WorkerOptions) {
    super();

    console.log({
      workerId: this.#id
    })

    this.#url = url;
    this.#opts = opts;

    this.#channelPrefix = getChannelName(url.toString());
    this.#channelId = getChannelName(this.#id, this.#channelPrefix);

    this.#broadcast = new BroadcastChannel(this.#channelPrefix);
    this.#channel = new BroadcastChannel(this.#channelId);

    const messagechanneleventhandler = new DistributeSharedWorker.#eventhandler(this.#messagechannel as unknown as DistributeSharedWorker);
    DistributeSharedWorker.#eventhandlers.set(this.#messagechannel, messagechanneleventhandler);
    this.#messagechannel.port2.addEventListener("message", messagechanneleventhandler);
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

    if (--frame.ttl! <= 0) {
      switch (type) {
        case RequestMessage.Connect: {
          if (frame.threadId) {
            this.#resolvers.connections.get(frame.threadId)?.resolve?.();
          }

          break;
        }
      }

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

      case RequestMessage.Heartbeat: {
        break;
      }
    }
  }

  async #connect(frame?: Partial<Frame> | null) {
    const ttl = frame?.ttl ?? 2;
    const threadId = frame?.threadId;

    const validationPayload = DistributeSharedWorker.#generateValidationPayload();
    const { validationHash, timestamp, uniqueId, encryptedMessage } = await createMessage(
      JSON.stringify(validationPayload),
      await this.#useSecretKey()
    );

    console.log({
      threadId,
      from: this.#id,
      ttl
    })
    
    this.#broadcast.postMessage(request(
      RequestMessage.Connect,
      { validationPayload, encryptedMessage },
      {
        from: this.#id,
        threadId,
        hash: validationHash,
        id: uniqueId,
        timestamp,
        ttl
      }
    ));

    if (threadId) {
      try {
        const resolvable = Promise.withResolvers<void>();
        this.#resolvers.connections.set(threadId, resolvable);
        await resolvable.promise;
      } finally {
        this.#resolvers.connections.delete(threadId);
      }
    }
  }

  #onConnection(frame: Frame) {
    if (this.#id !== frame.from) {
      this.#neighbors.add(frame.from!);
      this.#connect(frame);
    }
  }

  get #isLeader() {
    return this.#id === this.#leader;
  }

  #elect(ttl?: number) {
    this.#broadcast.postMessage(request(
      RequestMessage.Election, 
      null, 
      { from: this.#id, ttl }
    ));

    const resolvable = Promise.withResolvers<string>();
    this.#resolvers.elections.set(this.#id, resolvable);

    this.#timeouts.election = setTimeout(() => {
      if (!this.#isLeader && !this.#leader) {
        this.#lead(this.#id);
      }
    }, 10_000);
    return resolvable.promise;
  }

  #lead(leader: string, ttl?: number) {
    this.#leader = leader;
    this.#broadcast.postMessage(request(
      RequestMessage.Leader,
      { leader: this.#leader },
      { from: this.#id, ttl }
    ));
  }

  #onElection(frame: Frame) {
    if (compareIds(frame.from, this.#id) > 0) {
      this.#leader = frame.from;
      clearTimeout(this.#timeouts.election!);
    } else if (compareIds(frame.from, this.#id) < 0) {
      this.#elect(frame.ttl! - 1);
    }

    if ((frame.ttl! - 1) <= 0) {
      if (this.#leader && !this.#isLeader) {
        this.#lead(this.#leader);
      }
    }
  }

  #onLeadership(request: RequestFrame<{ leader: string }>) {
    const { data, frame } = request;
    if (data?.leader === this.#id) {
      this.#lead(this.#id, frame.ttl! - 1);
    } else {
      this.#leader = this.#id;
    }
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

  async #start() {
    console.log("Start")
    await this.#useSecretKey();
    await this.#connect({
      threadId: crypto.randomUUID()
    });

    console.log("Done connecting", this.#neighbors)

    // Send heartbeat to leader periodically
    // setInterval(() => {
    //   if (this.#leader && !this.#isLeader) {
    //     this.#broadcast.postMessage(request(
    //       RequestMessage.Heartbeat,
    //       null,
    //       { from: this.#id }
    //     ));
    //   }
    // }, 5_000);
    
    // await this.#elect();

    // const resolvable = Promise.withResolvers<string>();
    // this.#resolvers.leaders.set(this.#id, resolvable);
    // await resolvable.promise;
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