import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createServer } from "http";
import cors from "cors";
import Router from "./Routes/UserRoutes.js";
import connectDB from "./Database/Database.js";
import User from "./Models/userModel.js";
import cookieParser from "cookie-parser";
import { spawn } from "child_process";
dotenv.config();

const app = express();
app.use(cookieParser());
connectDB();

app.use(
  cors({
    origin: "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/", Router);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Event listener for starting appliances
  socket.on("start_appliance", async (data) => {
    const { userId, appliance, consumption = 0 } = data;

    try {
      const user = await User.findById(userId);
      if (user && appliance && user[appliance]) {
        user[appliance].isRunning = true;
        user[appliance].consumption += consumption;
        user[appliance].totalConsumption += consumption;
        user[appliance].upTime = new Date();

        user[appliance].updateDayWiseConsumption(consumption);

        await user.save();

        io.emit("consumption_update_batch", {
          [userId]: {
            [appliance]: {
              consumption: user[appliance].consumption,
              isRunning: true,
            },
          },
        });
        console.log(
          `Started appliance: ${appliance}, Consumption: ${consumption}`
        );
      } else {
        console.log(`Appliance ${appliance} not found for user ${userId}`);
      }
    } catch (error) {
      console.error(
        `Error updating appliance status for user ${userId} on appliance ${appliance}:`,
        error
      );
    }
  });

  // Event listener for stopping appliances
  socket.on("stop_appliance", async (data) => {
    const { userId, appliance } = data;

    try {
      const user = await User.findById(userId);
      if (user && appliance && user[appliance]) {
        user[appliance].isRunning = false;
        user[appliance].upTime = null; // Reset uptime when appliance is stopped
        await user.save();

        io.emit("consumption_update_batch", {
          [userId]: {
            [appliance]: {
              isRunning: false,
            },
          },
        });
        console.log(`Stopped appliance: ${appliance}`);
      } else {
        console.log(`Appliance ${appliance} not found for user ${userId}`);
      }
    } catch (error) {
      console.error(
        `Error stopping appliance for user ${userId} on appliance ${appliance}:`,
        error
      );
    }
  });

  // Handle prediction request
  socket.on("get_prediction", async (data) => {
  
    const applianceData = {
      Appliance_TV: data.appliances.tv?.totalConsumption || 0,
      Appliance_Fridge: data.appliances.fridge?.totalConsumption || 0,
      Appliance_AC: data.appliances.ac?.totalConsumption || 0,
      Appliance_Fan: data.appliances.fan?.totalConsumption || 0,
      Appliance_Light: data.appliances.light?.totalConsumption || 0,
    };
  
    try {
      const pythonProcess = spawn("python", ["./suggestion/suggestion.py"]);
  
      // Log to confirm Python process creation
      console.log("Python process started:", pythonProcess.pid);
  
      pythonProcess.stdin.write(JSON.stringify(applianceData));
      pythonProcess.stdin.end();
  
      pythonProcess.stdout.on("data", (output) => {
        const predictionResponse = output.toString().trim();
        console.log("Prediction response from Python script:", predictionResponse);
  
        // Emit the response back to the client
        socket.emit("prediction_response", { suggestion: predictionResponse });
      });
  
      pythonProcess.stderr.on("data", (error) => {
        console.error("Error in Python prediction process:", error.toString());
      });
    } catch (error) {
      console.error("Error fetching prediction:", error);
    }
  });
  

  // Handle socket disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.SERVER_PORT || 3000; // Default to port 3000 if not defined
server.listen(PORT, () => {
  console.log(`SERVER IS RUNNING on http://localhost:${PORT}`);
});
