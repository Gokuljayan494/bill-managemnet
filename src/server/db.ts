import mongoose from "mongoose";

// Cache the connection across hot reloads / serverless invocations.
// On Vercel this means one connection per warm function instead of one per request.
const g = global as unknown as {
  _mongooseConn?: Promise<typeof mongoose>;
  _memoryServer?: { getUri: (db: string) => string };
};

const isProd = process.env.NODE_ENV === "production";

async function connectMemory(): Promise<typeof mongoose> {
  // Local dev fallback: in-memory MongoDB, zero setup, data resets on restart.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  if (!g._memoryServer) {
    g._memoryServer = await MongoMemoryServer.create();
  }
  return mongoose.connect(g._memoryServer.getUri("billforge"), {
    dbName: "billforge",
  });
}

async function connect(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (isProd) throw new Error("MONGODB_URI is not set");
    console.warn(
      "[db] MONGODB_URI not set — using in-memory MongoDB (data resets on restart)"
    );
    return connectMemory();
  }

  try {
    return await mongoose.connect(uri, {
      dbName: "billforge",
      serverSelectionTimeoutMS: 8000,
    });
  } catch (err) {
    // Some local/ISP DNS resolvers refuse the SRV lookups that
    // mongodb+srv:// URIs need. Retry once via public DNS.
    if (err instanceof Error && /querySrv|ESERVFAIL|ENOTFOUND/.test(err.message)) {
      console.warn(
        "[db] DNS SRV lookup failed — retrying with public DNS (8.8.8.8 / 1.1.1.1)"
      );
      const dns = await import("dns");
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
      try {
        return await mongoose.connect(uri, {
          dbName: "billforge",
          serverSelectionTimeoutMS: 8000,
        });
      } catch (retryErr) {
        err = retryErr;
      }
    }
    if (isProd) throw err;
    console.error(
      "[db] Could not reach MongoDB Atlas (is this IP whitelisted in Atlas → Network Access?).",
      "Falling back to in-memory MongoDB for dev — data resets on restart."
    );
    return connectMemory();
  }
}

export async function db(): Promise<typeof mongoose> {
  if (!g._mongooseConn) {
    // don't cache failures — a transient error would otherwise poison every request
    g._mongooseConn = connect().catch((err) => {
      g._mongooseConn = undefined;
      throw err;
    });
  }
  return g._mongooseConn;
}
