require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const errorHandler = require("./middlewares/errorHandler");
const articleRoutes = require("./routes/articleRoutes");
const ebookRoutes = require("./routes/ebookRoutes");
const storyRoutes = require("./routes/storyRoutes");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

// Serve the standalone frontend and API from the same origin.
app.use(express.static(path.join(__dirname)));

app.get("/api", (req, res) => {
  res.json({ status: "AllHub API running", message: "Server is live" });
});

app.use("/api", articleRoutes);
app.use("/api", ebookRoutes);
app.use("/api", storyRoutes);

app.use(errorHandler);

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "WARNING: GEMINI_API_KEY is not set. Generation endpoints will return errors until it is configured."
  );
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AllHub server running on port ${PORT}`);
});

module.exports = app;