require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: "https://tikkon66.github.io" 
}));
app.use(express.json());

const authRoutes = require("./routes/auth");
const scoreRoutes = require("./routes/score");
app.use("/auth", authRoutes);
app.use("/score", scoreRoutes);


app.listen(5000, () => console.log("Server running"));
