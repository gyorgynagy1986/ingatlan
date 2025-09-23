// src/lib/db.ts

import mongoose, { ConnectOptions } from "mongoose";

declare global {
  var __mongoose_conn__: Promise<typeof mongoose> | undefined;
  var __listeners_wired__: boolean | undefined;
}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

if (!MONGO_URI) {
  throw new Error("Missing MONGODB_URI / MONGO_URI env");
}

async function withRetry<T>(
  fn: () => Promise<T>, 
  attempts = 3
): Promise<T> {
  let lastErr: unknown;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.error(`[db] Connection attempt ${i + 1}/${attempts} failed:`, e);
      
      if (i < attempts - 1) {
        const delay = Math.min(300 * Math.pow(2, i), 5000); // max 5s
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

const options: ConnectOptions = {
  // Serverless optimalizáció
  maxPoolSize: 1,
  minPoolSize: 0,
  
  // Gyors timeout-ok a cold start minimalizálásához
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 10000,
  connectTimeoutMS: 5000,
  
  // Mongoose 7+ ajánlások
  bufferCommands: false, // Ne puffereljünk command-okat connection nélkül
};

function wireListeners() {
  if (global.__listeners_wired__) return;
  global.__listeners_wired__ = true;
  
  mongoose.connection.on("connected", () => {
    console.log("[db] MongoDB connected");
  });
  
  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB error:", err);
    // Reset connection cache on error
    global.__mongoose_conn__ = undefined;
  });
  
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
    global.__mongoose_conn__ = undefined;
  });
}

export default async function dbConnect(): Promise<typeof mongoose> {
  // Wire listeners csak egyszer
  wireListeners();
  
  // Ha nincs aktív connection promise, indítsunk újat
  if (!global.__mongoose_conn__) {
    global.__mongoose_conn__ = withRetry(
      () => mongoose.connect(MONGO_URI, options),
      3
    );
  }
  
  try {
    return await global.__mongoose_conn__;
  } catch (error) {
    // Reset on failure for next attempt
    global.__mongoose_conn__ = undefined;
    throw error;
  }
}

