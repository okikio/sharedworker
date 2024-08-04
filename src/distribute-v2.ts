/// <reference lib="dom" />
import type { AcknowledgeData, EncryptedMessage, Frame, RequestEnum, RequestFrame } from "./types.ts";

import { BROADCAST_CHANNEL_PREFIX, RequestMessage, SEPERATOR, DEFAULT_TTL } from "./utils/const.ts";
import { createMessage, decryptMessage, generateValidationHash, initializeSecretKey } from "./utils/crypto.ts";
import { compareIds, generateUniqueId } from "./utils/id.ts";

export function noop() {}
export function request<T>(type: RequestEnum, data: T | null = null, frame: Frame): RequestFrame<T> {
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();

  Object.assign(frame, { 
    uniqueId,  timestamp, 
    ttl: frame.ttl ?? DEFAULT_TTL,
  });
  return { type, data, frame };
}

export function getChannelName(id: string, channelPrefix = BROADCAST_CHANNEL_PREFIX) {
  return `${channelPrefix}${SEPERATOR}${id}`
}

/**
 * Adds a new resolver to the set and ensures it is removed once settled.
 * @param resolvers - Set of resolvers to manage dynamically.
 * @returns The created resolver object.
 */
export function addResolver(resolvers: Set<PromiseWithResolvers<void>>) {
  const resolver = Promise.withResolvers<void>();
  resolvers.add(resolver);
  resolver.promise.finally(() => resolvers.delete(resolver));
  return resolver;
}

/**
 * Continuously monitors a set of resolvers and yields until all are settled.
 * Can handle dynamically added resolvers.
 * @param resolvers - Set of resolvers to monitor.
 */
export async function* allResolversSettled(resolvers: Set<PromiseWithResolvers<void>>) {
  while (resolvers.size > 0) {
    // Wait for at least one promise to resolve before proceeding.
    await Promise.race(Array.from(resolvers).map(res => res.promise));

    // Await a brief timeout to give time for new resolvers to be added or settled.
    await new Promise(resolve => setTimeout(resolve, 10));
    yield; // Yield control back to allow for new operations or checks.
  }
}

export class DistributeSharedWorker extends EventTarget implements SharedWorker {
  #channelPrefix: string;
  #channelId: string;

  #broadcast: BroadcastChannel;
  #channel: BroadcastChannel;

  #id = generateUniqueId();
  #leader: string | null = null;

  #worker: Worker; 
  #neighbors = new Set<string>();
  #blacklist = new Set<string>();

  #url: string | URL;
  #opts?: WorkerOptions;
  
  // Event handlers
  #resolvers = {
    connections: new Set<PromiseWithResolvers<void>>(),
    elections: new Set<PromiseWithResolvers<void>>(),
    leaders: new Set<PromiseWithResolvers<void>>(),
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

  get #isLeader() {
    return this.#id === this.#leader;
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
      case RequestMessage.Acknowledge: {
        const _data = data as AcknowledgeData;
        if (!_data.type) console.error("Missing acknowledgement type");
        this.#onAcknowledge(_data?.type, frame);
        break;
      }

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
        this.#onLeadership(_data?.leader, frame);
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
    const ttl = frame?.ttl ?? DEFAULT_TTL;

    const validationPayload = DistributeSharedWorker.#generateValidationPayload();
    const { validationHash, timestamp, uniqueId, encryptedMessage } = await createMessage(
      JSON.stringify(validationPayload),
      await this.#useSecretKey()
    );
    
    this.#broadcast.postMessage(request(
      RequestMessage.Connect,
      { validationPayload, encryptedMessage },
      {
        from: this.#id,
        hash: validationHash,
        id: uniqueId,
        timestamp,
        ttl
      }
    ));

    addResolver(this.#resolvers.connections);

    // Wait for all promises to settle
    for await (const _ of allResolversSettled(this.#resolvers.connections));
  }

  #onConnection(frame: Frame) {
    if (frame.ttl! <= 0) return;
    if (this.#id !== frame.from) {
      this.#neighbors.clear();
      this.#neighbors.add(frame.from!);
      this.#acknowledge(RequestMessage.Connect, frame);
    }

    this.#resolveRequest(RequestMessage.Connect);
  }

  #onAcknowledge(type: RequestEnum, frame: Frame) {
    if (frame.ttl! <= 0) {
      this.#resolveRequest(type);
      return;
    }

    if (this.#id !== frame.from) {
      if (type === RequestMessage.Connect) this.#neighbors.add(frame.from!);
      this.#acknowledge(type, frame);
    }
  }

  #acknowledge(type: RequestEnum, frame?: Partial<Frame> | null) {
    const ttl = frame?.ttl ?? DEFAULT_TTL;

    this.#broadcast.postMessage(request(
      RequestMessage.Acknowledge,
      { type },
      {
        from: this.#id,
        ttl: ttl! - 1
      }
    ));
  }

  #resolveRequest(type: RequestEnum | null | undefined = null) {
    switch (type) {
      case RequestMessage.Connect: {
        const resolvers = this.#resolvers.connections;
        if (resolvers.size > 0) {
          const iterator = resolvers.values();
          iterator.next().value?.resolve();
        }

        break;
      }

      case RequestMessage.Election: {
        const resolvers = this.#resolvers.elections;
        if (resolvers.size > 0) {
          console.log({ type: "resolve-election-promise", completion: this.#leader })
          const iterator = resolvers.values();
          iterator.next().value?.resolve();
        }

        break;
      }

      case RequestMessage.Leader: {
        const resolvers = this.#resolvers.leaders;
        if (resolvers.size > 0) {
          console.log({ type: "resolve-leadership-promise", completion: this.#leader })
          const iterator = resolvers.values();
          iterator.next().value?.resolve();
        }

        break;
      }
    }
  }

  async #elect(frame?: Partial<Frame> | null) {
    const ttl = frame?.ttl ?? DEFAULT_TTL;

    this.#broadcast.postMessage(request(
      RequestMessage.Election, 
      null, 
      { 
        from: this.#id,
        ttl: ttl - 1 
      }
    ));

    console.log({
      leader: this.#leader
    })

    addResolver(this.#resolvers.elections);

    // Wait for all promises to settle
    for await (const _ of allResolversSettled(this.#resolvers.elections));
  }

  #onElection(frame: Frame) {
    if (frame.ttl! <= 0) return;

    this.#leader = this.#id;
    for (const neighborId of this.#neighbors) {
      if (compareIds(neighborId, this.#leader) > 0) {
        this.#leader = neighborId;
      }
    }

    this.#resolveRequest(RequestMessage.Election);
  }

  #lead(frame?: Partial<Frame> | null) {
    const ttl = frame?.ttl ?? DEFAULT_TTL;

    this.#broadcast.postMessage(request(
      RequestMessage.Leader,
      { leader: this.#leader },
      {
        from: this.#id,
        ttl: ttl - 1
      }
    ));
  }

  #onLeadership(leader: string | null | undefined, frame: Frame) {
    if (frame.ttl! <= 0) return;

    if (leader === this.#leader) {
      this.#acknowledge(RequestMessage.Leader, frame);
    } else {
      console.log({
        type: "leadership-fail: start-another-election",
        data: leader,
        leader: this.#leader
      })

      this.#elect(frame);
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
    await this.#useSecretKey();

    const threadId = crypto.randomUUID();
    console.log({ broadcastThreadId: threadId })
    await this.#connect();
    console.log("Done connection", this.#neighbors)

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
    
    await this.#elect();

    console.log("Done election", this.#leader)

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