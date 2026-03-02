import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User.js";
import { CITIES } from "../src/config/constants.js";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, "../.env") });

const createAgent = async () => {
  try {
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.error("❌ Error: MONGO_URI is not defined in .env file");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Default agent credentials
    const agentEmail = "agent@test.com";
    const agentPassword = "password123";
    const agentName = "Agent User";
    const defaultAgencyId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

    // Check if agent already exists
    const existingAgent = await User.findOne({ email: agentEmail });
    
    if (existingAgent) {
      console.log("⚠️  Agent user already exists!");
      console.log(`   Email: ${agentEmail}`);
      console.log(`   Password: ${agentPassword}`);
      console.log("\n📝 To reset password, delete the user first or use a different email.");
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(agentPassword, 10);

    // Create agent user
    const agent = new User({
      fullName: agentName,
      email: agentEmail,
      passwordHash: passwordHash,
      role: "agent",
      agencyId: defaultAgencyId,
      branchCity: CITIES[0],
      isActive: true,
    });

    await agent.save();

    console.log("\n✅ Agent user created successfully!");
    console.log("\n📋 Login credentials:");
    console.log(`   Email: ${agentEmail}`);
    console.log(`   Password: ${agentPassword}`);
    console.log(`   Role: agent`);
    console.log(`   Branch City: ${CITIES[0]}`);
    console.log(`   Agency ID: ${defaultAgencyId}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating agent:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
createAgent();

