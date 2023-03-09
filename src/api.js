import express from "express";

import users from "./routes/users";

class ApiController {
  constructor() {
    this.router = express.Router();
    this.routes();
  }

  routes() {
    this.router.use("/users", users);
  }
}

export default ApiController;
