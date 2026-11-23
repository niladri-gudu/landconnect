import type {
  CallKind,
  CallStatus,
  ListingStatus,
  MessageType,
  Role,
} from "./constants";

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ListingDto {
  id: string;
  title: string;
  description: string;
  price: number;
  areaAcres: number;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  images: string[];
  status: ListingStatus;
  ownerId: string;
  owner?: Pick<UserDto, "id" | "name" | "role" | "avatarUrl">;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: MessageType;
  createdAt: string;
  /** Set when the recipient's app has acknowledged receipt. */
  deliveredAt: string | null;
  /** Set when the recipient has opened the conversation. */
  readAt: string | null;
}

export interface MessageReceiptDto {
  conversationId: string;
  messageIds: string[];
  at: string;
}

export interface ConversationParticipantDto extends Pick<
  UserDto,
  "id" | "name" | "role" | "avatarUrl"
> {}

export interface ConversationDto {
  id: string;
  listingId: string | null;
  listingTitle: string | null;
  participants: ConversationParticipantDto[];
  lastMessage: Pick<MessageDto, "id" | "body" | "createdAt" | "senderId"> | null;
  lastMessageAt: string;
  /** Messages from the other participant that this user has not read. */
  unreadCount: number;
  createdAt: string;
}

export interface CallDto {
  id: string;
  conversationId: string;
  initiatorId: string;
  receiverId: string;
  /**
   * Denormalised participants so the ring overlay and call stage can render a
   * name immediately, without waiting on a second conversation fetch.
   */
  initiator: ConversationParticipantDto;
  receiver: ConversationParticipantDto;
  kind: CallKind;
  status: CallStatus;
  roomName: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface CallAnswerDto {
  call: CallDto;
  /** Present when the server is configured with LiveKit credentials. */
  livekit?: { url: string; room: string; token: string };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: UserDto;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}
