import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');
    
    if (!mongoose.connection.db) throw new Error('Database connection not established');
    const collection = mongoose.connection.db.collection('washes');
    
    // Check if plate_1_status_1 exists
    const indexes = await collection.indexes();
    const hasOldIndex = indexes.some(idx => idx.name === 'plate_1_status_1');
    
    if (hasOldIndex) {
      console.log('Removing old global index plate_1_status_1...');
      await collection.dropIndex('plate_1_status_1');
      console.log('Old index removed.');
    } else {
      console.log('Old index plate_1_status_1 not found.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
