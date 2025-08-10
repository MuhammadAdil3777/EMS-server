import cors from "cors";
import express from "express";
import bodyParser from "body-parser";

export const setupMiddleware = (app) => {
    // CORS configuration
    app.use(cors());
    
    // Body parsing middleware
    app.use(express.json());
    app.use(bodyParser.json());
};
