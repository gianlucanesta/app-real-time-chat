"use strict";
require("dotenv").config();
const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI env var is not set");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });

  console.log("[mongo] connected to", mongoose.connection.name);

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });
}

module.exports = { connectMongo };
