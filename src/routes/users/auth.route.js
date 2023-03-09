import express from "express";
import Controller from "./../../controllers/users/auth.controller";
import validate from "./../../middlewares/validate";

const controller = new Controller();

var router = express.Router();


router.get("/getEvents", controller.getEvents);
router.post("/searchAttendee", controller.searchAttendee);
router.post("/createAttendee", controller.createAttendee);
router.post("/updateAttendee/:qrCode", controller.updateAttendee);


router.post("/addPrintlogs", controller.addPrintlogs);
export default router;
