import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";

const NODE_ENV = process.env.NODE_ENV || "development";

const frontendDistPath = path.join(
	__dirname,
	NODE_ENV === "production"
		? "../../../../frontend/dist"
		: "../../frontend/dist"
);

console.log("🌱 Environment:", NODE_ENV);
console.log("🚚 Path to frontend build:", frontendDistPath);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(express.static(frontendDistPath));

export default app;
