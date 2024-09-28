const { sendEmail, getLatLong, sendSms, getCityAndState } = require("../utils");
const {
  validateQuotation,
  QuotationRequests,
  validateSendQuotaion,
} = require("../models/quotationRequests");
const {
  quotationType,
  quotationVia,
  platFormRoles,
  messages,
  requestStatus,
  apiKey,
  cargoLoadedBy,
  cargoUnloadBy,
  estimatedWeightFor26,
  estimatedWeightUnder2k,
  estimatedWeightUnderGeneralFreight,
} = require("../config");
const { mongoose } = require("mongoose");
const fetch = require("node-fetch");
const { shortFormReview } = require("../utils/notifications");
const moment = require("moment/moment");

const createQuotation = async (req, res) => {
  try {
    const { body } = req;
    const { error } = validateQuotation(body);
    if (error) {
      return res.status(400).send({ message: error?.details[0]?.message });
    }
    let quotationObject = {
      pickupZip: body.pickupZip,
      dropOffZip: body.dropOffZip,
      media: body.media,
      type: body.type,
      cargoReadyForPickup: body.cargoReadyForPickup,
      quotationVia: body.quotationVia,
      redirectUri: body.redirectUri,
      amount: 0,
    };

    const pickupLocation = await getLatLong(body.pickupZip);
    const dropofLocation = await getLatLong(body.dropOffZip);
    const pickupInfo = await getCityAndState(pickupLocation?.location);
    const dropOffInfo = await getCityAndState(dropofLocation?.location);
    if (pickupInfo) {
      quotationObject = {
        ...quotationObject,
        pickupCity: pickupInfo?.city ? pickupInfo?.city : "",
        pickupState: pickupInfo?.state ? pickupInfo?.state : "",
      };
    }
    if (dropOffInfo) {
      quotationObject = {
        ...quotationObject,
        dropOffCity: dropOffInfo?.city ? dropOffInfo?.city : "",
        dropOffState: dropOffInfo?.state ? dropOffInfo?.state : "",
      };
    }
    const unFormatedRes = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${pickupLocation?.location[1]},${pickupLocation?.location[0]}&destinations=${dropofLocation?.location[1]},${dropofLocation?.location[0]}&key=${apiKey}`
    );
    const jsonRes = await unFormatedRes.json();
    if (jsonRes?.status === "OK" && jsonRes?.rows?.length > 0) {
      const distanceText = jsonRes?.rows[0]?.elements[0]?.distance?.text;
      const mileage = parseInt(distanceText.replace(/\D/g, ""), 10);
      quotationObject.pickupCoordinates = pickupLocation.location;
      quotationObject.dropOffCoordinates = dropofLocation.location;
      quotationObject.pickupAddress = pickupLocation.address;
      quotationObject.dropOffAddress = dropofLocation.address;
      quotationObject.estimatedFuelCost = ((mileage / 9) * 4).toFixed(2);
      quotationObject.mileage = mileage;
      if (body.quotationVia == quotationVia[1]) {
        if (!body.phone.startsWith("+")) {
          body.phone = "+" + body.phone;
        }
        quotationObject = { ...quotationObject, phone: body.phone };
      }
      if (body.quotationVia == quotationVia[0]) {
        quotationObject = { ...quotationObject, email: body.email };
      }
      if (body.pickupDate) {
        quotationObject = { ...quotationObject, pickupDate: body.pickupDate };
      }
      if (body.type === quotationType[0]) {
        let carrierCompensation =
          (mileage / 62) *
          1.25 *
          (body.estimatedWeight === estimatedWeightUnder2k[0]
            ? 95
            : body.estimatedWeight === estimatedWeightUnder2k[1]
              ? 100
              : body.estimatedWeight == estimatedWeightUnder2k[2]
                ? 105
                : 110) +
          (body?.cargoLoadedBy === cargoLoadedBy[1] ? 0 : 125) +
          (body?.cargoUnloadBy === cargoUnloadBy[1] ? 0 : 125) +
          (mileage / 9) * 4;
        let brokerCompensation = carrierCompensation * 0.25;
        quotationObject.amount = (
          carrierCompensation + brokerCompensation
        ).toFixed(2);
        quotationObject.brokerCompensation = brokerCompensation;
        quotationObject = {
          ...quotationObject,
          dimensionUnder896: body.dimensionUnder896,
          estimatedWeight: body.estimatedWeight,
          cargoDescription: body.cargoDescription,
          cargoLoadedBy: body.cargoLoadedBy,
          cargoUnloadBy: body.cargoUnloadBy,
        };
      }
      if (body.type === quotationType[1]) {
        let carrierCompensation =
          (mileage / 62) *
          1.25 *
          (body.estimatedWeight === estimatedWeightUnderGeneralFreight[0]
            ? 125
            : body.estimatedWeight === estimatedWeightUnderGeneralFreight[1]
              ? 130
              : 135) +
          (body?.cargoLoadedBy === cargoLoadedBy[1] ? 0 : 125) +
          (body?.cargoUnloadBy === cargoUnloadBy[1] ? 0 : 125) +
          (mileage / 9) * 4;
        let brokerCompensation = carrierCompensation * 0.25;
        quotationObject.amount = (
          carrierCompensation + brokerCompensation
        ).toFixed(2);
        quotationObject.brokerCompensation = brokerCompensation;
        quotationObject = {
          ...quotationObject,
          longestDimesntionOfCargo: body.longestDimesntionOfCargo,
          estimatedWeight: body.estimatedWeight,
          cargoDescription: body.cargoDescription,
          cargoLoadedBy: body.cargoLoadedBy,
          cargoUnloadBy: body.cargoUnloadBy,
        };
      }
      if (body.type === quotationType[2]) {
        let carrierCompensation =
          mileage * 1.5 + (body.vehicleOperable ? 0 : 125);
        let brokerCompensation = carrierCompensation * 0.25;
        quotationObject.amount = (
          carrierCompensation + brokerCompensation
        ).toFixed(2);
        quotationObject.brokerCompensation = brokerCompensation;
        quotationObject = {
          ...quotationObject,
          vehicleOperable: body.vehicleOperable,
          vehicleDetails: body.vehicleDetails,
        };
      }
      if (body.type === quotationType[4]) {
        let carrierCompensation =
          (mileage / 62) *
          1.25 *
          (body.estimatedWeight === estimatedWeightFor26[0]
            ? 110
            : body.estimatedWeight === estimatedWeightFor26[1]
              ? 115
              : 125) +
          (body?.cargoLoadedBy === cargoLoadedBy[1] ? 0 : 125) +
          (body?.cargoUnloadBy === cargoUnloadBy[1] ? 0 : 125) +
          (mileage / 9) * 4;
        let brokerCompensation = carrierCompensation * 0.25;
        quotationObject.amount = (
          carrierCompensation + brokerCompensation
        ).toFixed(2);
        quotationObject.brokerCompensation = brokerCompensation;
        quotationObject = {
          ...quotationObject,
          longestDimesntionOfCargo: body.longestDimesntionOfCargo,
          dimensionUnder896: body.dimensionUnder896,
          estimatedWeight: body.estimatedWeight,
          cargoDescription: body.cargoDescription,
          cargoLoadedBy: body.cargoLoadedBy,
          cargoUnloadBy: body.cargoUnloadBy,
        };
      }
      const quotation = new QuotationRequests(quotationObject);
      quotation.redirectUri = quotation.redirectUri + `?id=${quotation?._id}`;
      await quotation.save();
      shortFormReview(
        `Hello Hotshot received a quote request for a ${quotation.type
        } on ${moment().utc(new Date()).local().format("ddd MMM D [at] hh:mm a")}`
      );
      return res.status(200).send({
        message: "Quotation is sent to the admin for approval",
        data: quotation._doc,
      });
    }
    return res.status(400).send({ message: "Trouble Evaluating Distance" });
  } catch (e) {
    console.log("Error", e);
    return res
      .status(500)
      .send({ message: e?.message ? e?.message : "Something Went Wrong!" });
  }
};
const sendQuotation = async (req, res) => {
  try {
    const { user, body, params } = req;
    const { error } = validateSendQuotaion(body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }
    if (user.role !== platFormRoles[0]) {
      return res.status(401).send({ message: messages.notAllowed });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return res.status(400).send({ message: messages.invalidId });
    }
    let quotation = await QuotationRequests.findById(params.id);
    if (quotation) {
      if (quotation.status === "sent") {
        return res.status(400).send({ message: messages.alreadySend });
      }
      if (body.amount) {
        quotation.amount = body.amount;
        quotation.brokerCompensation = body.amount * 0.25;
      }
      quotation.status = requestStatus[1];
      if (quotation.quotationVia == quotationVia[0]) {
        await sendEmail({
          emailTo: quotation.email,
          subject: "Hello Hotshot - project quote",
          // message: messages.quotationText(quotation),
          html: messages.quotationText(quotation)
        });
      }
      if (quotation.quotationVia == quotationVia[1]) {
        if (!quotation.phone.startsWith("+")) {
          quotation.phone = "+" + quotation.phone;
        }
        await sendSms(messages.quotationTextSMS(quotation), quotation.phone);
      }
      await QuotationRequests.updateOne({ _id: params.id }, quotation);
      return res
        .status(200)
        .send({ message: "Quotation Sent Successfully", data: quotation });
    }
    return res.status(400).send({ message: messages.notExist });
  } catch (e) {
    console.log("Error", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const getQuotationById = async (req, res) => {
  try {
    const { params } = req;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return res.status(400).send({ message: messages.invalidId });
    }
    let quotation = await QuotationRequests.findById(params.id);
    return res.status(200).send({ message: messages.success, data: quotation });
  } catch (e) {
    console.log("Error", e);
    return res.status(500).send({ error: e, message: "Something Went Wrong!" });
  }
};
const getAllQuotation = async (req, res) => {
  try {
    const { user, query } = req;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const status = query.status;
    const search = query.search;
    if (user?.role !== platFormRoles[0]) {
      return res.status(401).send({ message: messages.notAllowed });
    }
    let filters = {};
    const options = {
      page,
      sort: { createdAt: -1 },
      limit: pageSize,
    };
    if (status) {
      filters.status = status;
    }
    if (search) {
      filters._id = search;
    }
    const quotations = await QuotationRequests.paginate(filters, options);
    return res
      .status(200)
      .send({ message: messages.success, data: quotations });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: "Something Went Wrong!" });
  }
};

module.exports = {
  createQuotation,
  sendQuotation,
  getQuotationById,
  getAllQuotation,
};
