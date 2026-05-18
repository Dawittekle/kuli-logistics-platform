import { MongoClient } from 'mongodb';

let sharedClient = null;
let sharedDb = null;

const databaseNameFromUri = (mongodbUri) => {
  const parsed = new URL(mongodbUri.replace('mongodb://', 'http://').replace('mongodb+srv://', 'http://'));
  return parsed.pathname.slice(1) || 'kuli';
};

export const connectToMongo = async (mongodbUri, options = {}) => {
  if (sharedClient && sharedDb) {
    return {
      client: sharedClient,
      db: sharedDb
    };
  }

  const client = new MongoClient(mongodbUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMs ?? 5000
  });

  await client.connect();

  const databaseName = databaseNameFromUri(mongodbUri);

  sharedClient = client;
  sharedDb = client.db(databaseName);

  return {
    client: sharedClient,
    db: sharedDb
  };
};

export const resetMongoConnectionForTests = async () => {
  if (sharedClient) {
    await sharedClient.close();
  }

  sharedClient = null;
  sharedDb = null;
};
