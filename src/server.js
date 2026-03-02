import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/database.js";
import { Car } from "./models/Car.js";
import authRoutes from "./routes/auth.js";
import initRoutes from "./routes/init.js";
import userRoutes from "./routes/users.js";
import carRoutes from "./routes/cars.js";
import bookingRoutes from "./routes/bookings.js";
import serviceRoutes from "./routes/services.js";
import clientRoutes from "./routes/clients.js";
import userExpenseRoutes from "./routes/userExpenses.js";
import carAssignmentRoutes from "./routes/carAssignments.js";
import { setIO } from "./utils/socket.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Car Rental API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      cars: "/api/cars",
      bookings: "/api/bookings",
      clients: "/api/clients",
      services: "/api/services",
      expenses: "/api/user-expenses",
      assignments: "/api/car-assignments"
    }
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/init", initRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/user-expenses", userExpenseRoutes);
app.use("/api/car-assignments", carAssignmentRoutes);

// Socket.io authentication and room management
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const agencyId = socket.handshake.auth.agencyId;
    const branchCity = socket.handshake.auth.branchCity;

    if (!token || !agencyId) {
      return next(new Error("Authentication error"));
    }

    const jwt = (await import("jsonwebtoken")).default;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.userId = decoded.userId;
    socket.agencyId = agencyId;
    socket.branchCity = branchCity;

    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);

  // Join agency room
  socket.join(`agency:${socket.agencyId}`);

  // Join city room if branchCity provided
  if (socket.branchCity) {
    socket.join(`city:${socket.agencyId}:${socket.branchCity}`);
  }

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Initialize socket helper
setIO(io);

const PORT = process.env.PORT || 5000;

// Check required environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ Error: JWT_SECRET is not defined in .env file");
  console.error("Please create apps/api/.env file with JWT_SECRET");
  process.exit(1);
}

connectDB()
  .then(async () => {
    // Drop old carName index if it exists (migration)
    try {
      const indexes = await Car.collection.getIndexes();
      if (indexes['agencyId_1_carName_1']) {
        await Car.collection.dropIndex('agencyId_1_carName_1');
        console.log('✓ Dropped old carName index');
      }
    } catch (error) {
      // IndexNotFound (27) is fine - means it doesn't exist
      if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
        console.error('⚠️  Error checking carName index:', error.message);
      }
    }

    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });

