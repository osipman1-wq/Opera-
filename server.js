require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const errorHandler = require("./middlewares/errorHandler");
const authRoutes = require("./routes/authRoutes");
const articleRoutes = require("./routes/articleRoutes");
const ebookRoutes = require("./routes/ebookRoutes");
const storyRoutes = require("./routes/storyRoutes");
const learningRoutes = require("./routes/learningRoutes");
const refineRoutes = require("./routes/refineRoutes");
const savingsRoutes = require("./routes/savingsRoutes");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

// Serve the static frontend and static assets from root directory
app.use(express.static(path.join(__dirname)));

app.get("/api", (req, res) => {
  res.json({
    status: "AllHub API online",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    version: "1.2.0"
  });
});

// All API routing is exclusively executed on the backend
app.use("/api", authRoutes);
app.use("/api", articleRoutes);
app.use("/api", ebookRoutes);
app.use("/api", storyRoutes);
app.use("/api", learningRoutes);
app.use("/api", refineRoutes);
app.use("/api", savingsRoutes);

app.use(errorHandler);

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "WARNING: GEMINI_API_KEY is not set in environment variables. AI generation endpoints will return an error until configured in project settings."
  );
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AllHub server running on port ${PORT}`);
});

module.exports = app;
