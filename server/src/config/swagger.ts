import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Ephemeral Chat API",
      version: "2.0.0",
      description:
        "Real-time ephemeral chat application — Express + TypeScript backend.\n\n" +
        "All messages auto-expire after a configurable TTL. " +
        "Authentication uses JWT access tokens (short-lived) with HttpOnly refresh-token cookies.\n\n" +
        "---\n\n" +
        "## WebSocket Events (Socket.IO)\n\n" +
        "The real-time layer uses **Socket.IO** on the same host. " +
        "Connect with a valid JWT in the `auth.token` handshake option.\n\n" +
        "### Connection\n" +
        "```js\nio(SERVER_URL, { auth: { token: '<access_token>' } })\n```\n\n" +
        "### Client → Server Events\n\n" +
        "| Event | Payload | Description |\n" +
        "|---|---|---|\n" +
        "| `join:conversation` | `conversationId: string` | Join a conversation room |\n" +
        "| `leave:conversation` | `conversationId: string` | Leave a conversation room |\n" +
        "| `message:send` | `{ conversationId, text, viewOnce?, mediaUrl?, mediaType?, mediaDuration?, mediaFileName?, linkPreview?, statusReply?, quotedReply? }` → ack `{ ok, messageId? }` | Send a message |\n" +
        "| `message:delivered` | `{ messageIds: string[], conversationId }` | Mark messages as delivered |\n" +
        "| `message:read` | `{ messageIds: string[], conversationId }` | Mark messages as read |\n" +
        "| `message:deleteForEveryone` | `{ messageIds: string[], conversationId }` → ack `{ ok, deleted? }` | Delete own messages for everyone |\n" +
        "| `message:react` | `{ messageId, conversationId, emoji }` → ack `{ ok }` | Toggle emoji reaction |\n" +
        "| `message:edit` | `{ messageId, conversationId, text }` → ack `{ ok }` | Edit own message |\n" +
        "| `message:star` | `{ messageId, conversationId }` → ack `{ ok, starred? }` | Toggle starred/important |\n" +
        "| `message:viewOnce:open` | `{ messageId, conversationId }` | Open a view-once message |\n" +
        "| `typing:start` | `conversationId: string` | Start typing indicator |\n" +
        "| `typing:stop` | `conversationId: string` | Stop typing indicator |\n" +
        "| `call:offer` | `{ to, withVideo, offer: RTCSessionDescriptionInit }` | Send WebRTC call offer |\n" +
        "| `call:answer` | `{ to, answer: RTCSessionDescriptionInit }` | Send WebRTC call answer |\n" +
        "| `call:ice` | `{ to, candidate: RTCIceCandidateInit }` | Relay ICE candidate |\n" +
        "| `call:end` | `{ to }` | End a call |\n" +
        "| `call:reject` | `{ to }` | Reject an incoming call |\n" +
        "| `call:screenshare` | `{ to, active: boolean }` | Toggle screen share |\n" +
        "| `call:join-room` | `{ roomId }` | Join a call-link room |\n" +
        "| `call:leave-room` | `{ roomId }` | Leave a call-link room |\n" +
        "| `join:community` | `communityId: string` | Join community room for updates |\n" +
        "| `leave:community` | `communityId: string` | Leave community room |\n\n" +
        "### Server → Client Events\n\n" +
        "| Event | Payload | Description |\n" +
        "|---|---|---|\n" +
        "| `message:new` | `MessagePayload` | New message received |\n" +
        "| `message:expired` | `{ id }` | Message expired (TTL) |\n" +
        "| `message:status` | `{ messageIds, status }` | Delivery/read status update |\n" +
        "| `message:deleted` | `{ messageIds, conversationId }` | Messages deleted |\n" +
        "| `message:edited` | `{ messageId, conversationId, text, editedAt }` | Message edited |\n" +
        "| `message:reaction` | `{ messageId, conversationId, userId, displayName, emoji, action }` | Reaction toggled |\n" +
        "| `message:starred` | `{ messageId, conversationId, userId, starred }` | Star toggled |\n" +
        "| `message:viewOnce:opened` | `{ messageId, conversationId }` | View-once opened |\n" +
        "| `typing` | `{ userId, displayName, typing }` | Typing indicator |\n" +
        "| `presence:online` | `{ userId }` | User came online |\n" +
        "| `presence:offline` | `{ userId }` | User went offline |\n" +
        "| `presence:list` | `string[]` | Current online user IDs |\n" +
        "| `error` | `{ message }` | Error notification |\n" +
        "| `call:incoming` | `{ from, fromName, withVideo, offer }` | Incoming call |\n" +
        "| `call:answer` | `{ from, answer }` | Call answered |\n" +
        "| `call:ice` | `{ from, candidate }` | ICE candidate |\n" +
        "| `call:ended` | `{ from }` | Call ended |\n" +
        "| `call:rejected` | `{ from }` | Call rejected |\n" +
        "| `call:busy` | `{ from }` | User busy |\n" +
        "| `call:screenshare` | `{ from, active }` | Screen share status |\n" +
        "| `call:peer-joined` | `{ userId, displayName, roomId }` | Peer joined call room |\n" +
        "| `call:peer-in-room` | `{ userId, displayName, roomId }` | Existing peer in room |\n" +
        "| `call:peer-left` | `{ userId, roomId }` | Peer left call room |\n" +
        "| `user:profile-updated` | `{ userId, displayName, initials, avatarGradient, avatarUrl }` | Profile update broadcast |\n" +
        "| `status:viewed` | `{ itemId, viewerCount }` | Status item viewed |\n" +
        "| `community:created` | `{ community }` | Community created |\n" +
        "| `community:updated` | `{ community }` | Community updated |\n" +
        "| `community:announcement` | `{ communityId, announcement }` | New announcement |\n" +
        "| `community:memberJoined` | `{ communityId, userId }` | Member joined |\n" +
        "| `community:memberLeft` | `{ communityId, userId }` | Member left |\n" +
        "| `community:groupAdded` | `{ communityId, group }` | Group added to community |\n",
      contact: { name: "Ephemeral Chat Team" },
    },
    servers: [
      { url: "/", description: "Current host" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token obtained from /api/auth/login or /api/auth/refresh",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        RegisterBody: {
          type: "object",
          required: ["email", "password", "displayName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            displayName: { type: "string" },
            phone: { type: "string" },
          },
        },
        LoginBody: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        CreateMessageBody: {
          type: "object",
          required: ["conversationId", "text"],
          properties: {
            conversationId: { type: "string" },
            text: { type: "string", maxLength: 4096 },
          },
        },
        DeleteMessagesBody: {
          type: "object",
          required: ["messageIds"],
          properties: {
            messageIds: {
              type: "array",
              items: { type: "string" },
              maxItems: 500,
            },
          },
        },
        CreateContactBody: {
          type: "object",
          required: ["displayName"],
          properties: {
            displayName: { type: "string" },
            phone: { type: "string" },
            initials: { type: "string" },
            gradient: { type: "string" },
          },
        },
        UpdateUserBody: {
          type: "object",
          properties: {
            displayName: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            phone: { type: "string" },
            role: { type: "string" },
            avatarUrl: { type: "string" },
            initials: { type: "string" },
            avatarGradient: { type: "string" },
          },
        },
        StatusItemBody: {
          type: "object",
          required: ["mediaType"],
          properties: {
            mediaType: { type: "string", enum: ["text", "image", "video"] },
            mediaUrl: { type: "string" },
            text: { type: "string" },
            textBgGradient: { type: "string" },
            caption: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
