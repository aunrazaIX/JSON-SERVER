const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");

const dotInformationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        usDotNumber: {
            type: String,
            required: true
        },
        mcNumber: {
            type: String,
            required: true
        },
        usDotMcNumberTruckImage: {
            type: String,
            required: true
        },
        truckDotInspectionImage: {
            type: String,
            required: true
        },
        trailerDotInspectionImage: {
            type: String,
        },
        truckInspectionDate: {
            type: String,
            required: true
        },
        trailerInspectionDate: {
            type: String,
        }
    },
    { timestamps: true }
);

const validateDotInformation = (dot) => {
    const schema = Joi.object({
        usDotNumber: Joi.string().length(10).required(),
        mcNumber: Joi.string().length(10).required(),
        usDotMcNumberTruckImage: Joi.string().required(),
        truckDotInspectionImage: Joi.string().required(),
        trailerDotInspectionImage:Joi.string(),
        truckInspectionDate: Joi.string().required(),
        trailerInspectionDate: Joi.string()

    });
    return schema.validate(dot);
};
const DotInformation = mongoose.model("DotInformation", dotInformationSchema);
module.exports = {
    DotInformation,
    validateDotInformation,
};