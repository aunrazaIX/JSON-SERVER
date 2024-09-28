const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");

const medicalCertificateSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        certificateExpiryDate: {
            type: String,
            required: true
        },
        medicalCertificateImage: {
            type: String,
            required: true
        },
    },
    { timestamps: true }
);
const validateMedicalCertificateInformation = (medical) => {
    const schema = Joi.object({
        certificateExpiryDate: Joi.string().required(),
        medicalCertificateImage: Joi.string().required(),
    });
    return schema.validate(medical);
};

const MedicalCertificateInformation = mongoose.model("MedicalCertificateInformation", medicalCertificateSchema);
module.exports = {
    MedicalCertificateInformation,
    validateMedicalCertificateInformation,
};