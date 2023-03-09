import express from "express";

import auth from "./users/auth.route";
import syncing from "./users/syncing.route";
var router = express.Router();

router.use("/auth", auth);
router.use("/syncing", syncing);
export default router;
