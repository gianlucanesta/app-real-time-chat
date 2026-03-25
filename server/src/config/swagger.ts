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
        "Authentication uses JWT access tokens (short-lived) with HttpOnly refresh-token cookies.",
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
