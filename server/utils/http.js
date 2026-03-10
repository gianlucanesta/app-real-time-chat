"use strict";

/**
 * Shared HTTP utility helpers for the raw Node.js http server.
 * These replace the convenience methods that Express provides out of the box.
 */

/**
 * Read and JSON-parse the request body.
 * Limits payload to 1 MB to prevent large-payload DoS.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<object>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const MAX_BYTES = 1024 * 1024; // 1 MB
    const chunks = [];
    let received = 0;

    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > MAX_BYTES) {
        req.destroy();
        reject(new Error("Payload too large"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

/**
 * Send a JSON response.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} status  HTTP status code
 * @param {object} body    Will be JSON.stringify'd
 */
function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * Parse the query string from req.url into a plain object.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, string>}
 */
function getQueryParams(req) {
  try {
    const url = new URL(req.url, `http://localhost`);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    return {};
  }
}

module.exports = { readBody, sendJSON, getQueryParams };
