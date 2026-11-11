// Transport-neutral bot messages: the same engine serves Telegram and the local simulator.

export interface Incoming {
  chatId: number;
  /** Typed text, or a reply-keyboard button label. */
  text?: string;
  /** Inline button payload (≤ 64 bytes, Telegram's limit). */
  data?: string;
  /** Number of photos sent in this message. */
  photos?: number;
  /** Telegram file ids of those photos (largest size of each). */
  photoIds?: string[];
}

export interface Button {
  text: string;
  data: string;
}

export interface Outgoing {
  chatId: number;
  text: string;
  /** Inline buttons under the message. */
  buttons?: Button[][];
  /** Persistent reply keyboard (the main menu). */
  keyboard?: string[][];
  /** A document (e.g. the Bosta waybill). */
  file?: { name: string; base64?: string };
}
