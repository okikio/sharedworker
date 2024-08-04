import { RequestMessage } from "./utils/const.ts";

export type Enum<T> = T[keyof T];
export interface Frame {
  to?: string | null;
  from: string;
  hash?: EncryptedMessage['validationHash'] | null;
  timestamp?: EncryptedMessage['timestamp'] | null;
  id?: EncryptedMessage['uniqueId'] | null;
  ttl?: number;
}

export interface RequestFrame<T> {
  type: RequestEnum;
  data: T | null,
  frame: Frame
}

export type RequestEnum = Enum<typeof RequestMessage>;

export interface EncryptedMessage {
  uniqueId: `${string}-${string}-${string}-${string}-${string}`;
  timestamp: number;
  validationHash: string;
  encryptedMessage: string;
}

export interface AcknowledgeData {
  type: RequestEnum;
}