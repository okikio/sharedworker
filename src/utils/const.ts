export const SEPERATOR = ":";
export const BROADCAST_CHANNEL_PREFIX = `@okikio/sharedworker${SEPERATOR}`;

// Define a constant object for request types
export const RequestMessage = {
  Election: "election",
  Leader: "leader",
  Connect: "connect",
  Disconnect: "disconnect",
  Blacklist: "blacklist",
  Recieved: "recieved"
};
