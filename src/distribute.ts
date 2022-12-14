import { SimpleSharedWorker } from "./simple";
import * as Comlink from "comlink";

export const BROADCAST_CHANNEL_PREFIX = "@okikio/sharedworker";
export const SEPERATOR = ":";

export const BROADCAST_CHANNEL_NAME = `${BROADCAST_CHANNEL_PREFIX}${SEPERATOR}all`;

export function getUUID(size = 10) {
  return crypto.getRandomValues(new Uint32Array(size)).join("-");
}

export class DistributeSharedWorker {
  private broadcast: BroadcastChannel;
  private broadcastName: string;
  private broadcastChannelProxy: ReturnType<typeof Comlink.wrap>;
  private uuid = getUUID();

  /** Broadcast name + UUID */
  private get channelId() { return `${this.broadcastName}${SEPERATOR}${this.uuid}`};
  private channelIdList = [];

  /** Stores currently open channels */
  private channels = new Map<string, BroadcastChannel>();

  constructor(
    public url: string | URL, 
    opts?: WorkerOptions
  ) {
    this.broadcastName = `${BROADCAST_CHANNEL_PREFIX}${SEPERATOR}${url.toString()}`;
    this.broadcast = new BroadcastChannel(this.broadcastName);

    this.broadcastChannelProxy = Comlink.wrap(this.broadcast);

    Comlink.expose(
      {
        newUUID: () => {
          this.uuid = getUUID();
        },
        getUUID
      }, 
      this.broadcast
    );
  }
} 

export default DistributeSharedWorker;