import express from "express";
import Controller from "./../../controllers/users/syncing.controller";
import validate from "./../../middlewares/validate";

const controller = new Controller();

var router = express.Router();


router.post("/syncToLocalServer", controller.syncToLocalServer);
router.post("/searchDataFromLocalServer", controller.searchDataFromLocalServer);
export default router;
