import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../src/models/User.js";
import { CITIES } from "../src/config/constants.js";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "../.env") });

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.error("❌ Error: MONGO_URI is not defined in .env file");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Default admin credentials
    const adminEmail = "admin@test.com";
    const adminPassword = "password123";
    const adminName = "Admin User";
    const defaultAgencyId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists!");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log("\n📝 To reset password, delete the user first or use a different email.");
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = new User({
      fullName: adminName,
      email: adminEmail,
      passwordHash: passwordHash,
      role: "admin",
      agencyId: defaultAgencyId,
      branchCity: CITIES[0],
      isActive: true,
    });

    await admin.save();

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📋 Login credentials:");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log(`   Branch City: ${CITIES[0]}`);
    console.log(`   Agency ID: ${defaultAgencyId}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
createAdmin();

