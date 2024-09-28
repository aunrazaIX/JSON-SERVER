const mongoose = require("mongoose");
require("dotenv").config();

const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
        },
        otp: {
            type: String,
            required: true
        },
        isVerified: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

const Otp = mongoose.model("Otp", otpSchema);
module.exports = {
    Otp,
};