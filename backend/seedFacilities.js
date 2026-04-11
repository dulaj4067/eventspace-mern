const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Facility = require('./models/Facilities');

const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'facilities_list.json'), 'utf-8'));

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    console.log('Clearing existing facilities...');
    // We'll update or re-insert. To be safe, we'll just update based on name or ID if exists.
    for (const item of seedData) {
      console.log(`Updating ${item.name}...`);
      await Facility.findOneAndUpdate(
        { $or: [{ _id: item._id }, { name: item.name }] },
        item,
        { upsert: true, new: true }
      );
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
