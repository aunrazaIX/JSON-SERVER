const {
  User,
  validateUser,
  validateLoginData,
  validateReset,
  validateResetPassword,
  validateUpdateStatus,
  validateFingerPrint,
  validateChangePassword,
  validateRiderLocationUpdate,
} = require("../models/user");
const bcrypt = require("bcrypt");
const { generateOTP, sendEmail, sendSms } = require("../utils");
const {
  platFormRoles,
  messages,
  shipmentStatus,
  accountSid,
  authToken,
} = require("../config");
const {
  validateDriverLicense,
  DriverLicense,
} = require("../models/driverLicense");
const {
  validateTruckInformation,
  TruckInformation,
} = require("../models/Truck");
const { validateDotInformation, DotInformation } = require("../models/Dot");
const {
  validateTrailerInformation,
  TrailerInformation,
} = require("../models/Trailer");
const {
  validateInsuranceInformation,
  InsuranceInformation,
} = require("../models/insuranceInformation");
const {
  validateBankInformation,
  BankInformation,
} = require("../models/bankInformation");
const {
  validateMedicalCertificateInformation,
  MedicalCertificateInformation,
} = require("../models/medicalCertificateInformation");
const { Otp } = require("../models/otp");
const { mongoose } = require("mongoose");
const { Shipments } = require("../models/shippments");
const twilio = require("twilio");
const { Devices } = require("../models/devices");
const { riderProfileVerify } = require("../utils/notifications");

const registerUser = async (req, res) => {
  try {
    let { body } = req;
    const { error } = validateUser(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const userExist = await User.findOne({
      $or: [{ email: body.email }, { phoneNumber: body.phoneNumber }],
    });
    if (userExist) {
      return res.status(400).send({ message: "Email/Phone is already taken" });
    }
    if (body.password !== body.confirmPassword) {
      return res
        .status(400)
        .send({ message: "Password & Confirm Password should be same" });
    }
    body.password = await bcrypt.hash(body.password, 10);
    const user = new User(body);
    const token = user.generateAuthToken();
    await user.save();
    delete user?._doc?.password;
    const obj = {
      ...user?._doc,
      token,
    };
    if (body.fcmToken) {
      let isDeviceExist = await Devices.findOne({ user: user?._id });
      if (!isDeviceExist) {
        let device = new Devices({ user: user?.id, fcmToken: body.fcmToken });
        await device.save();
      }
    }
    return res
      .status(200)
      .send({ user: obj, message: `Registered as ${body?.role}` });
  } catch (e) {
    console.log("e", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const authenticateUser = async (req, res) => {
  try {
    const { body } = req;
    const { error } = validateLoginData(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const user = await User.findOne(
      body?.fingerPrintKey
        ? { fingerPrintKey: body.fingerPrintKey }
        : {
            $or: [{ email: body.email }, { phoneNumber: body.email }],
          }
    );
    if (!user) {
      return res.status(400).send({
        message: body?.fingerPrintKey
          ? "Invalid Key"
          : "Invalid Email/Phone or Password",
      });
    }
    const valid = body?.fingerPrintKey
      ? body?.fingerPrintKey === user.fingerPrintKey
      : await bcrypt.compare(body.password, user?.password);
    if (!valid) {
      return res.status(400).send({
        message: body?.fingerPrintKey
          ? "Invalid Key"
          : "Invalid Email/Phone or Password",
      });
    }
    if (!user?.status && user?.role !== platFormRoles[0]) {
      return res
        .status(400)
        .send({ message: "cannot login please contact support" });
    }
    if (body.fcmToken) {
      const deviceTokenExist = await Devices.findOne({
        fcmToken: body.fcmToken,
      });
      if (!deviceTokenExist) {
        let device = new Devices({ fcmToken: body.fcmToken, user: user._id });
        await device.save();
      }
    }
    const token = user.generateAuthToken();
    delete user?._doc?.password;
    const obj = {
      ...user?._doc,
    };
    return res
      .status(200)
      .send({ user: obj, token, message: `Login Succesful!` });
  } catch (e) {
    console.log("e", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const changePassword = async (req, res) => {
  try {
    let { user, body } = req;
    user = await User.findById(user._id);
    const { error } = validateChangePassword(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const valid = await bcrypt.compare(body.password, user?.password);
    if (valid) {
      let newPassword = await bcrypt.hash(body.newPassword, 10);
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: newPassword,
          },
        }
      );
      return res.status(200).send({ message: messages.passowrdChanged });
    }
    return res.status(400).send({ message: messages.invalidPassword });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const { body } = req;
    const { error } = validateReset(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const user = await User.findOne({
      $or: [{ email: body.email }, { phoneNumber: body.email }],
    });
    if (!user) {
      return res.status(400).send({ message: "Email Doesnot Exist" });
    }
    let otp = generateOTP();
    let previousRecord = await Otp.findOne({ email: body.email });
    if (previousRecord) {
      previousRecord.otp = otp;
      await Otp.updateOne({ email: body.email }, { $set: { otp: otp } });
    } else {
      await new Otp({ email: body.email, otp: otp }).save();
    }
    if (body.email.includes("@")) {
      await sendEmail({
        emailTo: body.email,
        subject: "Forgot Password",
        message: `Your 6 digits OTP verification code is ${otp}`,
      });
    } else {
      await sendSms(
        `Your 6 digits OTP veri fication code is ${otp}`,
        body?.email
      );
    }
    return res
      .status(200)
      .send({ message: "OTP has been sent on your email address" });
  } catch (e) {
    console.log("e", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const verifyOtp = async (req, res) => {
  try {
    const { body } = req;
    const { error } = validateReset(body, true);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const generatedOtp = await Otp.findOne({
      $or: [{ email: body.email }, { phoneNumber: body.email }],
    });
    if (!generatedOtp) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    if (generatedOtp.otp !== body.otp) {
      return res.status(400).send({ message: messages.invalidOtp });
    }
    // if (generatedOtp.isVerified) {
    //   return res.status(400).send({ message: messages.alreadyVerified });
    // }
    await Otp.updateOne({ email: body.email }, { $set: { isVerified: true } });
    return res.status(200).send({ message: messages.otpVerifed });
  } catch (e) {
    console.log("e", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { body } = req;
    const { error } = validateResetPassword(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    if (body.password !== body.confirmPassword) {
      return res
        .status(400)
        .send({ message: "Password & Confirm Password should be same" });
    }
    let generatedOtp = await Otp.findOne({ email: body.email });
    if (generatedOtp?.isVerified) {
      let _user = await User.findOne({
        $or: [{ email: body.email }, { phoneNumber: body.email }],
      });
      if (_user) {
        _user.password = await bcrypt.hash(body.password, 10);
        await User.updateOne(
          {
            $or: [{ email: body.email }, { phoneNumber: body.email }],
          },
          _user
        );
        await Otp.deleteOne({ email: body.email });
        return res.status(200).send({ message: messages.passwordReset });
      }
      return res.status(400).send({ message: messages.somethingWentWrong });
    }
    return res.status(400).send({ message: messages.otpNotVerifed });
  } catch (e) {
    console.log("e", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const addFingerPrint = async (req, res) => {
  try {
    let { user, body } = req;
    user = await User.findById(user._id);
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateFingerPrint(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          fingerPrintKey: body.fingerPrintKey,
        },
      }
    );
    return res.status(200).send({ message: messages.fingerPrintsAdded });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const sendSMS = async (req, res) => {
  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: "Janu aik service pai kaam krha kuch time tughy msgs ayen gay Aun Here",
      from: "+18162564801",
      to: "+61450206373",
    });
    return res.status(200).send({ message: "Message Sent Successfully!" });
  } catch (e) {
    console.log("Error", e);
    return res.status(500).send({ message: e?.message });
  }
};
const addUpdateDriverLicense = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateDriverLicense(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let licenseData = {
      userId: user._id,
      firstName: body.firstName,
      lastName: body.lastName,
      dob: body.dob,
      licenseState: body.licenseState,
      licenseNumber: body.licenseNumber,
      expirationDate: body.expirationDate,
      cdl: body.cdl,
      licenseClass: body.licenseClass,
      streetAddress: body.streetAddress,
      zip: body.zip,
      city: body.city,
      state: body.state,
      frontPhoto: body.frontPhoto,
      backPhoto: body.backPhoto,
    };
    if (body.suite) {
      licenseData = { ...licenseData, suite: body.suite };
    }
    let driverLicense = await DriverLicense.findOne({ userId: user._id });
    if (driverLicense) {
      await DriverLicense.updateOne({ userId: user._id }, licenseData);
      return res.status(200).send({ message: messages.updated });
    }
    driverLicense = new DriverLicense(licenseData);
    await driverLicense.save();
    await User.updateOne(
      { _id: user._id },
      { driverLicense: driverLicense._doc._id }
    );
    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const addUpdateTruckInformation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateTruckInformation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let truckInformation = {
      userId: user._id,
      year: body.year,
      make: body.make,
      model: body.model,
      gvwr: body.gvwr,
      carrierType: body.carrierType,
      registrationDocument: body.registrationDocument,
      expiryDate: body.expiryDate,
      jambStickerImage: body.jambStickerImage,
    };
    let truckInfo = await TruckInformation.findOne({ userId: user._id });
    if (truckInfo) {
      await TruckInformation.updateOne({ userId: user._id }, truckInformation);
      return res.status(200).send({ message: messages.updated });
    }
    truckInfo = new TruckInformation(truckInformation);
    await truckInfo.save();
    await User.updateOne(
      { _id: user._id },
      { truckInformation: truckInfo._doc._id }
    );
    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const addUpdateTrailerInformation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateTrailerInformation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let trailerInformation = {
      userId: user._id,
      trailerType: body.trailerType,
      trailerLength: body.trailerLength,
      gvwr: body.gvwr,
      maxCapacity: body.maxCapacity,
      rearExcelPhoto: body.rearExcelPhoto,
      registrationDocument: body.registrationDocument,
      expirationDate: body.expirationDate,
    };
    let trailerInfo = await TrailerInformation.findOne({ userId: user._id });
    if (trailerInfo) {
      await TrailerInformation.updateOne(
        { userId: user._id },
        trailerInformation
      );
      return res.status(200).send({ message: messages.updated });
    }
    trailerInfo = new TrailerInformation(trailerInformation);
    await trailerInfo.save();
    await User.updateOne(
      { _id: user._id },
      { trailerInformation: trailerInfo._doc._id }
    );
    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const addUpdateDotInformation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateDotInformation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let dotInformation = {
      userId: user._id,
      usDotNumber: body.usDotNumber,
      mcNumber: body.mcNumber,
      usDotMcNumberTruckImage: body.usDotMcNumberTruckImage,
      truckDotInspectionImage: body.truckDotInspectionImage,
      truckInspectionDate: body.truckInspectionDate,
      registrationDocument: body.registrationDocument,
      expirationDate: body.expirationDate,
    };
    if (body.trailerInspectionDate) {
      dotInformation = {
        ...dotInformation,
        trailerInspectionDate: body.trailerInspectionDate,
      };
    }
    if (body.trailerDotInspectionImage) {
      dotInformation = {
        ...dotInformation,
        trailerDotInspectionImage: body.trailerDotInspectionImage,
      };
    }
    let dotInfo = await DotInformation.findOne({ userId: user._id });
    if (dotInfo) {
      await DotInformation.updateOne({ userId: user._id }, dotInformation);
      return res.status(200).send({ message: messages.updated });
    }
    dotInfo = new DotInformation(dotInformation);
    await dotInfo.save();
    await User.updateOne(
      { _id: user._id },
      { dotInformation: dotInfo._doc._id }
    );
    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const addUpdateInsuranceInformation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateInsuranceInformation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let insuranceInformation = {
      userId: user._id,
      policyExpirationDate: body.policyExpirationDate,
      insuranceDeclarationImage: body.insuranceDeclarationImage,
    };
    let insuranceInfo = await InsuranceInformation.findOne({
      userId: user._id,
    });
    if (insuranceInfo) {
      await InsuranceInformation.updateOne(
        { userId: user._id },
        insuranceInformation
      );
      return res.status(200).send({ message: messages.updated });
    }
    insuranceInfo = new InsuranceInformation(insuranceInformation);
    await insuranceInfo.save();
    await User.updateOne(
      { _id: user._id },
      { insuranceInformation: insuranceInfo._doc._id }
    );
    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const addUpdateBankInformation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateBankInformation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let bankInformation = {
      userId: user._id,
      routingNumber: body.routingNumber,
      accountNumber: body.accountNumber,
      w9Image: body.w9Image,
      eidDeviceName: body.eidDeviceName,
      eidCompanyName: body.eidCompanyName,
    };
    let bankInfo = await BankInformation.findOne({ userId: user._id });
    if (bankInfo) {
      await BankInformation.updateOne({ userId: user._id }, bankInformation);
      return res.status(200).send({ message: messages.updated });
    }
    bankInformation = new BankInformation(bankInformation);
    await bankInformation.save();
    await User.updateOne(
      { _id: user._id },
      { bankInformation: bankInformation._doc._id }
    );

    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const addUpdateMedicalCertificateInformation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateMedicalCertificateInformation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let medicalInformation = {
      userId: user._id,
      certificateExpiryDate: body.certificateExpiryDate,
      medicalCertificateImage: body.medicalCertificateImage,
    };
    let medicalInfo = await MedicalCertificateInformation.findOne({
      userId: user._id,
    });
    if (medicalInfo) {
      await MedicalCertificateInformation.updateOne(
        { userId: user._id },
        medicalInformation
      );
      return res.status(200).send({ message: messages.updated });
    }
    medicalInfo = new MedicalCertificateInformation(medicalInformation);
    await medicalInfo.save();
    await User.updateOne(
      { _id: user._id },
      { medicalCertificateInformation: medicalInfo._doc._id }
    );
    return res.status(200).send({ message: messages.added });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const getProfile = async (req, res) => {
  try {
    const { user } = req;
    const _user = await User.findById(user._id)
      .populate("driverLicense")
      .populate("truckInformation")
      .populate("trailerInformation")
      .populate("dotInformation")
      .populate("bankInformation")
      .populate("insuranceInformation")
      .populate("medicalCertificateInformation")
      .populate({
        path: "currentShippment",
        populate: {
          path: "quotation",
        },
      });
    return res.status(200).send({ message: messages.success, user: _user });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const getMyEarnings = async (req, res) => {
  try {
    const { user, query } = req;
    const { startDate, endDate } = query;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    let totalEarnings = 0;
    let filter = {
      assignedTo: user._id,
      status: shipmentStatus[3],
    };
    if (startDate && endDate) {
      filter = { ...filter, createdAt: { $gte: startDate, $lte: endDate } };
    }
    let shipments = await Shipments.find(filter)
      .sort({ createdAt: -1 })
      .populate("quotation");
    const riderAmountByMonth = [0, 0, 0, 0, 0];
    if (shipments?.length > 0) {
      shipments = JSON.parse(JSON.stringify(shipments));
      shipments?.forEach((shipment, index) => {
        const currentDate = new Date();
        shipments[index].riderAmount =
          shipment?.quotation?.amount - shipment?.quotation?.brokerCompensation;

        const createdAtDate = new Date(shipment.quotation.createdAt);
        const monthDiff =
          (currentDate.getFullYear() - createdAtDate.getFullYear()) * 12 +
          (currentDate.getMonth() - createdAtDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 5) {
          riderAmountByMonth[4 - monthDiff] +=
            shipment?.quotation?.amount -
            shipment?.quotation?.brokerCompensation;
        }
        totalEarnings =
          totalEarnings +
          (shipment?.quotation?.amount -
            shipment?.quotation?.brokerCompensation);
      });
    }
    return res.status(200).send({
      riderAmountByMonth,
      earnings: totalEarnings,
      lastShipments: shipments,
    });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const completeUserProfile = async (req, res) => {
  try {
    const { user, body } = req;
    console.log(req);
    if (user.role !== platFormRoles[0]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    await User.updateOne(
      { _id: body?.id },
      {
        $set: {
          profileCompleted: true,
        },
      }
    );
    const _user = await User.findById(body?.id);
    riderProfileVerify(body?.id, {});
    return res.status(200).send({ message: messages.updated, user: _user });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const updateProfile = async (req, res) => {
  try {
    let { user, body } = req;
    user = await User.findById(user._id);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          firstName: body?.firstName ? body?.firstName : user?.firstName,
          lastName: body?.lastName ? body?.lastName : user?.lastName,
          image: body?.image ? body?.image : user?.image,
          business: body?.business ? body?.business : user?.business,
          address: body?.address ? body?.address : user?.address,
          phoneNumber: body?.phoneNumber
            ? body?.phoneNumber
            : user?.phoneNumber,
        },
      }
    );
    const _user = await User.findById(user?._id);
    return res.status(200).send({ message: messages.updated, user: _user });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const updateRiderLocation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateRiderLocationUpdate(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          riderLocation: body.location,
        },
      }
    );
    return res.status(200).send({ message: messages.updated });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const getAllUsers = async (req, res) => {
  try {
    let { user, query } = req;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const status = query.status;
    const role = query.role;
    const search = query.search;
    const freeRiders = query.freeRiders;
    let filters = {};
    user = await User.findById(user._id);
    if (user?.role !== platFormRoles[0]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    if (status !== undefined) {
      filters = { ...filters, status };
    }
    if (role !== undefined) {
      filters = { ...filters, role };
    }
    if (freeRiders) {
      filters = { ...filters, role: platFormRoles[2], currentShippment: null };
    }
    if (search) {
      const searchRegex = new RegExp(`^${search}$`, "i");
      filters = {
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
        ],
      };
    }
    const options = {
      page,
      sort: { createdAt: -1 },
      populate: [{ path: "truckInformation" }],
      limit: pageSize,
    };
    const result = await User.paginate(filters, options);
    return res.status(200).send({
      message: messages.success,
      data: result,
    });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const getUserDetail = async (req, res) => {
  try {
    const { params, user } = req;

    if (user?.role !== platFormRoles[0]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return res.status(400).send({ message: messages.invalidId });
    }
    let details = await User.findById(params.id)
      .populate("truckInformation")
      .populate("driverLicense")
      .populate("currentShippment")
      .populate("trailerInformation")
      .populate("insuranceInformation")
      .populate("medicalCertificateInformation")
      .populate("bankInformation")
      .populate("dotInformation");
    return res.status(200).send({ message: messages.success, data: details });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const updateStatus = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[0]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateUpdateStatus(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let userExist = await User.findById(body.id);
    if (!userExist) {
      return res.status(400).send({ message: messages.notExist });
    }
    await User.updateOne(
      { _id: body.id },
      {
        $set: {
          status: body.status,
        },
      }
    );
    return res.status(200).send({ message: messages.updated });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};

const logout = async (req, res) => {
  try {
    const { user } = req;
    await Devices.deleteMany({ user: user?._id });
    return res.status(200).send({ message: messages.loggedOut });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
module.exports = {
  registerUser,
  authenticateUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
  sendSMS,
  addUpdateDriverLicense,
  addUpdateTruckInformation,
  addUpdateTrailerInformation,
  addUpdateDotInformation,
  addUpdateInsuranceInformation,
  addUpdateBankInformation,
  addUpdateMedicalCertificateInformation,
  getProfile,
  getMyEarnings,
  completeUserProfile,
  updateProfile,
  getAllUsers,
  getUserDetail,
  updateStatus,
  addFingerPrint,
  changePassword,
  updateRiderLocation,
  logout,
};
