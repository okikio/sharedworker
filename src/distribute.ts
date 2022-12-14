import { SimpleSharedWorker } from "./simple";
import * as Comlink from "comlink";

export const BROADCAST_CHANNEL_PREFIX = "@okikio/sharedworker";
export const SEPERATOR = ":";

export const BROADCAST_CHANNEL_NAME = `${BROADCAST_CHANNEL_PREFIX}${SEPERATOR}all`;

export function getUUID(size = 10) {
  return crypto.getRandomValues(new Uint32Array(size)).join("-");
}

export function getChannelId(broadcastName: string, uuid: string) {
  return `${broadcastName}${SEPERATOR}${uuid}`
}

function request<T>(type: string, data: T = null) {
  return { type, data }
}

const clearArpRequest = () => request("clear-arp");
const arpRequest = (uuids: string[]) => request("arp", uuids);

export class DistributeSharedWorker {
  private broadcast: BroadcastChannel;
  private broadcastName: string;
  private uuid = getUUID();

  /** Broadcast name + UUID */
  private get channelId() { return getChannelId(this.broadcastName, this.uuid); }
  private uuids: string[] = [];

  /** Stores currently open channels */
  private channels = new Map<string, BroadcastChannel>();

  constructor(
    public url: string | URL,
    opts?: WorkerOptions
  ) {
    this.broadcastName = `${BROADCAST_CHANNEL_PREFIX}${SEPERATOR}${url.toString()}`;
    this.broadcast = new BroadcastChannel(this.broadcastName);

    // this.uuids.push(this.uuid);
    console.log({ uuid: this.uuid });

    (async () => {
      await this.newRequest(clearArpRequest());
      await this.newRequest(arpRequest(this.uuids));
    // this.broadcast.postMessage(arpRequest(this.uuids));
    // this.broadcast.postMessage(clearArpRequest());

    })();
  }

  private requestHandler(resolve: () => void) {
    return async ({ data: msg }: MessageEvent<ReturnType<typeof request>>) => {
      const { type, data } = msg;

      switch (type) {
        case "arp": {
          const uuids = data as ReturnType<typeof arpRequest>['data'];
          console.log("type", this.uuids)
          const unique = this.uuids.filter(x => !uuids.includes(x));
          if (unique.length > 0) {
            this.uuids.push(...unique);
            // this.newRequest(arpRequest(this.uuids));
          }
          console.log(this.uuids);
          // if (unique.length == 0) {
            resolve();
          // }
          break;
        }

        case "clear-arp": {
          this.uuids = [this.uuid];
          resolve();
          break;
        }
      }
    }
  }

  private newRequest(req: ReturnType<typeof request>) {
    return new Promise<void>(async (done) => {
      let handler: ReturnType<typeof this.requestHandler>;
      this.broadcast.postMessage(req);

      await new Promise<void>(resolve => {
        this.broadcast.addEventListener("message", (handler = this.requestHandler.call(this, resolve)));
      });

      this.broadcast.removeEventListener("message", handler);
      console.log("Resolved?")
      done();
    })
  }

}

export default DistributeSharedWorker;