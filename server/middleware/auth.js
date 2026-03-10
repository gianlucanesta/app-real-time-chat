"use strict";
const jwt = require("jsonwebtoken");

/**
 * JWT Bearer authentication middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the signature,
 * and attaches the decoded payload to `req.user`.
 *
 * Usage: pass as a function to the route table where `auth: true`.
 *
 * @param {import('http').IncomingMessage & { user?: object }} req
 * @param {import('http').ServerResponse} res
 * @param {() => void} next
 */
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    return _send401(res, "Missing or malformed Authorization header");
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    _send401(res, message);
  }
}

function _send401(res, message) {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
}

module.exports = authMiddleware;
