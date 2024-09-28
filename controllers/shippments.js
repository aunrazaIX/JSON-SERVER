const { User } = require("../models/user");
const bcrypt = require("bcrypt");
const {
  sendEmail,
  generateRandomPassword,
  generateOTP,
  evaluateTime,
  sendSms,
  getUniqueTrackingId,
} = require("../utils");
const { QuotationRequests } = require("../models/quotationRequests");
const {
  quotationType,
  platFormRoles,
  messages,
  shipmentStatus,
  quotationVia,
  riderRequestedAs,
  paymentStatus,
  masterCode,
} = require("../config");
const { mongoose } = require("mongoose");
const {
  validateShippment,
  Shipments,
  validateAcceptShippment,
  validateUpdateShipment,
  validateReportDelay,
  validateRejectShipment,
  validateEvaluateTime,
  validateAddRiders,
  validateInterestType,
  validateAssignShipmentToRider,
  validateUpdateStatus,
  validateManualPayment,
} = require("../models/shippments");
const moment = require("moment/moment");
const { createService } = require("../utils/payment");
const stripe = require("../services/stripe");
const {
  newShipmentNotification,
  masterCodeIsUsed,
  notifyRiders,
  assignShipmentNotification,
  riderMarkedIntrestTypeNotification,
  pickupUserNotification,
  dropoffUserNotification,
  delayUserNotification,
} = require("../utils/notifications");
const createShippment = async (req, res) => {
  try {
    const { body } = req;
    if (!body.id) {
      return res.status(400).send({ message: messages.fieldRequired("Id") });
    }
    let quotation = await QuotationRequests.findById(body.id);
    if (quotation) {
      if (quotation.status !== "sent") {
        return res
          .status(400)
          .send({ message: messages.cannotCreateShippment });
      }
      const { error } = validateShippment({ ...body, ...quotation?._doc });
      if (error) {
        return res.status(400).send({ message: error?.details[0]?.message });
      }
      const { shipperInformation: ship, recieverInformation: rec } = body;
      let shipperInformation = {
        firstName: ship.firstName,
        lastName: ship.lastName,
        email: ship.email,
        mobile: ship.mobile,
        address: ship.address,
        city: ship.city,
        zip: ship.zip,
        state: ship.state,
      };
      if (ship.address1) {
        shipperInformation = {
          ...shipperInformation,
          address1: ship.address1,
        };
      }
      if (ship.businessName) {
        shipperInformation = {
          ...shipperInformation,
          businessName: ship.businessName,
        };
      }
      if (ship.cargoCollectedAt) {
        shipperInformation = {
          ...shipperInformation,
          cargoCollectedAt: ship.cargoCollectedAt,
        };
      }
      if (ship.vehiceCollectedAt) {
        shipperInformation = {
          ...shipperInformation,
          vehiceCollectedAt: ship.vehiceCollectedAt,
        };
      }
      let recieverInformation = {};
      let shipment = {
        amount: quotation?.amount,
        remainingAmount: quotation?.amount,
        adminAmount: quotation?.brokerCompensation,
        riderAmount:
          quotation?.amount > 0
            ? quotation?.brokerCompensation > 0
              ? quotation?.amount - quotation?.brokerCompensation
              : quotation?.amount
            : 0,
      };
      let commodityInformation = {};
      let equipmentsInformation = {};
      let loadInformation = {};
      let vehicleInformation = {};
      if (rec) {
        recieverInformation = {
          firstName: rec.firstName,
          lastName: rec.lastName,
          email: rec.email,
          mobile: rec.mobile,
          address: rec.address,
          city: rec.city,
          zip: rec.zip,
          state: rec.state,
        };
        if (rec.address1) {
          recieverInformation = {
            ...recieverInformation,
            address1: rec.address1,
          };
        }
        if (rec.businessName) {
          recieverInformation = {
            ...recieverInformation,
            businessName: rec.businessName,
          };
        }
        if (rec.vehiceCollectedAt) {
          recieverInformation = {
            ...recieverInformation,
            vehiceCollectedAt: rec.vehiceCollectedAt,
          };
        }
      }
      if (body.commodityInformation) {
        commodityInformation = {
          length: body.commodityInformation["length"],
          weight: body.commodityInformation.weight,
          description: body.commodityInformation.description,
          media: body.commodityInformation.media,
        };
      }
      if (body.equipmentsInformation) {
        equipmentsInformation = {
          toolsRequired: body.equipmentsInformation.toolsRequired
            ? body.equipmentsInformation?.toolsRequired
            : [],
        };
        if (body.equipmentsInformation.cargoLoadedBy) {
          equipmentsInformation = {
            ...equipmentsInformation,
            cargoLoadedBy: body.equipmentsInformation.cargoLoadedBy,
          };
        }
        if (body.equipmentsInformation.cargoUnloadedBy) {
          equipmentsInformation = {
            ...equipmentsInformation,
            cargoUnloadedBy: body.equipmentsInformation.cargoUnloadedBy,
          };
        }
      }
      if (body.loadInformation) {
        loadInformation = {
          longestDimenstion: body.loadInformation.longestDimenstion,
          media: body.loadInformation.media,
          cargoLoaded: body.loadInformation.cargoLoaded,
          toolsRequired: body?.loadInformation?.toolsRequired
            ? body.loadInformation.toolsRequired
            : [],
        };
      }
      if (body.vehicleInformation) {
        vehicleInformation = {
          media: body.vehicleInformation.media,
          vehicleOperable: body.vehicleInformation.vehicleOperable,
          vehicleDetails: body.vehicleInformation.vehicleDetails,
          vehicleLoadedBy: body.vehicleInformation.vehicleLoadedBy,
          toolsRequired: body?.vehicleInformation?.toolsRequired
            ? body.vehicleInformation.toolsRequired
            : [],
        };
      }
      if (body.pickupDate) {
        await QuotationRequests.updateOne(
          { _id: body.id },
          {
            $set: {
              pickupDate: body.pickupDate,
            },
          }
        );
      }

      let searchObject = {};
      if (quotation.quotationVia == quotationVia[0]) {
        searchObject.email = quotation.email;
      } else {
        searchObject.phoneNumber = quotation.phone;
      }
      let user = await User.findOne(searchObject);
      if (!user) {
        let randomPassword = generateRandomPassword();
        let password = await bcrypt.hash(randomPassword, 10);
        let userObject = {
          firstName: ship.firstName,
          lastName: ship.lastName,
          password,
          role: platFormRoles[1],
        };
        if (quotation.quotationVia == quotationVia[0]) {
          userObject = { ...userObject, email: quotation.email };
        } else {
          if (!quotation.phone.startsWith("+")) {
            quotation.phone = "+" + quotation.phone;
          }
          userObject = { ...userObject, phoneNumber: quotation.phone };
        }
        user = new User(userObject);
        await user.save();
        if (quotation.quotationVia == quotationVia[0]) {
          await sendEmail({
            emailTo: quotation.email,
            subject: "Hello Hotshot - client dashboard access",
            message: `Hello , ${user?.firstName} \n\nThank you for submitting your project request with Hello Hotshot. Information about your shipment is available via your client dashboard; \n\nplease see below for login information : \n\nuser id${quotation?.email} \n\nPassword:${randomPassword}`,
          });
        } else {
          await sendSms(
            `Hello , ${user?.firstName} \n\nThank you for submitting your project request with Hello Hotshot. Information about your shipment is available via your client dashboard; \n\nplease see below for login information : \n\nuser id${quotation?.email} \n\nPassword:${randomPassword}`,
            quotation.phone
          );
        }
      }
      if (
        quotation.type === quotationType[4] ||
        quotation.type === quotationType[1] ||
        quotation.type === quotationType[0]
      ) {
        let data = {
          user: user?._id,
          quotation: body.id,
          shipperInformation,
          ...shipment,
          recieverInformation,
          commodityInformation,
          equipmentsInformation,
        };
        shipment = new Shipments(data);
      }
      if (quotation.type === quotationType[3]) {
        let data = {
          user: user?._id,
          quotation: body.id,
          shipperInformation,
          recieverInformation,
          ...shipment,
          loadInformation,
        };
        shipment = new Shipments(data);
      }
      if (quotation.type === quotationType[2]) {
        let data = {
          user: user?._id,
          quotation: body.id,
          shipperInformation,
          recieverInformation,
          ...shipment,
          vehicleInformation,
        };
        shipment = new Shipments(data);
      }
      // shipment.id = getUniqueTrackingId();
      await shipment.save();
      // if (quotation.quotationVia == quotationVia[0]) {
      //   await sendEmail({
      //     emailTo: quotation?.email,
      //     subject: "Shipment Created Successfully!",
      //     message: `Your Shipment Tracking Id is ${shipment?.id} `,
      //   });
      // } else {
      //   await sendSms(
      //     `Your Shipment Tracking Id is ${shipment?.id}`,
      //     quotation?.phone
      //   );
      // }
      if (quotation.quotationVia == quotationVia[0]) {

        await sendEmail({
          emailTo: quotation.email,
          subject: "Hello Hotshot - project initiation",
          message: `Hello, ${user?.firstName}\n\n.Thank you for submitting your project request with Hello Hotshot. We are currently identifying and contacting carriers who can best service your request.\n\nOnce we have secured a carrier, we will reach out with an update.\n\nWe look forward to working with you. You can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282`,
        });
      }
      else {
        sendSms(`Hello, ${user?.firstName}\n\n.Thank you for submitting your project request with Hello Hotshot. We are currently identifying and contacting carriers who can best service your request.\n\nOnce we have secured a carrier, we will reach out with an update.\n\nWe look forward to working with you. You can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282`, quotation.phone)
      }
      newShipmentNotification(
        `Hello Hotshot received a long form submission for a ${quotation?.type} truck project. $${quotation?.amount}`
      );
      delete shipment._doc.quotation;
      return res.status(200).send({
        message: "Shipment created successfully",
        data: { shipment: quotation._doc, ...shipment._doc },
      });
    }
    return res.status(400).send({ message: messages.notExist });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const { params } = req;
    const shipment = await Shipments.findById(params.id).populate("quotation");
    if (!shipment) {
      return res.status(400).send({
        message: messages.notExist,
      });
    }
    if (shipment?.paymentStatus !== paymentStatus[0]) {
      return res.status(400).send({
        message: messages.cannotGenerateInvoice,
      });
    }
    let link = shipment?.paymentLink;
    if (!link) {
      link = await createService({
        id: shipment._id,
        amount: shipment?.quotation?.amount / 2,
        pickupAddress: shipment?.quotation?.pickupAddress,
        dropOffAdress: shipment?.quotation?.dropOffAddress,
      });
      await Shipments.updateOne(
        { _id: shipment?._id },
        {
          $set: {
            paymentLink: link,
          },
        }
      );
    }
    if (shipment?.quotation?.quotationVia == quotationVia[0]) {
      await sendEmail({
        emailTo: shipment?.quotation?.email,
        subject: "Invoice Generated!",
        message: `Your Invoice link for your shipment is ${link} `,
      });
    } else {
      await sendSms(
        `Your Invoice link for your shipment is:${link}`,
        shipment?.quotation?.phone
      );
    }
    return res.status(200).send({
      paymentLink: link,
    });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const readShippments = async (req, res) => {
  try {
    let { user, query } = req;
    let {
      status,
      search,
      rider,
      paymentStatus,
      shippmentCreatedBy,
      assignedTo,
      matched,
      applied,
    } = query || {};

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    let filters = {};
    user = await User.findById(user._id).populate("truckInformation");
    const showRejectedShipments = req.query.showRejectedShipments !== "false";
    if (assignedTo === "null") {
      assignedTo = null;
    }
    const options = {
      page,
      limit: pageSize,
      sort: { createdAt: -1 },
      populate: [
        { path: "quotation" },
        { path: "user" },
        { path: "assignedTo" },
        { path: "riders.rider" },
      ],
    };
    if (assignedTo !== undefined) {
      filters = { ...filters, assignedTo };
    }
    if (rider) {
      filters = {
        ...filters,
        status: "Un-Assigned",
        "riders.rider": { $in: [rider] },
      };
    }
    if (shippmentCreatedBy) {
      filters = {
        ...filters,
        user: shippmentCreatedBy === "null" ? null : shippmentCreatedBy,
      };
    }
    if (status) {
      filters = { ...filters, status };
    }
    if (paymentStatus) {
      filters = { ...filters, paymentStatus };
    }
    if (search) {
      const searchRegex = new RegExp(`.*${search}.*`, "i");
      filters = {
        ...filters,
        $or: [
          { "shipperInformation.firstName": searchRegex },
          { "shipperInformation.lastName": searchRegex },
          { "recieverInformation.firstName": searchRegex },
          { "recieverInformation.lastName": searchRegex },
        ],
      };
    }
    if (!showRejectedShipments && user?.role === platFormRoles[2]) {
      filters = {
        ...filters,
        $or: [
          { "rejectedBy.user": { $ne: user._id } },
          { rejectedBy: { $exists: false } },
        ],
      };
    }
    const result = await Shipments.paginate(filters, options);
    let _rider = await User.findById(rider).populate("truckInformation");
    if (matched === "true" && rider) {
      result.docs = result?.docs?.filter((item) => {
        let found = false;
        item?.riders?.forEach((_item) => {
          if (_item?.rider?._id == _rider?.id && _item?.status == null) {
            found = true;
          }
        });
        if (
          found &&
          item?.quotation?.type == _rider?.truckInformation?.carrierType
        ) {
          return item;
        }
      });
      result.totalDocs = result?.docs?.length;
    }
    if (matched === "false" && rider && applied == "false") {
      result.docs = result?.docs?.filter((item) => {
        let found = false;
        item?.riders?.forEach((_item) => {
          if (_item?.rider?._id == _rider?.id && _item?.status == null) {
            found = true;
          }
        });
        if (
          found &&
          item?.quotation?.type !== _rider?.truckInformation?.carrierType
        ) {
          return item;
        }
      });
      result.totalDocs = result?.docs?.length;
    }
    if (matched == "false" && rider && applied == "true") {
      result.docs = result?.docs?.filter((item) => {
        let found = false;
        item?.riders?.forEach((_item) => {
          if (
            _item?.rider?._id == _rider?.id &&
            _item?.status == riderRequestedAs[0]
          ) {
            found = true;
          }
        });
        if (found) {
          return item;
        }
      });
      result.totalDocs = result?.docs?.length;
    }
    return res.status(200).send({
      message: messages.success,
      data: result,
    });
  } catch (e) {
    console.log("Error", e);
    return res.status(500).send({ error: e?.message, message: e?.message });
  }
};
const getShipmentById = async (req, res) => {
  try {
    const { params, query } = req;
    const { intrested } = query;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return res.status(400).send({ message: messages.invalidId });
    }
    let shipment = await Shipments.findById(params.id)
      .populate("quotation")
      .populate("user")
      .populate("assignedTo")
      .populate("riders.rider");
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (intrested == "true") {
      shipment = JSON.parse(JSON.stringify(shipment));
      shipment.riders = shipment?.riders?.filter(
        (rider) => rider?.status == riderRequestedAs[0]
      );
    }
    return res.status(200).send({ message: messages.success, data: shipment });
  } catch (e) {
    console.log("Error", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const acceptShippment = async (req, res) => {
  try {
    let { body, user } = req;
    user = await User.findById(user._id);
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateAcceptShippment(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    if (!body.id) {
      return res.status(400).send({ message: messages.fieldRequired("Id") });
    }
    if (!mongoose.Types.ObjectId.isValid(body.id)) {
      return res.status(400).send({ message: messages.invalidId });
    }
    if (user?.currentShippment) {
      return res
        .status(400)
        .send({ message: messages.shippmentAlreadyOnGoing });
    }
    const shipment = await Shipments.findById(body.id).populate("quotation");
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (shipment.assignedTo) {
      return res
        .status(400)
        .send({ message: messages.shippmentAlreadyAssigned });
    }
    let formatedDropOffTime = null;
    if (shipment.quotation.type !== quotationType[3]) {
      const dropOffTime = await evaluateTime(
        `${shipment?.quotation?.pickupCoordinates[1]},${shipment?.quotation?.pickupCoordinates[0]}`,
        `${shipment?.quotation?.dropOffCoordinates[1]},${shipment?.quotation?.dropOffCoordinates[0]}`
      );
      if (dropOffTime > 0) {
        if (shipment.quotation.cargoReadyForPickup) {
          const currentDateTime = moment();
          const newDateTime = currentDateTime.add(dropOffTime, "minutes");
          formatedDropOffTime = newDateTime.format("YYYY-MM-DD hh:mm a");
        } else {
          const currentDateTime = moment(shipment.quotation.pickupDate);
          const newDateTime = currentDateTime.add(dropOffTime, "minutes");
          formatedDropOffTime = newDateTime.format("YYYY-MM-DD hh:mm a");
        }
      } else {
        return res
          .status(400)
          .send({ message: messages.problemEvaluatingTime });
      }
    }
    const verificationOTP = generateOTP();
    await Shipments.updateOne(
      { _id: body.id },
      {
        $set: {
          assignedTo: user._id,
          pickupTime: body.time,
          status: shipmentStatus[1],
          projectEta: formatedDropOffTime,
          verificationOTP,
        },
      }
    );
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          currentShippment: body.id,
        },
      }
    );

    await sendEmail({
      emailTo: shipment?.shipperInformation?.email,
      subject: "Verification Code",
      message: `Please provide this verification code to the driver when he reaches your pickup location ${verificationOTP}`,
    });

    return res.status(200).send({ message: messages.shippmedAssigned });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const reachedPickupLocation = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateUpdateShipment(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let shipment = await Shipments.findById(body.shipmentId);
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (!shipment.verificationOTP || shipment.status !== shipmentStatus[1]) {
      return res.status(400).send({ message: messages.cannotVerify });
    }
    if (shipment.verificationOTP === body.code || body.code === masterCode) {
      if (body.code === masterCode) {
        masterCodeIsUsed(
          `Master Code is used by ${user?.firstName + " " + user?.lastName
          } against shipment id ${body.shipmentId
          } for reaching the pickup location`,
          body.shipmentId
        );
      }
      const verificationOTP = generateOTP();
      let updateObj = {
        status: shipmentStatus[2],
        verificationOTP,
      };
      if (body.code === masterCode) {
        updateObj = { ...updateObj, masterCodeUsedArrivalReason: body.reason };
      }
      await Shipments.updateOne(
        { _id: body.shipmentId },
        {
          $set: updateObj,
        }
      );
      await sendEmail({
        emailTo: shipment?.recieverInformation?.email,
        subject: "Hello Hotshot - project deployed",
        message: `A delivery from ${shipment?.recieverInformation?.firstName},${shipment?.recieverInformation?.lastName}\n\nis en route to you. Please find more information about this project Once your carrier has unloaded your cargo, please provide them with \n\nthe following code : ${verificationOTP} \n\nYou can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282.`,
      });
      pickupUserNotification(shipment?.user._id, shipment?._id);
      return res.status(200).send({ message: messages.pickupVerified });
    }
    return res.status(400).send({ message: messages.invalidCode });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const completeShipment = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateUpdateShipment(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let shipment = await Shipments.findById(body.shipmentId).populate('quotation').populate('user')

    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (!shipment.verificationOTP) {
      return res.status(400).send({ message: messages.cannotVerify });
    }
    if (shipment.verificationOTP === body.code || body.code === masterCode) {
      let filter = {
        status: shipmentStatus[3],
      };
      if (body.code === masterCode) {
        filter = { ...filter, masterCodeUsedCompletedReason: body.reason };
        masterCodeIsUsed(
          `Master Code is used against shipment id ${body.shipmentId} for completing shipment`,
          body.shipmentId
        );
      }
      await Shipments.updateOne(
        { _id: body.shipmentId },
        {
          $set: filter,
        }
      );
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            currentShippment: null,
          },
        }
      );
      console.log(shipment?.user);
      if (shipment?.user?.email) {

        await sendEmail({
          emailTo: shipment?.user?.email,
          subject: "Hello Hotshot - project deployed",
          // message: `Your Hello Hotshot project is complete. At any time, you can access
          // your project information via your client dashboard. \n\nTo close this project, please make your final payment here. \n\nYou can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282.`,
          html: `<p>Your Hello Hotshot project is complete. \n\nAt any time, you can access
        your project information via your client dashboard. \n\nTo close this project, please make your final payment.\n\nYou can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282.</p>`
        });
      }
      else {
        sendSms(`Your Hello Hotshot project is complete. \n\nAt any time, you can access
        your project information via your client dashboard. \n\nTo close this project, please make your final payment.\n\nYou can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282.`, shipment?.user?.phoneNumber)
      }
      dropoffUserNotification(shipment?.user?._id, body.shipmentId);
      return res.status(200).send({ message: messages.success });
    }
    return res.status(400).send({ message: messages.invalidCode });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const rejectShipment = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateRejectShipment(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let shipment = await Shipments.findById(body.shipmentId);
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (shipment.status !== shipmentStatus[0]) {
      return res.status(400).send({ message: messages.cannotRejectShipment });
    }
    shipment.rejectedBy.push({ user: user._id, reason: body.reason });
    await shipment.save();
    return res.status(200).json({ message: messages.shipmentRejected });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const reportDelay = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateReportDelay(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const shipment = await Shipments.findById(body.shipmentId);
    if (shipment.status == shipmentStatus[2]) {
      await Shipments.updateOne(
        { _id: body.shipmentId },
        {
          $set: {
            status: shipmentStatus[4],
            delayed: {
              issue: body.issue,
              timeRequiredToResolve: body.timeRequiredToResolve,
            },
          },
        }
      );
      delayUserNotification(shipment?.user?._id, {
        id: body.shipmentId,
        issue: body.issue,
        time: body.timeRequiredToResolve,
      });
      return res.status(200).send({ message: messages.delayReported });
    }
    return res.status(400).send({ message: messages.delayCannotBeReported });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const getMyCurrentShipment = async (req, res) => {
  try {
    let { user } = req;
    if (user.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    user = await User.findById(user._id)
      .populate({
        path: "currentShippment",
        populate: {
          path: "quotation",
        },
      })
      .populate({
        path: "currentShippment",
        populate: {
          path: "user",
        },
      });
    if (!user.currentShippment) {
      return res.status(400).send({ message: messages.noActiveShipment });
    }
    return res.status(200).send({ currentLoad: user.currentShippment });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};
const calculateTime = async (req, res) => {
  try {
    const { query, user } = req;
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateEvaluateTime(query);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let shipment = await Shipments.findById(query.shipmentId).populate(
      "quotation"
    );
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    let formatedPickupTime;
    const pickupTime = await evaluateTime(
      `${shipment?.quotation?.pickupCoordinates[1]},${shipment?.quotation?.pickupCoordinates[0]}`,
      `${query.latitude},${query.longitude}`
    );

    if (pickupTime > 0) {
      if (shipment.quotation.cargoReadyForPickup) {
        const currentTime = moment();
        const minutesToAdd = parseFloat(pickupTime);
        const newTime = currentTime.add(minutesToAdd, "minutes");
        const formattedTime = newTime.format("YYYY-MM-DD hh:mm a");
        formatedPickupTime = formattedTime;
      } else {
        const currentTime = moment(shipment.quotation.pickupDate);
        const minutesToAdd = parseFloat(pickupTime);
        const newTime = currentTime.add(minutesToAdd, "minutes");
        const formattedTime = newTime.format("YYYY-MM-DD hh:mm a");
        formatedPickupTime = formattedTime;
      }
      return res.status(200).send({ pickupTime: formatedPickupTime });
    }
    return res.status(400).send({ message: messages.problemEvaluatingTime });
  } catch (e) {
    console.log("Error", e);
    return res.status(500).send({ message: e?.message });
  }
};
const generatePDF = async (req, res) => {
  try {
    let { user, query } = req;
    if (!query?.email) {
      return res.status(400).send({ message: messages.fieldRequired("email") });
    }
    let keyNotAllowed;
    for (let keys in query) {
      if (
        ![
          "driverLicense",
          "truckInformation",
          "trailerInformation",
          "currentShippment",
          "insuranceInformation",
          "medicalCertificateInformation",
          "email",
        ].includes(keys)
      ) {
        keyNotAllowed = keys;
      }
    }
    if (keyNotAllowed) {
      return res
        .status(400)
        .send({ message: messages.keyNotAllowed(keyNotAllowed) });
    }
    user = await User.findById(user._id)
      .populate("driverLicense")
      .populate("truckInformation")
      .populate("trailerInformation")
      .populate({
        path: "currentShippment",
        populate: { path: "quotation" },
      })
      .populate("insuranceInformation")
      .populate("medicalCertificateInformation");
    console.log(user, 'USER');
    let attachments = [];
    await Promise.allSettled(
      Object.keys(query)
        ?.filter((v) => v !== "email" && v !== "currentShippment")
        ?.map(async (v) => {
          if (v === "driverLicense") {
            if (user?.driverLicense) {
              attachments.push({
                filename: `${v}Front.png`,
                path: user?.driverLicense?.frontPhoto,
                cid: `${v}@cid`,
              });
              attachments.push({
                filename: `${v}Back.png`,
                path: user?.driverLicense?.backPhoto,
                cid: `${v}@cid`,
              });
            }
          }
          if (v === "trailerInformation") {
            if (user?.trailerInformation) {
              attachments.push({
                filename: `TrailorRegistration.png`,
                path: user?.trailerInformation?.registrationDocument,
                cid: `${v}@cid`,
              });
              attachments.push({
                filename: `RearExcelPhoto.png`,
                path: user?.trailerInformation?.rearExcelPhoto,
                cid: `${v}@cid`,
              });
            }
          }
          if (v === "truckInformation") {
            if (user?.truckInformation) {
              attachments.push({
                filename: "TruckRegistrationDocument.png",
                path: user?.truckInformation?.registrationDocument,
                cid: `${v}@cid`,
              });
              attachments.push({
                filename: "TruckRearExcelPhoto.png",
                path: user?.truckInformation?.rearExcelPhoto,
                cid: `${v}@cid`,
              });
            }
          }
          if (v === "insuranceInformation") {
            if (user?.insuranceInformation) {
              attachments.push({
                filename: `${v}.png`,
                path: user?.insuranceInformation?.insuranceDeclarationImage,
                cid: `${v}@cid`,
              });
            }
          }
          if (v === "medicalCertificateInformation") {
            if (user?.medicalCertificateInformation) {
              attachments.push({
                filename: `${v}.png`,
                path: user?.medicalCertificateInformation
                  ?.medicalCertificateImage,
                cid: `${v}@cid`,
              });
            }
          }
        })
    );

    await sendEmail(
      {
        attachments: attachments,
        emailTo: query?.email,
        subject: "Documents",
        message: "Plesee find attached your requested documents",
      },
      query?.currentShippment && user?.currentShippment ? "summary.hbs" : null,
      query?.currentShippment && user?.currentShippment
        ? {
          riderAmount: user?.currentShippment?.riderAmount
            ? user?.currentShippment?.riderAmount?.toFixed(2)
            : 0,
          firstName: user?.currentShippment?.shipperInformation?.firstName
            ? user?.currentShippment?.shipperInformation?.firstName
            : "First Name",
          lastName: user?.currentShippment?.shipperInformation?.lastName
            ? user?.currentShippment?.shipperInformation?.lastName
            : "Last Name",
          mobile: user?.currentShippment?.shipperInformation?.mobile
            ? user?.currentShippment?.shipperInformation?.mobile
            : "Mobile",
          email: user?.currentShippment?.shipperInformation?.email
            ? user?.currentShippment?.shipperInformation?.email
            : "Email",
          pickupAddress: user?.currentShippment?.shipperInformation?.address
            ? user?.currentShippment?.shipperInformation?.address
            : "Address",
          pickupAddress1: user?.currentShippment?.shipperInformation?.address1
            ? user?.currentShippment?.shipperInformation?.address1
            : " Address (2)",
          pickupCity: user?.currentShippment?.shipperInformation?.city
            ? user?.currentShippment?.shipperInformation?.city
            : "City",
          pickupState: user?.currentShippment?.shipperInformation?.state
            ? user?.currentShippment?.shipperInformation?.state
            : "State",
          pickupZip: user?.currentShippment?.shipperInformation?.zip
            ? user?.currentShippment?.shipperInformation?.zip
            : "Zip",
          pickupBusinessName: user?.currentShippment?.shipperInformation
            ?.businessName
            ? user?.currentShippment?.shipperInformation?.businessName
            : "Business",
          RefirstName: user?.currentShippment?.recieverInformation?.firstName
            ? user?.currentShippment?.recieverInformation?.firstName
            : "First Name",
          RelastName: user?.currentShippment?.recieverInformation?.lastName
            ? user?.currentShippment?.recieverInformation?.lastName
            : "Last Name",
          Remobile: user?.currentShippment?.recieverInformation?.mobile
            ? user?.currentShippment?.recieverInformation?.mobile
            : "Mobile",
          Remail: user?.currentShippment?.recieverInformation?.email
            ? user?.currentShippment?.recieverInformation?.email
            : "Email",
          ReAddress: user?.currentShippment?.recieverInformation?.address
            ? user?.currentShippment?.recieverInformation?.address
            : "Address",
          ReAddress1: user?.currentShippment?.recieverInformation?.address1
            ? user?.currentShippment?.recieverInformation?.address1
            : " Address (2)",
          ReCity: user?.currentShippment?.recieverInformation?.city
            ? user?.currentShippment?.recieverInformation?.city
            : "City",
          ReState: user?.currentShippment?.recieverInformation?.state
            ? user?.currentShippment?.recieverInformation?.state
            : "State",
          ReZip: user?.currentShippment?.recieverInformation?.zip
            ? user?.currentShippment?.recieverInformation?.zip
            : "Zip",
          ReBusinessName: user?.currentShippment?.recieverInformation
            ?.businessName
            ? user?.currentShippment?.recieverInformation?.businessName
            : "Business",
          cargoLoadedBy: user?.currentShippment?.quotation?.cargoLoadedBy
            ? user?.currentShippment?.quotation?.cargoLoadedBy
            : "Cargo Loaded By",
          cargoUnloadBy: user?.currentShippment?.quotation?.cargoUnloadBy
            ? user?.currentShippment?.quotation?.cargoUnloadBy
            : "Cargo Unload By",

          length: user?.currentShippment?.commodityInformation && user?.currentShippment?.commodityInformation["length"]
            ? user?.currentShippment?.commodityInformation["length"]
            : "Length",
          weight: user?.currentShippment?.commodityInformation && user?.currentShippment?.commodityInformation["weight"]
            ? user?.currentShippment?.commodityInformation["weight"]
            : "Weight",
          cargoDescription: user?.currentShippment?.commodityInformation && user?.currentShippment?.commodityInformation
            ?.description
            ? user?.currentShippment?.commodityInformation?.description
            : "Description",

          media:
            user?.currentShippment?.quotation?.type === "motorVehicles"
              ? user?.currentShippment?.vehicleInformation?.media?.map(
                (item) => ({ src: item })
              )
              : user?.currentShippment?.quotation?.type ===
                quotationType[1] ||
                user?.currentShippment?.quotation?.type === quotationType[4]
                ? user?.currentShippment?.commodityInformation?.media?.map(
                  (item) => ({ src: item })
                )
                : user?.currentShippment?.equipmentsInformation?.media?.map(
                  (item) => ({ src: item })
                ),
          toolsRequired:
            user?.currentShippment?.quotation?.type == "motorVehicles"
              ? user?.currentShippment?.vehicleInformation?.toolsRequired
              : user?.currentShippment?.equipmentsInformation?.toolsRequired,

          pickupDate: user?.currentShippment?.quotation?.pickupDate
            ? moment(user?.currentShippment?.quotation?.pickupDate).format(
              "ddd MMM DD "
            )
            : "ASAP",
          quotationType: user?.currentShippment?.quotation?.type,
          vehicleLoadBy: user?.currentShippment?.vehicleInformation?.vehicleLoadedBy ?? '',
          model: user?.currentShippment?.vehicleInformation?.vehicleDetails?.model,
          make: user?.currentShippment?.vehicleInformation?.vehicleDetails?.make,
          year: user?.currentShippment?.vehicleInformation?.vehicleDetails?.year,
        }
        : null,
      query?.currentShippment && user?.currentShippment ? true : false
    );
    return res.status(200).send({ message: messages.success });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const updateShipmentStatus = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role == platFormRoles[1]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateUpdateStatus(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let shipment = await Shipments.findById(body.id);
    let unassign = false;
    if (shipment) {
      if (
        body.status !== shipmentStatus[0] &&
        body.status !== shipmentStatus[4] &&
        shipment.assignedTo
      ) {
        await User.updateOne(
          { _id: shipment.assignedTo },
          { currentShippment: null }
        );
        unassign = true;
      }
      let updateObject = {
        status: body.status,
      };
      if (unassign) {
        updateObject = {
          ...updateObject,
          assignedTo: null,
        };
      }
      await Shipments.updateOne({ _id: body.id }, { $set: updateObject });
      return res.status(200).send({ message: messages.updated });
    }
    return res.status(400).send({ message: messages.notExist });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const paymentWebHook = async (req, res) => {
  try {
    const rawData = req.body.toString("utf-8");
    const event = JSON.parse(rawData);
    if (event.type === "payment_intent.succeeded") {
      const sessionObject = await stripe.checkout.sessions.list({
        limit: 1,
        payment_intent: event.data.object.id,
      });
      let shipmentId = sessionObject?.data[0]?.metadata?.id;
      let shipment = await Shipments.findById(shipmentId).populate("user");
      await Shipments.findOneAndUpdate(
        { _id: shipmentId },
        {
          $set: {
            remainingAmount: shipment?.amount - shipment?.amount / 2,
            paymentStatus: paymentStatus[2],
          },
        }
      );
      await sendEmail({
        emailTo: shipment?.user?.email,
        subject: "Tracking Id",
        message: `Hello, ${shipment?.user?.firstName} \n\nYour Hello Hotshot project is underway. Please see below for details for your carrier : \n\n
        carrier first name / last name:${shipment?.user?.firstName}/${shipment?.user?.lastName} \n\n
        pick-up date / time:${shipment?.quotation?.pickupDate}\n\n
        You can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282.. `,
      });
      return res.status(200).send({ message: messages.updated });
    }
    return res
      .status(200)
      .send({ message: messages.success, type: event.type });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const getShipmentByTrackingId = async (req, res) => {
  try {
    const { params } = req;
    if (!params.id) {
      return res.status(400).send({ message: messages.fieldRequired("id") });
    }
    const shipment = await Shipments.findOne({ id: params.id })
      .populate("quotation")
      .populate("user")
      .populate("assignedTo");
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    return res.status(200).send({ message: messages.success, data: shipment });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const addUpdateRidersOnShipment = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[0]) {
      return res.status(401).send({ message: messages.notAllowed });
    }
    const { error } = validateAddRiders(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const riders = body.riders;
    const checkDuiplicate = riders?.some(
      (rider, index, array) => array.indexOf(rider) !== index
    );
    if (checkDuiplicate) {
      return res
        .status(400)
        .send({ message: messages.duplicatesNotAllowed("riders") });
    }
    await Promise.all(
      riders?.map(async (rider) => {
        const _rider = await User.findById(rider);
        if (!rider || _rider?.role !== platFormRoles[2]) {
          throw new Error(messages.notRider(rider));
        }
      })
    );
    const shipment = await Shipments.findById(body.shipment).populate('quotation').populate('user')
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (shipment.status !== shipmentStatus[0]) {
      return res.status(400).send({ message: messages.cannotAddRiders });
    }
    const updatedShipment = await Shipments.findOneAndUpdate(
      { _id: body.shipment },
      {
        $set: {
          riders: riders?.map((rider) => ({
            rider,
            status: null,
            reason: null,
          })),
        },
      },
      { new: true }
    );
    notifyRiders(riders, shipment);
    if (shipment.quotation.quotationVia == quotationVia[1]) {
      sendSms(
        `Hello,${shipment?.user?.firstName}.\n\nThank you for submitting your project request with Hello Hotshot. We \n\nare currently identifying and contacting carriers who can best service \n\nyour request. Once we have secured a carrier, we will reach out with an update.\n\nWe look forward to working with you. \n\nYou can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282. `,
        shipment?.quotation?.phone
      )
    }
    else {
      sendEmail({
        emailTo: shipment?.quotation?.email,
        subject: "Hello Hotshot - Project Initiation",
        message: `Hello,${shipment?.user?.firstName}.\n\nThank you for submitting your project request with Hello Hotshot. We \n\nare currently identifying and contacting carriers who can best service \n\nyour request. Once we have secured a carrier, we will reach out with an update.\n\nWe look forward to working with you. \n\nYou can you reach us at active.projects@hellohotshot.co or via text at 972.922.2282. `,
      });
    }

    return res
      .status(200)
      .send({ data: updatedShipment, message: messages.success });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const markInterestType = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateInterestType(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const shipment = await Shipments.findById(body.shipment).populate(
      "quotation"
    );
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    let index = undefined;
    if (shipment?.riders?.length > 0) {
      shipment?.riders?.forEach((rider, _index) => {
        if (rider?.rider?.toString() == user?._id) {
          index = _index;
        }
      });
      if (index !== undefined) {
        const updatedRiders = [...shipment.riders];
        updatedRiders[index].status = body.type;
        if (body.reason && body.type !== riderRequestedAs[0]) {
          updatedRiders[index].reason = body.reason;
        }
        if (body.time && body.date !== riderRequestedAs[1]) {
          updatedRiders[index].date = body.date;
          updatedRiders[index].time = body.time;
        }
        const updatedShipment = await Shipments.findOneAndUpdate(
          { _id: body.shipment },
          { $set: { riders: updatedRiders } },
          { new: true }
        );
        riderMarkedIntrestTypeNotification(
          { type: body.type, shipmentId: body.shipment },
          body.shipment
        );

        return res
          .status(200)
          .send({ data: updatedShipment, message: messages.success });
      }
      return res.status(400).send({ message: messages.noRidersFound });
    }
    return res.status(400).send({ message: messages.noRidersFound });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};
const assignShipmentToRider = async (req, res) => {
  try {
    const { user, body } = req;
    if (user?.role !== platFormRoles[0]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const { error } = validateAssignShipmentToRider(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    const _user = await User.findById(body.rider);
    if (!user) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (_user?.role !== platFormRoles[2]) {
      return res.status(400).send({ message: messages.notARider });
    }
    if (_user?.currentShippment) {
      return res
        .status(400)
        .send({ message: messages.shippmentAlreadyOnGoing });
    }
    const shipment = await Shipments.findById(body.shipment)
      .populate("quotation")
      .populate("user");

    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (shipment.status == shipmentStatus[1]) {
      return res
        .status(400)
        .send({ message: messages.shippmentAlreadyAssigned });
    }
    if (shipment?.riders?.length > 0) {
      let riders = shipment?.riders?.map((rider) => rider?.rider?.toString());
      if (!riders?.includes(body?.rider)) {
        return res.status(400).send({ message: messages.cannotAssign });
      }
      const index = riders?.indexOf(body.rider);
      if (index !== -1) {
        if (shipment.riders[index].status == riderRequestedAs[1]) {
          return res.status(400).send({ message: messages.notIntrested });
        }
        if (shipment.riders[index].status == null) {
          return res.status(400).send({ message: messages.notYetMarked });
        }
      }
      let formatedDropOffTime = null;
      if (shipment.quotation.type !== quotationType[3]) {
        const dropOffTime = await evaluateTime(
          `${shipment?.quotation?.pickupCoordinates[1]},${shipment?.quotation?.pickupCoordinates[0]}`,
          `${shipment?.quotation?.dropOffCoordinates[1]},${shipment?.quotation?.dropOffCoordinates[0]}`
        );
        if (dropOffTime > 0) {
          if (shipment.quotation.cargoReadyForPickup) {
            const currentDateTime = moment();
            const newDateTime = currentDateTime.add(dropOffTime, "minutes");
            formatedDropOffTime = newDateTime.format("YYYY-MM-DD hh:mm a");
          } else {
            const currentDateTime = moment(shipment.quotation.pickupDate);
            const newDateTime = currentDateTime.add(dropOffTime, "minutes");
            formatedDropOffTime = newDateTime.format("YYYY-MM-DD hh:mm a");
          }
        } else {
          return res
            .status(400)
            .send({ message: messages.problemEvaluatingTime });
        }
      }
      const verificationOTP = generateOTP();
      let trackingId = getUniqueTrackingId();
      const updatedShipment = await Shipments.findOneAndUpdate(
        { _id: body.shipment },
        {
          $set: {
            status: shipmentStatus[1],
            assignedTo: body.rider,
            projectEta: formatedDropOffTime,
            id: trackingId,
            verificationOTP,
          },
        },
        { new: true }
      );
      await QuotationRequests.updateOne(
        { _id: shipment?.quotation },
        {
          $set: {
            pickupDate: shipment?.riders[index]?.date,
          },
        }
      );
      if (shipment?.quotation?.quotationVia == quotationVia[0]) {

        await sendEmail({
          emailTo: shipment?.quotation?.email,
          subject: "Hello Hotshot - carrier match",
          html: `<p>Hello, ${shipment?.user?.firstName}\n\n.Good news. Hello Hotshot has identified a carrier that is eager to work on your project. To proceed, please confirm the project details and process the initial payment <a href=${shipment?.paymentLink}>here</a>.\n\nAt any time, you can access your project information via your client dashboard.\n\nWe look forward to working with you. You can you reach us at active.project@hellohotshot.co or via text at 972.922.2282.</p>`,
        });
      } else {
        await sendSms(
          `Hello, ${shipment?.user?.firstName}\n\n.Good news. Hello Hotshot has identified a carrier that is eager to work on your project. To proceed, please confirm the project details and process the initial payment here ${shipment?.paymentLink}\n\nAt any time, you can access your project information via your client dashboard.\n\nWe look forward to working with you. You can you reach us at active.project@hellohotshot.co or via text at 972.922.2282.`,
          shipment?.quotation?.phone
        );
      }
      await User.updateOne(
        { _id: body.rider },
        { $set: { currentShippment: body.shipment } }
      );


      await sendEmail({
        emailTo: shipment?.shipperInformation?.email,
        subject: "Hello Hotshot - project deployed",
        message: `Hello ${shipment?.shipperInformation}.\n\n Your Hello Hotshot project is underway. Please see below for details for your carrier:\n\n ${shipment?.assignedTo?.firstName} ${shipment?.assignedTo?.lastName}\n\nOnce your carrier has your cargo securely loaded, please provide them with the following code:\n${verificationOTP}\n\n You can reach us at active.project@hellohotshot.co or via text at 972.922.2282.`,
      });
      assignShipmentNotification(body.rider, shipment?._id);
      return res
        .status(200)
        .send({ data: updatedShipment, message: messages.success });
    }
    return res.status(400).send({ message: messages.cannotAssign });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};

const manualPaymentForRemainingAmount = async (req, res) => {
  try {
    const { body } = req;
    const { error } = validateManualPayment(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let shipment = await Shipments.findById(body.shipmentId);
    if (!shipment) {
      return res.status(400).send({ message: messages.notExist });
    }
    if (shipment?.paymentStatus == paymentStatus[1]) {
      return res.status(400).send({ message: messages.alreadyPaid });
    }
    if (shipment?.paymentStatus !== paymentStatus[2]) {
      return res.status(400).send({ message: messages.payOnlineFirst });
    }
    if (body.amount > shipment?.remainingAmount) {
      return res.status(400).send({ message: messages.overDueAmount });
    }
    let updateObject = {
      remainingAmount: shipment?.remainingAmount - body.amount,
      paymentStatus:
        shipment.remainingAmount == body.amount
          ? paymentStatus[1]
          : paymentStatus[2],
    };
    await Shipments.updateOne({ _id: shipment?._id }, { $set: updateObject });
    return res.status(200).send({ message: messages.updated });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};

const stats = async (req, res) => {
  try {
    const { user } = req;
    if (user?.role !== platFormRoles[1]) {
      return res.status(400).send({ message: messages.notAllowed });
    }
    const ongoingShipment = await Shipments.countDocuments({
      user: user?._id,
      status: { $in: [shipmentStatus[1], shipmentStatus[2]] },
    });
    const deliveredShipments = await Shipments.countDocuments({
      user: user?._id,
      status: shipmentStatus[3],
    });
    return res.status(200).send({
      data: {
        ongoingShipment,
        deliveredShipments,
      },
      message: messages.success,
    });
  } catch (e) {
    return res.status(500).send({ message: e?.message });
  }
};

module.exports = {
  readShippments,
  createShippment,
  generateInvoice,
  acceptShippment,
  getShipmentById,
  getMyCurrentShipment,
  reachedPickupLocation,
  completeShipment,
  reportDelay,
  calculateTime,
  rejectShipment,
  generatePDF,
  updateShipmentStatus,
  paymentWebHook,
  getShipmentByTrackingId,
  addUpdateRidersOnShipment,
  markInterestType,
  assignShipmentToRider,
  stats,
  manualPaymentForRemainingAmount,
};
