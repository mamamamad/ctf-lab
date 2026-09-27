import mongoose from 'mongoose';
import { env } from './env.js';

// v1: schema validation lives entirely in the Mongoose models under
// src/models — nothing to "migrate" here, Mongo creates collections
// lazily on first write.
export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log('auth-service connected to MongoDB');
}
