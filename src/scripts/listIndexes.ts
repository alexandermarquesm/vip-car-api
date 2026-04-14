import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');
    
    if (!mongoose.connection.db) throw new Error('Database connection not established');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      if (col.name === 'washes' || col.name === 'clients') {
        const indexes = await mongoose.connection.db.collection(col.name).indexes();
        console.log(`\nIndexes for ${col.name}:`);
        console.log(JSON.stringify(indexes, null, 2));
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
