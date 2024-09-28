const mongoose = require("mongoose");
require("dotenv").config();
const {
  platFormRoles,
  comunicationMode,
  shipmentStatus,
} = require("../config");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const mongoosePaginate = require("mongoose-paginate-v2");

const userSchema = new mongoose.Schema(
  {
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
    email: {
      minLength: 5,
      maxLength: 255,
      unique: true,
      index: true,
      type: String,
      trim: true,
      sparse: true,
    },
    countyCode: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    password: {
      minLength: 5,
      maxLength: 1024,
      type: String,
      required: true,
    },
    role: {
      required: true,
      type: String,
      enum: platFormRoles,
    },
    image: {
      type: String,
      default: null,
    },
    driverLicense: {
      type: mongoose.Types.ObjectId,
      ref: "DriverLicense",
    },
    truckInformation: {
      type: mongoose.Types.ObjectId,
      ref: "TruckInformation",
    },
    trailerInformation: {
      type: mongoose.Types.ObjectId,
      ref: "TrailerInformation",
    },
    dotInformation: {
      type: mongoose.Types.ObjectId,
      ref: "DotInformation",
    },
    insuranceInformation: {
      type: mongoose.Types.ObjectId,
      ref: "InsuranceInformation",
    },
    bankInformation: {
      type: mongoose.Types.ObjectId,
      ref: "BankInformation",
    },
    medicalCertificateInformation: {
      type: mongoose.Types.ObjectId,
      ref: "MedicalCertificateInformation",
    },
    currentShippment: {
      type: mongoose.Types.ObjectId,
      ref: "Shipments",
      default: null,
    },
    modeOfCommunication: {
      type: String,
      enum: comunicationMode,
    },
    location: {
      type: [Number],
      index: "2dsphere",
      default: null,
    },
    profileCompleted: {
      type: Boolean,
      default: function () {
        if (this.role === platFormRoles[2]) {
          return false;
        }
        return true;
      },
    },
    fingerPrintKey: {
      type: String,
    },
    riderLocation: {
      type: [Number],
      index: "2dsphere",
    },
    status: {
      type: Boolean,
      default: true,
    },
    business:{
      type:String,
      defalut:null
    },
    address:{
      type:String,
      defalut:null
    }
  },
  { timestamps: true }
);

userSchema.plugin(mongoosePaginate);
const validateUser = (user) => {
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(50).required(),
    lastName: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().min(10).max(15).required(),
    password: Joi.string().required(),
    confirmPassword: Joi.string().required(),
    role: Joi.string()
      .valid(platFormRoles[0], platFormRoles[1], platFormRoles[2])
      .required(),
    modeOfCommunication: Joi.when("role", {
      is: platFormRoles[2],
      then: Joi.string()
        .valid(comunicationMode[0], comunicationMode[1], comunicationMode[2])
        .required(),
    }),
  });
  return schema.validate(user);
};

const validateLoginData = (user) => {
  const schema = Joi.object({
    email: Joi.string().when("fingerPrintKey", {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.when("phoneNumber", {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
    }),
    password: Joi.string().when("fingerPrintKey", {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    fingerPrintKey: Joi.string(),
    fcmToken: Joi.string(),
  });
  return schema.validate(user);
};

const validateReset = (data, resetPassword) => {
  let validationObject = {
    email: Joi.string().optional(),
  };
  if (resetPassword) {
    validationObject = { ...validationObject, otp: Joi.string().required() };
  }
  let schema = Joi.object(validationObject);
  return schema.validate(data);
};

const validateChangePassword = (data) => {
  const schema = Joi.object({
    password: Joi.string().required(),
    newPassword: Joi.string().required(),
  });
  return schema.validate(data);
};

const validateResetPassword = (data) => {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string()
      .required()
      .min(8)
      .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
      .required(),
    confirmPassword: Joi.string().required(),
  });
  return schema.validate(data);
};

const validateFingerPrint = (data) => {
  const schema = Joi.object({
    fingerPrintKey: Joi.string().required(),
  });
  return schema.validate(data);
};

const validateUpdateStatus = (data) => {
  let schema = Joi.object({
    id: Joi.objectId().required(),
    status: Joi.boolean().required(),
  });
  return schema.validate(data);
};

const validateRiderLocationUpdate = (data) => {
  const schema = Joi.object({
    location: Joi.array().items(Joi.number()).length(2).required(),
  });
  return schema.validate(data);
};

userSchema.methods.generateAuthToken = function () {
  let user = JSON.parse(JSON.stringify(this));
  delete user.password;
  return jwt.sign(user, process.env.TOKENKEY);
};

const User = mongoose.model("User", userSchema);
module.exports = {
  User,
  validateUser,
  validateReset,
  validateLoginData,
  validateChangePassword,
  validateLoginData,
  validateResetPassword,
  validateUpdateStatus,
  validateFingerPrint,
  validateRiderLocationUpdate,
};
