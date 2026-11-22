export const ROLES = ["BUYER", "SELLER", "BROKER"] as const;
export type Role = (typeof ROLES)[number];

export const LISTING_STATUSES = ["ACTIVE", "SOLD", "ARCHIVED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const MESSAGE_TYPES = ["TEXT", "IMAGE", "CALL"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const CALL_KINDS = ["AUDIO", "VIDEO"] as const;
export type CallKind = (typeof CALL_KINDS)[number];

export const CALL_STATUSES = [
  "RINGING",
  "ACTIVE",
  "ENDED",
  "REJECTED",
  "MISSED",
] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const SOCKET_EVENTS = {
  // connection
  conversationJoin: "conversation:join",
  conversationLeave: "conversation:leave",
  // messaging
  messageNew: "message:new",
  typingStart: "typing:start",
  typingStop: "typing:stop",
  // call lifecycle
  callIncoming: "call:incoming",
  callAccepted: "call:accepted",
  callRejected: "call:rejected",
  callEnded: "call:ended",
  // webrtc signalling relay (p2p fallback / custom SFU)
  webrtcOffer: "webrtc:offer",
  webrtcAnswer: "webrtc:answer",
  webrtcIce: "webrtc:ice",
} as const;
