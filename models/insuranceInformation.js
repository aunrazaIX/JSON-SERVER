const mongoose = require("mongoose");
require("dotenv").config();
const Joi = require("joi");

const insuranceInformationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    policyExpirationDate: {
      type: String,
      required: true,
    },
    insuranceDeclarationImage: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
const validateInsuranceInformation = (insurance) => {
  const schema = Joi.object({
    policyExpirationDate: Joi.string().required(),
    insuranceDeclarationImage: Joi.string().required(),
  });
  return schema.validate(insurance);
};

const InsuranceInformation = mongoose.model(
  "InsuranceInformation",
  insuranceInformationSchema
);
module.exports = {
  InsuranceInformation,
  validateInsuranceInformation,
};
