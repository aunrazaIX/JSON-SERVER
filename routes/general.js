const express = require("express");
const { upload } = require("../middleware/image");
const { authMiddleware } = require("../middleware/auth");
const { uploadImage, getFaqs, getSettings, getAllNotifications, markNotificationAsReadUnread } = require("../controllers/general");
const router = express.Router();
router.post("/imageUpload", upload.single('image'), uploadImage);
router.get("/faqs", getFaqs);
router.get("/settings", getSettings);
router.get("/notifications", authMiddleware, getAllNotifications);
router.post("/markAsReadUnread/:id", authMiddleware, markNotificationAsReadUnread);
module.exports = router;