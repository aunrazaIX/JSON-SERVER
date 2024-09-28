const mongoose = require("mongoose");
const {
  quotationType,
  cargoCollectedAt,
  loadedVia,
  vehicleCollectedAt,
  cargoLoadedBy,
  cargoUnloadBy,
  shipmentStatus,
  riderRequestedAs,
  paymentStatus,
  masterCode,
} = require("../config");
const { QuotationRequests } = require("./quotationRequests");
const Joi = require("joi");
require("dotenv").config();
const mongoosePaginate = require("mongoose-paginate-v2");
const personInfo = {
  firstName: {
    type: String,
    min: 2,
    max: 100,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
    max: 100,
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  businessName: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    required: true,
  },
  address1: {
    type: String,
  },
  city: {
    type: String,
    required: true,
  },
  cargoCollectedAt: {
    type: String,
  },
  vehiceCollectedAt: {
    type: String,
  },
  vehicleDeliveredAt: {
    type: String,
  },
  state: {
    type: String,
    default: null,
  },
  zip: {
    type: String,
    required: true,
  },
};
const shipmentsSchema = new mongoose.Schema(
  {
    id: {
      type: String,
    },
    quotation: {
      type: mongoose.Types.ObjectId,
      ref: "QuotationRequests",
      required: true,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shipperInformation: {
      ...personInfo,
    },
    recieverInformation: {
      ...personInfo,
    },
    commodityInformation: {
      type: {
        length: {
          type: String,
        },
        weight: {
          type: String,
        },
        description: {
          type: String,
        },
        media: {
          type: Array,
        },
      },
      default: null,
    },
    equipmentsInformation: {
      type: {
        toolsRequired: {
          type: Array,
        },
        cargoLoadedBy: {
          type: String,
        },
        cargoUnloadedBy: {
          type: String,
        },
      },
      default: null,
    },
    loadInformation: {
      type: {
        longestDimenstion: {
          type: Number,
        },
        media: {
          type: Array,
        },
        cargoLoaded: {
          type: String,
          enum: [...loadedVia,...[""]],
        },
        toolsRequired: {
          type: Array,
        },
      },
      default: null,
    },
    vehicleInformation: {
      type: {
        vehicleOperable: {
          type: Boolean,
        },
        media: {
          type: Array,
        },
        vehicleDetails: {
          type: {
            year: String,
            make: String,
            model: String,
          },
          default: null,
        },
        vehicleLoadedBy: {
          type: String,
        },
        toolsRequired: {
          type: Array,
        },
      },
      default: null,
    },
    pickupTime: {
      type: String,
    },
    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verificationOTP: {
      type: String,
      default: null,
    },
    delayed: {
      type: {
        issue: {
          type: String,
        },
        timeRequiredToResolve: {
          type: String,
        },
      },
      default: null,
    },
    rejectedBy: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
        reason: String,
      },
    ],
    projectEta: {
      type: String,
      default: null,
    },
    paymentLink: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    adminAmount: {
      type: Number,
      default: 0,
    },
    riderAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: paymentStatus,
      default: paymentStatus[0],
    },
    masterCodeUsedArrivalReason: {
      type: String,
      default: null,
    },
    masterCodeUsedCompletedReason: {
      type: String,
      default: null,
    },
    riders: [
      {
        rider: {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          default: null,
        },
        date: {
          type: String,
          default: null,
        },
        time: {
          type: String,
          default: null,
        },
        reason: {
          type: String,
          default: null,
        },
      },
    ],
    status: {
      enum: shipmentStatus,
      type: String,
      default: shipmentStatus[0],
    },
  },
  { timestamps: true }
);
shipmentsSchema.plugin(mongoosePaginate);
const Shipments = mongoose.model("Shipments", shipmentsSchema);
const personSchema = {
  firstName: Joi.string().min(2).max(100).trim().required(),
  lastName: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().trim().required(),
  mobile: Joi.string().trim().required(),
  businessName: Joi.string().allow(null, "").trim().optional(),
  address: Joi.string().trim().required(),
  address1: Joi.string().allow(null, "").trim().optional(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  zip: Joi.string().trim().required(),
};
const commodityInformation = {
  length: Joi.string().required(),
  weight: Joi.string().required(),
  description: Joi.string().required(),
  media: Joi.array().items(Joi.string()).optional(),
};
const equipmentsInformation = {
  toolsRequired: Joi.array().optional(),
};
const validateShippment = (shippment) => {
  const schema = Joi.object({
    type: Joi.string().required(),
    shipperInformation: Joi.when("type", {
      is: Joi.valid(quotationType[3]),
      then: Joi.object({
        ...personSchema,
        cargoCollectedAt: Joi.string()
          .valid(
            cargoCollectedAt[0],
            cargoCollectedAt[1],
            cargoCollectedAt[2],
            cargoCollectedAt[3],
            cargoCollectedAt[4]
          )
          .required(),
      }),
      otherwise: Joi.when("type", {
        is: Joi.valid(quotationType[2]),
        then: Joi.object({
          ...personSchema,
          vehiceCollectedAt: Joi.string()
            .valid(
              vehicleCollectedAt[0],
              vehicleCollectedAt[1],
              vehicleCollectedAt[2],
              vehicleCollectedAt[3]
            )
            .required(),
        }),
        otherwise: Joi.object(personSchema),
      }),
    }).required(),
    loadInformation: Joi.when("type", {
      is: quotationType[3],
      then: Joi.object({
        longestDimenstion: Joi.number().required(),
        media: Joi.array().items(Joi.string()).min(1).max(12).required(),
        cargoLoaded: Joi.string()
          .valid(loadedVia[0], loadedVia[1], loadedVia[2]).allow(""),
        toolsRequired: Joi.array().optional(),
      }).required(),
    }),
    commodityInformation: Joi.when("type", {
      is: Joi.valid(quotationType[4], quotationType[1]),
      then: Joi.object(commodityInformation).required(),
    }),
    recieverInformation: Joi.when("type", {
      is: Joi.valid(quotationType[2]),
      then: Joi.object({
        ...personSchema,
        vehiceCollectedAt: Joi.string()
          .valid(
            vehicleCollectedAt[0],
            vehicleCollectedAt[1],
            vehicleCollectedAt[2],
            vehicleCollectedAt[3]
          )
          .required(),
      }),
      otherwise: Joi.object(personSchema),
    }).required(),
    equipmentsInformation: Joi.when("type", {
      is: Joi.valid(
        quotationType[0],
        quotationType[1],
        quotationType[2],
        quotationType[4]
      ),
      then: Joi.when("type", {
        is: quotationType[0],
        then: Joi.object({
          ...equipmentsInformation,
          cargoLoadedBy: Joi.string()
            .valid(
              cargoLoadedBy[0],
              cargoLoadedBy[1],
              cargoLoadedBy[2],
              cargoLoadedBy[3]
            )
            .required(),
          cargoUnloadedBy: Joi.string()
            .valid(
              cargoUnloadBy[0],
              cargoUnloadBy[1],
              cargoUnloadBy[2],
              cargoUnloadBy[3]
            )
            .required(),
        }).required(),
        otherwise: Joi.object(equipmentsInformation).required(),
      }),
    }),
    vehicleInformation: Joi.when("type", {
      is: quotationType[2],
      then: Joi.object({
        vehicleOperable: Joi.boolean().required(),
        vehicleDetails: Joi.object({
          year: Joi.string().required(),
          make: Joi.string().required(),
          model: Joi.string().required(),
        }).required(),
        media: Joi.array().items(Joi.string()).min(1).max(12).required(),
        vehicleLoadedBy: Joi.string()
          .valid(loadedVia[0], loadedVia[1], loadedVia[2])
          .required(),
        toolsRequired: Joi.array().optional(),
      }).required(),
    }),
    pickupDate: Joi.optional(),
  }).unknown(true);
  return schema.validate(shippment);
};

const validateUpdateShipment = (data) => {
  const schema = Joi.object({
    shipmentId: Joi.objectId().required(),
    code: Joi.string().required(),
    reason: Joi.when("code", {
      is: masterCode,
      then: Joi.string().required(),
    }),
  });
  return schema.validate(data);
};

const validateReportDelay = (data) => {
  const schema = Joi.object({
    shipmentId: Joi.objectId().required(),
    issue: Joi.string().required(),
    timeRequiredToResolve: Joi.string().required(),
  });
  return schema.validate(data);
};
const validateRejectShipment = (data) => {
  const schema = Joi.object({
    shipmentId: Joi.objectId().required(),
    reason: Joi.string().required(),
  });
  return schema.validate(data);
};

const validateEvaluateTime = (data) => {
  const schema = Joi.object({
    shipmentId: Joi.objectId().required(),
    latitude: Joi.string().required(),
    longitude: Joi.string().required(),
  });
  return schema.validate(data);
};
const validateUpdateStatus = (data) => {
  const schema = Joi.object({
    id: Joi.objectId().required(),
    status: Joi.string()
      .valid(
        shipmentStatus[0],
        shipmentStatus[1],
        shipmentStatus[2],
        shipmentStatus[3],
        shipmentStatus[4],
        shipmentStatus[5]
      )
      .required(),
  });
  return schema.validate(data);
};

const validateAddRiders = (data) => {
  const schema = Joi.object({
    riders: Joi.array().min(1).items(Joi.objectId()).required(),
    shipment: Joi.objectId().required(),
  });
  return schema.validate(data);
};

const validateInterestType = (data) => {
  const schema = Joi.object({
    shipment: Joi.objectId().required(),
    date: Joi.string().allow(null, "").optional(),
    time: Joi.string().allow(null, "").optional(),
    type: Joi.string()
      .valid(riderRequestedAs[0], riderRequestedAs[1])
      .required(),
    reason: Joi.when("type", {
      is: riderRequestedAs[1],
      then: Joi.string().required(),
    }),
  });
  return schema.validate(data);
};
const validateAssignShipmentToRider = (data) => {
  const schema = Joi.object({
    rider: Joi.objectId().required(),
    shipment: Joi.objectId().required(),
  });
  return schema.validate(data);
};
const validateAcceptShippment = (acceptShippment) => {
  const schema = Joi.object({
    time: Joi.string().required(),
  }).unknown(true);
  return schema.validate(acceptShippment);
};

const validateManualPayment = (data) => {
  const schema = Joi.object({
    shipmentId: Joi.objectId().required(),
    amount: Joi.number().required(),
  });
  return schema.validate(data);
};
module.exports = {
  QuotationRequests,
  validateShippment,
  Shipments,
  validateAcceptShippment,
  validateUpdateShipment,
  validateReportDelay,
  validateRejectShipment,
  validateEvaluateTime,
  validateUpdateStatus,
  validateAddRiders,
  validateInterestType,
  validateAssignShipmentToRider,
  validateManualPayment,
};
