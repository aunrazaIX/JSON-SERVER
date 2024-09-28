const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const {
  registerUser,
  authenticateUser,
  forgotPassword,
  verifyOtp,
  sendSMS,
  getQuotationById,
  addUpdateDriverLicense,
  addUpdateTruckInformation,
  addUpdateTrailerInformation,
  addUpdateDotInformation,
  addUpdateInsuranceInformation,
  addUpdateBankInformation,
  addUpdateMedicalCertificateInformation,
  getProfile,
  resetPassword,
  getMyEarnings,
  completeUserProfile,
  updateProfile,
  getAllUsers,
  getUserDetail,
  updateStatus,
  addFingerPrint,
  changePassword,
  updateRiderLocation,
  logout,
} = require("../controllers/user");
router.post("/register", registerUser);
router.post("/login", authenticateUser);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyOtp", verifyOtp);
router.post("/resetPassword", resetPassword);
router.get("/profile", authMiddleware, getProfile);
router.post("/sendSms", sendSMS);
router.post("/driverLicenseAddUpdate", authMiddleware, addUpdateDriverLicense);
router.post(
  "/truckInformationAddUpdate",
  authMiddleware,
  addUpdateTruckInformation
);
router.post(
  "/trailerInformationAddUpdate",
  authMiddleware,
  addUpdateTrailerInformation
);
router.post("/dotInfomationAddUpdate", authMiddleware, addUpdateDotInformation);
router.post(
  "/insuranceInformationAddUpdate",
  authMiddleware,
  addUpdateInsuranceInformation
);
router.post(
  "/bankInformationAddUpdate",
  authMiddleware,
  addUpdateBankInformation
);
router.post(
  "/bankInformationAddUpdate",
  authMiddleware,
  addUpdateBankInformation
);
router.post(
  "/medicalCertificateInformationAddUpdate",
  authMiddleware,
  addUpdateMedicalCertificateInformation
);
router.post("/updateProfile", authMiddleware, updateProfile);
router.post("/completeProfile", authMiddleware, completeUserProfile);
router.get("/earnings", authMiddleware, getMyEarnings);
router.get("/all", authMiddleware, getAllUsers);
router.get("/id/:id", authMiddleware, getUserDetail);
router.post("/updateStatus", authMiddleware, updateStatus);
router.post("/addFingerPrints", authMiddleware, addFingerPrint);
router.post("/changePassword", authMiddleware, changePassword);
router.post("/updateRiderLocation", authMiddleware, updateRiderLocation);
router.post("/logout", authMiddleware, logout);
module.exports = router;
