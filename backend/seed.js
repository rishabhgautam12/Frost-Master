/**
 * HomeTrack Login Seed
 * Run: node seed.js
 *
 * Creates sample login users only.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB");

    // Optional: remove existing users before creating seed users
    await User.deleteMany({});
    console.log("🗑️ Existing users removed");

    // Create sample login users
    const users = await User.insertMany([
      {
        name: "Neeraj",
        username: "neeraj",
        password: await bcrypt.hash("neeraj123", 10),
        role: "admin",
        isActive: true,
      }
    ]);

    console.log(`👤 Users created: ${users.length}`);

    console.log(`
╔══════════════════════════════════════╗
║      ✅ Login Seed Complete          ║
╠══════════════════════════════════════╣
║                                      ║
║  Admin                               ║
║  Username: admin                     ║
║  Password: admin123                  ║
║                                      ║                 
║                                      ║
╚══════════════════════════════════════╝
    `);

    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
}

main();