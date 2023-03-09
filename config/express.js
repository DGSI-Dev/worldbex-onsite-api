import {} from "dotenv/config";

import path from "path";
import express from "express";
import logger from "morgan";
import bodyParser from "body-parser";
import moment from "moment";
import multer from "multer";

import Database from "./database3";
import APIError from "./../src/helpers/APIError";
import api from "./../src/api";

import cors from "cors";

const app = express();
const upload = multer();
const dba = new Database();
if (process.env.NODE_ENV == "development") {
  app.use(logger("dev"));
}

app.set("view engine", "ejs");
app.set("json replacer", function (key, value) {
  if (this[key] instanceof Date) {
    value = moment(this[key]).format("YYYY-MM-DD HH:mm:ss");
  }

  return value;
});
app.set("json spaces", 2);
app.set("case sensitive routing", false);
app.set("strict routing", true);
app.set("x-powered-by", false);
app.disable("etag");

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// app.use(express.static(path.join(__dirname, './../uploads')))
app.use("/images", express.static("images"));
// app.use(express.static("./"));

app.use((req, res, next) => {
  req.dba = dba;
  console.log(`Connection established.`);
  next();
});

app.use("/api", new api().router);

app.use((err, req, res, next) => {
  if (!(err instanceof APIError)) {
    const apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  return next(err);
});

app.use((req, res, next) => {
  const err = new APIError("API not found", 404);
  return next(err);
});

app.use((err, req, res, next) =>
  res.status(err.status).json({
    message: err.isPublic ? err.message : err.status,
    stack: process.env.NODE_ENV === "development" ? err.stack : {},
  })
);

export default app;
