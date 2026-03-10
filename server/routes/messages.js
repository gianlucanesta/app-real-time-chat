"use strict";
const { Message, MESSAGE_TTL_SECONDS } = require("../models/Message");
const { redis } = require("../config/redis");
const { sendJSON, readBody } = require("../utils/http");

const MAX_TEXT_LENGTH = 4096;

/**
 * GET /api/messages/:conversationId
 * Returns all non-expired messages for a conversation, newest-last.
 *
 * @param {import('http').IncomingMessage & { user: object }} req
 * @param {import('http').ServerResponse} res
 * @param {string[]} params  [0] = conversationId from URL capture group
 */
async function list(req, res, [conversationId]) {
  if (!conversationId)
    return sendJSON(res, 400, { error: "conversationId is required" });

  try {
    const messages = await Message.find(
      {
        conversationId,
        expires_at: { $gt: new Date() }, // only non-expired
      },
      { __v: 0 },
    )
      .sort({ createdAt: 1 })
      .limit(200) // safety cap for first load
      .lean();

    return sendJSON(res, 200, { messages });
  } catch (err) {
    console.error("[messages] list error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * POST /api/messages
 * Body: { conversationId, text }
 *
 * Server sets expires_at — the client cannot control the TTL.
 */
async function create(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJSON(res, 400, { error: "Invalid JSON body" });
  }

  const { conversationId, text } = body;

  if (!conversationId || typeof conversationId !== "string") {
    return sendJSON(res, 422, { error: "conversationId is required" });
  }
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return sendJSON(res, 422, { error: "text is required" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return sendJSON(res, 422, {
      error: `text exceeds ${MAX_TEXT_LENGTH} characters`,
    });
  }

  try {
    const expires_at = Message.buildExpiresAt();

    const msg = await Message.create({
      conversationId,
      sender: req.user.sub, // UUID from JWT payload, set by authMiddleware
      text: text.trim(),
      expires_at,
    });

    // Mirror key in Redis with same TTL for sub-minute expiry precision
    await redis.set(`msg:${msg._id}`, "1", "EX", MESSAGE_TTL_SECONDS);

    return sendJSON(res, 201, { message: msg });
  } catch (err) {
    console.error("[messages] create error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

module.exports = { list, create };
