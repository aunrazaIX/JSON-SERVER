const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const {
  createShippment,
  readShippments,
  acceptShippment,
  getShipmentById,
  getMyCurrentShipment,
  reachedPickupLocation,
  completeShipment,
  reportDelay,
  rejectShipment,
  calculateTime,
  generatePDF,
  updateShipmentStatus,
  getShipmentByTrackingId,
  addUpdateRidersOnShipment,
  markInterestType,
  assignShipmentToRider,
  generateInvoice,
  manualPaymentForRemainingAmount,
  stats,
} = require("../controllers/shippments");
router.post("/create", createShippment);
router.get("/get", authMiddleware, readShippments);
router.post("/accept", authMiddleware, acceptShippment);
router.post("/reject", authMiddleware, rejectShipment);
router.get("/id/:id", authMiddleware, getShipmentById);
router.get("/current", authMiddleware, getMyCurrentShipment);
router.post("/reachedAtPickupLocation", authMiddleware, reachedPickupLocation);
router.post("/complete", authMiddleware, completeShipment);
router.get("/evaluateTime", authMiddleware, calculateTime);
router.post("/reportDelay", authMiddleware, reportDelay);
router.get("/generatePDF", authMiddleware, generatePDF);
router.post("/update", authMiddleware, updateShipmentStatus);
router.get("/tracking/:id", getShipmentByTrackingId);
router.post("/addUpdateRiders", authMiddleware, addUpdateRidersOnShipment);
router.post("/markInterestType", authMiddleware, markInterestType);
router.post("/assign", authMiddleware, assignShipmentToRider);
router.post("/generateInvoice/:id", authMiddleware, generateInvoice);
router.post("/manualPay", authMiddleware, manualPaymentForRemainingAmount);
router.get("/myStats", authMiddleware, stats);
module.exports = router;
