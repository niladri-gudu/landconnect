import type {
  CallSession,
  Conversation,
  ConversationParticipant,
  Listing,
  Message,
  User,
} from '@prisma/client';

import type {
  CallDto,
  ConversationDto,
  ListingDto,
  MessageDto,
  Role,
  UserDto,
} from '@landconnect/shared';

type UserRow = Pick<
  User,
  'id' | 'name' | 'email' | 'phone' | 'role' | 'avatarUrl' | 'createdAt'
>;

export function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as Role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

type ListingOwner = Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'>;

export function toListingDto(
  listing: Listing & { owner?: ListingOwner | null },
): ListingDto {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: Number(listing.price),
    areaAcres: Number(listing.areaAcres),
    address: listing.address,
    city: listing.city,
    state: listing.state,
    country: listing.country,
    latitude: listing.latitude,
    longitude: listing.longitude,
    images: listing.images,
    status: listing.status,
    ownerId: listing.ownerId,
    owner: listing.owner
      ? {
          id: listing.owner.id,
          name: listing.owner.name,
          role: listing.owner.role as Role,
          avatarUrl: listing.owner.avatarUrl,
        }
      : undefined,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

export function toMessageDto(message: Message): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    type: message.type,
    createdAt: message.createdAt.toISOString(),
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    readAt: message.readAt?.toISOString() ?? null,
  };
}

type ConversationRow = Conversation & {
  listing?: { title: string } | null;
  participants: Array<
    ConversationParticipant & {
      user: Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'>;
    }
  >;
  messages: Message[];
};

export function toConversationDto(
  conversation: ConversationRow,
  unreadCount = 0,
): ConversationDto {
  const last = conversation.messages[0];
  return {
    id: conversation.id,
    listingId: conversation.listingId,
    listingTitle: conversation.listing?.title ?? null,
    participants: conversation.participants.map((participant) => ({
      id: participant.user.id,
      name: participant.user.name,
      role: participant.user.role as Role,
      avatarUrl: participant.user.avatarUrl,
    })),
    lastMessage: last
      ? {
          id: last.id,
          body: last.body,
          senderId: last.senderId,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    unreadCount,
    createdAt: conversation.createdAt.toISOString(),
  };
}

type CallParticipant = Pick<User, 'id' | 'name' | 'role' | 'avatarUrl'>;

/** CallSession with the two participants loaded — required by {@link toCallDto}. */
export type CallWithParticipants = CallSession & {
  initiator: CallParticipant;
  receiver: CallParticipant;
};

export function toCallDto(call: CallWithParticipants): CallDto {
  return {
    id: call.id,
    conversationId: call.conversationId,
    initiatorId: call.initiatorId,
    receiverId: call.receiverId,
    initiator: {
      id: call.initiator.id,
      name: call.initiator.name,
      role: call.initiator.role as Role,
      avatarUrl: call.initiator.avatarUrl,
    },
    receiver: {
      id: call.receiver.id,
      name: call.receiver.name,
      role: call.receiver.role as Role,
      avatarUrl: call.receiver.avatarUrl,
    },
    kind: call.kind,
    status: call.status,
    roomName: call.roomName,
    createdAt: call.createdAt.toISOString(),
    startedAt: call.startedAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
  };
}
