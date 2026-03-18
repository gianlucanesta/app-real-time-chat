import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, {
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
