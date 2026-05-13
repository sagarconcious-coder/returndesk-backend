import express from "express";
import helmet from "helmet";
import cors from "cors";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
export default app;
