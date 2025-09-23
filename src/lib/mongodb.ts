import { MongoClient } from "mongodb";

// Define global type for mongo client promises
declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI environment variable is not set.");
}

const uri = process.env.MONGO_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode we use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;