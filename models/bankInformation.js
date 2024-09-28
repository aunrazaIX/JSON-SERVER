const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");

const bankInformationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        routingNumber: {
            type: String,
            required: true
        },
        accountNumber: {
            type: String,
            required: true
        },
        w9Image: {
            type: String,
            required: true
        },
        eidDeviceName: {
            type: String,
            required: true
        },
        eidCompanyName: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);
const validateBankInformation = (bank) => {
    const schema = Joi.object({
        routingNumber: Joi.string().length(10).required(),
        accountNumber: Joi.string().length(13).required(),
        w9Image:Joi.string().required(),
        eidDeviceName:Joi.string().required(),
        eidCompanyName:Joi.string().required()
    });
    return schema.validate(bank);
};

const BankInformation = mongoose.model("BankInformation", bankInformationSchema);
module.exports = {
    BankInformation,
    validateBankInformation,
};