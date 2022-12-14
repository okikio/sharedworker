import { SimpleSharedWorker } from "./simple";

export const BROADCAST_CHANNEL_PREFIX = "@okikio/sharedworker";
export const SEPERATOR = ":";

export const BROADCAST_CHANNEL_NAME = `${BROADCAST_CHANNEL_PREFIX}${SEPERATOR}all`;

export function getUUID(size = 10) {
  return crypto.getRandomValues(new Uint32Array(size)).join("-");
}

export function getChannelId(broadcastName: string, uuid: string) {
  return `${broadcastName}${SEPERATOR}${uuid}`
}

function request<T>(type: string, data: T = null, pingback: string = null) {
  return { type, data, pingback }
}

const clearArpRequest = () => request("clear-arp");
const arpRequest = (uuid: string, len: number) => request("arp", { uuid, length });
const arpRespone = (uuids: string[]) => request("arp-response", uuids);

export class DistributeSharedWorker {
  private broadcast: BroadcastChannel;
  private broadcastName: string;
  private uuid = getUUID();

  /** Broadcast name + UUID */
  private get channelName() { return getChannelId(this.broadcastName, this.uuid); }
  private uuids: string[] = [];

  /** Stores currently open channels */
  private channel: BroadcastChannel;
  private channels = new Map<string, BroadcastChannel>();

  private EVENTS = {
    ARP: new MessageChannel(),
    ARP_RESPONSE: new MessageChannel(),
    CLEAR_ARP: new MessageChannel()
  };

  constructor(
    private url: string | URL,
    opts?: WorkerOptions
  ) {
    this.broadcastName = `${BROADCAST_CHANNEL_PREFIX}${SEPERATOR}${url.toString()}`;
    this.broadcast = new BroadcastChannel(this.broadcastName);
    this.channel = new BroadcastChannel(this.channelName);

    this.uuids.push(this.uuid);
    console.log({ uuid: this.uuid });

    this.broadcast.addEventListener("message", this.requestHandler.bind(this));

    (async () => {
      // this.broadcast.postMessage(clearArpRequest());
      this.broadcast.postMessage(arpRequest(this.uuid, this.uuids.length));

    })();
  }

  private requestHandler({ data: msg }: MessageEvent<ReturnType<typeof request>>){
    const { type, data } = msg;
    console.log({ type, uuids: this.uuids, data });

    switch (type) {
      case "arp": {
        const { uuid, length } = data as ReturnType<typeof arpRequest>['data'];
        const unique = !this.uuids.includes(uuid);
        if (unique) {
          this.uuids.push(uuid);
        } 

        console.log({ uuidsLen: this.uuids.length, length, data })
        if (this.uuids.length != length) {
          // this.broadcast.postMessage(arpRequest(this.uuid, this.uuids.length));
        }


        break;
      }

      case "clear-arp": {
        this.uuids = [this.uuid];
        break;
      }
    }
  }


}

export default DistributeSharedWorker;