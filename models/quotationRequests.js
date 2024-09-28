const mongoose = require("mongoose");
require("dotenv").config();
const {
  quotationType,
  quotationVia,
  cargoLoadedBy,
  cargoUnloadBy,
  requestStatus,
  estimatedWeightFor26,
  estimatedWeightUnder2k,
  estimatedWeightUnderGeneralFreight,
} = require("../config");
const Joi = require("joi");
const mongoosePaginate = require("mongoose-paginate-v2");

const quotationRequestsSchema = new mongoose.Schema(
  {
    pickupZip: {
      required: true,
      minLength: 3,
      maxLength: 50,
      type: String,
      trim: true,
    },
    dropOffZip: {
      minLength: 3,
      maxLength: 50,
      type: String,
      trim: true,
    },
    type: {
      required: true,
      type: String,
      enum: quotationType,
    },
    vehicleOperable: {
      type: Boolean,
      required: function () {
        if (this.type === quotationType[2]) {
          return true;
        }
        return false;
      },
    },
    vehicleDetails: {
      type: Object,
      required: function () {
        if (this.type === quotationType[2]) {
          return true;
        }
        return false;
      },
    },
    longestDimesntionOfCargo: {
      required: function () {
        if (this.type === quotationType[1] || this.type == quotationType[4]) {
          return true;
        }
        return false;
      },
      type: Number,
    },
    dimensionUnder896: {
      required: function () {
        if (this.type === quotationType[0]) {
          return true;
        }
        return false;
      },
      type: Boolean,
    },
    estimatedWeight: {
      required: function () {
        if (
          this.type === quotationType[0] ||
          this.type === quotationType[1] ||
          this.type === quotationType[4]
        ) {
          return true;
        }
        return false;
      },
      type: String,
    },
    cargoDescription: {
      type: String,
      required: function () {
        if (this.type === "lessThan2KLbs" || this.type === "generalFreight") {
          return true;
        }
        return false;
      },
    },
    media: {
      type: Array,
      required: false,
    },
    cargoLoadedBy: {
      type: String,
      required: function () {
        if (
          this.type === quotationType[0] ||
          this.type === quotationType[1] ||
          this.type === quotationType[4]
        ) {
          return true;
        }
        return false;
      },
      enum: cargoLoadedBy,
    },
    cargoUnloadBy: {
      type: String,
      required: function () {
        if (
          this.type === quotationType[0] ||
          this.type === quotationType[1] ||
          this.type === quotationType[4]
        ) {
          return true;
        }
        return false;
      },
      enum: cargoUnloadBy,
    },
    cargoReadyForPickup: {
      type: Boolean,
      required: true,
    },
    pickupDate: {
      type: Date,
      required: function () {
        if (!this.cargoReadyForPickup) {
          return true;
        }
        return false;
      },
    },
    quotationVia: {
      required: true,
      type: String,
      enum: quotationVia,
    },
    pickupCoordinates: {
      type: [Number],
      index: "2dsphere",
      required: true,
    },
    dropOffCoordinates: {
      type: [Number],
      index: "2dsphere",
    },
    pickupAddress: {
      type: String,
    },
    dropOffAddress: {
      type: String,
    },
    pickupCity: {
      type: String,
    },
    dropOffCity: {
      type: String,
    },
    pickupState: {
      type: String,
    },
    dropOffState: {
      type: String,
    },
    phone: {
      type: String,
      required: function () {
        if (this.quotationVia === "phone") {
          return true;
        }
        return false;
      },
    },
    estimatedFuelCost: {
      type: String,
    },
    mileage: {
      type: String,
    },
    brokerCompensation: {
      type: Number,
      default: 0,
    },
    email: {
      type: String,
      required: function () {
        if (this.quotationVia === "email") {
          return true;
        }
        return false;
      },
    },
    redirectUri: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: requestStatus[0],
      enum: requestStatus,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
quotationRequestsSchema.plugin(mongoosePaginate);
const validateQuotation = (quotation) => {
  const schema = Joi.object({
    pickupZip: Joi.number().required(),
    dropOffZip: Joi.when("type", {
      is: Joi.valid(
        quotationType[0],
        quotationType[1],
        quotationType[2],
        quotationType[4]
      ),
      then: Joi.required(),
    }),
    type: Joi.string()
      .valid(
        quotationType[0],
        quotationType[1],
        quotationType[2],
        quotationType[3],
        quotationType[4]
      )
      .required(),
    dimensionUnder896: Joi.when("type", {
      is: quotationType[0],
      then: Joi.boolean().required(),
    }),
    longestDimesntionOfCargo: Joi.when("type", {
      is: Joi.valid(quotationType[1], quotationType[4]),
      then: Joi.number().required(),
    }),
    vehicleOperable: Joi.when("type", {
      is: quotationType[2],
      then: Joi.boolean().required(),
    }),
    vehicleDetails: Joi.when("type", {
      is: quotationType[2],
      then: Joi.object({
        year: Joi.string().trim().required(),
        make: Joi.string().min(2).max(100).trim().required(),
        model: Joi.string().min(2).max(100).trim().required(),
      }).required(),
    }),
    estimatedWeight: Joi.when("type", {
      is: Joi.valid(quotationType[0], quotationType[1], quotationType[4]),
      then: Joi.string().when("type", {
        is: quotationType[4],
        then: Joi.valid(
          estimatedWeightFor26[0],
          estimatedWeightFor26[1],
          estimatedWeightFor26[2]
        ).required(),
      }),
    })
      .when("type", {
        is: quotationType[0],
        then: Joi.valid(
          estimatedWeightUnder2k[0],
          estimatedWeightUnder2k[1],
          estimatedWeightUnder2k[2],
          estimatedWeightUnder2k[3]
        ).required(),
      })
      .when("type", {
        is: quotationType[1],
        then: Joi.valid(
          estimatedWeightUnderGeneralFreight[0],
          estimatedWeightUnderGeneralFreight[1],
          estimatedWeightUnderGeneralFreight[2]
        ).required(),
      }),
    cargoDescription: Joi.when("type", {
      is: Joi.valid(quotationType[0], quotationType[1]),
      then: Joi.string().min(3).max(1000).required().trim(),
    }),
    media: Joi.array().items(Joi.string()),
    cargoLoadedBy: Joi.when("type", {
      is: Joi.valid(quotationType[0], quotationType[1], quotationType[4]),
      then: Joi.valid(cargoLoadedBy[0], cargoLoadedBy[1]).required(),
    }),
    cargoUnloadBy: Joi.when("type", {
      is: Joi.valid(quotationType[0], quotationType[1], quotationType[4]),
      then: Joi.valid(cargoUnloadBy[0], cargoUnloadBy[1]).required(),
    }),
    redirectUri: Joi.string().required(),
    cargoReadyForPickup: Joi.boolean().required(),
    pickupDate: Joi.when("cargoReadyForPickup", {
      is: false,
      then: Joi.string()
        .pattern(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
        .required(),
    }),
    quotationVia: Joi.string()
      .valid(quotationVia[0], quotationVia[1])
      .required(),
    phone: Joi.when("quotationVia", {
      is: quotationVia[1],
      then: Joi.string().required().trim(),
    }),
    email: Joi.when("quotationVia", {
      is: quotationVia[0],
      then: Joi.string().email().required(),
    }),
  });
  return schema.validate(quotation);
};

const validateSendQuotaion = (quotation) => {
  const schema = Joi.object({
    amount: Joi.number(),
  });
  return schema.validate(quotation);
};

const QuotationRequests = mongoose.model(
  "QuotationRequests",
  quotationRequestsSchema
);
module.exports = {
  QuotationRequests,
  validateQuotation,
  validateSendQuotaion,
};
