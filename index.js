import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.js";

dotenv.config();

const app = express();

/* CORS FIX */

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://learnup-groundwater.netlify.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

app.use(express.json());

/* API ROUTES */

app.use("/api", aiRoutes);

/* HEALTH CHECK */

app.get("/", (_, res) => {
  res.send("Backend is running ✅");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
