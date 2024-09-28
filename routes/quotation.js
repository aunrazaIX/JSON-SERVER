const express = require("express");
const { createQuotation, getQuotationById, sendQuotation, getAllQuotation } = require("../controllers/quotation");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();
router.post("/create", createQuotation);
router.post("/send/:id", authMiddleware, sendQuotation);
router.get("/id/:id",  getQuotationById);
router.get("/all", authMiddleware,  getAllQuotation);
module.exports = router;








