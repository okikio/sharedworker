export const SEPERATOR = ":";
export const BROADCAST_CHANNEL_PREFIX = `@okikio/sharedworker${SEPERATOR}`;

export const DEFAULT_TTL = 4;

// Define a constant object for request types
export const RequestMessage = {
  Election: "election",
  Leader: "leader",
  Connect: "connect",
  Disconnect: "disconnect",
  Blacklist: "blacklist",
  Heartbeat: "heartbeat",
  Acknowledge: "acknowledge"
};
