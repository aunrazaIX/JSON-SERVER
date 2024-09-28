const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");
const { quotationType } = require("../config");

const truckInformationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    make: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    carrierType: {
      type: String,
      required: true,
    },
    gvwr: {
      type: String,
      required: true,
    },
    registrationDocument: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: String,
      required: true,
    },
    jambStickerImage: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const validateTruckInformation = (truck) => {
  const schema = Joi.object({
    year: Joi.string().required(),
    make: Joi.string().required(),
    model: Joi.string().required(),
    carrierType: Joi.string()
      .valid(
        quotationType[0],
        quotationType[1],
        quotationType[2],
        quotationType[3],
        quotationType[4]
      )
      .required(),
    gvwr: Joi.string().length(5).required(),
    registrationDocument: Joi.string().required(),
    expiryDate: Joi.string().required(),
    jambStickerImage: Joi.string().required(),
  });
  return schema.validate(truck);
};
const TruckInformation = mongoose.model(
  "TruckInformation",
  truckInformationSchema
);
module.exports = {
  TruckInformation,
  validateTruckInformation,
};
