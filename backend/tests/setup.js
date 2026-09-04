const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

beforeAll(async () => {
  try {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri);
  } catch (error) {
    console.error("Error setting up in-memory MongoDB:", error);
    throw error;
  }
});

afterEach(async () => {

  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  try {
    console.log("Closing MongoDB connection and stopping server...");
    await mongoose.connection.close();
    await mongo.stop();
  } catch (error) {
    console.error("Error during test cleanup:", error);
    throw error;
  }
});
