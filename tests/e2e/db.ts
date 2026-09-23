import mongoose from "mongoose";
import { E2E_MONGODB_URI } from "../../playwright.config";

type Db = ReturnType<mongoose.mongo.MongoClient["db"]>;

/** Direct access to the e2e database for assertions. */
export async function withDb<T>(work: (db: Db) => Promise<T>): Promise<T> {
    const client = await mongoose.mongo.MongoClient.connect(E2E_MONGODB_URI);
    try {
        return await work(client.db());
    } finally {
        await client.close();
    }
}
