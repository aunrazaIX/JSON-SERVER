const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");

const driverLicenseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        firstName: {
            required: true,
            minLength: 3,
            maxLength: 50,
            type: String,
            trim: true,
        },
        lastName: {
            minLength: 3,
            maxLength: 50,
            required: true,
            type: String,
            trim: true,
        },
        dob: {
            type: String,
            required: true,
            trim: true,
        },
        licenseState: {
            type: String,
            required: true,
            trim: true,

        },
        licenseNumber: {
            type: String,
            required: true,
            trim: true,
        },
        expirationDate: {
            type: String,
            required: true,
            trim: true,
        },
        cdl: {
            type: Boolean,
            required: true,
            trim: true,
        },
        licenseClass: {
            type: String,
            required: true,
        },
        streetAddress: {
            required: true,
            type: String,
        },
        suite: {
            type: String,
        },
        zip: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        frontPhoto: {
            type: String,

        },
        backPhoto: {
            type: String
        }
    },
    { timestamps: true }
);

const validateDriverLicense = (user) => {
    const schema = Joi.object({

        firstName: Joi.string().min(3).max(50).required(),
        lastName: Joi.string().min(3).max(50).required(),
        dob: Joi.string().required(),
        licenseState: Joi.string().required(),
        licenseNumber: Joi.string().max(15).required(),
        expirationDate: Joi.string().required(),
        cdl: Joi.boolean().required(),
        licenseClass: Joi.string().required(),
        streetAddress: Joi.string().required(),
        suite: Joi.string(),
        zip: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        frontPhoto: Joi.string().required(),
        backPhoto: Joi.string().required(),
    });
    return schema.validate(user);
};
const DriverLicense = mongoose.model("DriverLicense", driverLicenseSchema);
module.exports = {
    DriverLicense,
    validateDriverLicense
};