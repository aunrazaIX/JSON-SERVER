const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");

const traileInformationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trailerType: {
      type: String,
      enum: ["flatBed", "dump", "carHauler", "enclosed"],
      required: true,
    },
    trailerLength: {
      type: String,
      required: true,
    },
    gvwr: {
      type: String,
      required: true,
    },
    maxCapacity: {
      type: String,
      required: true,
    },
    rearExcelPhoto: {
      type: String,
      required: true,
    },
    registrationDocument: {
      type: String,
      required: true,
    },
    expirationDate: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const validateTrailerInformation = (trailer) => {
  const schema = Joi.object({
    trailerType: Joi.string()
      .valid("flatBed", "dump", "carHauler", "enclosed")
      .required(),
    trailerLength: Joi.string().length(2).required(),
    gvwr: Joi.string().length(5).required(),
    maxCapacity: Joi.string().required(),
    rearExcelPhoto: Joi.string().required(),
    registrationDocument: Joi.string().required(),
    expirationDate: Joi.string().required(),
  });
  return schema.validate(trailer);
};
const TrailerInformation = mongoose.model(
  "TrailerInformation",
  traileInformationSchema
);
module.exports = {
  TrailerInformation,
  validateTrailerInformation,
};
