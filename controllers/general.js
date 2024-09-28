const {
  messages,
  platFormRoles,
  quotationType,
  quotationVia,
  estimatedWeightFor26,
  estimatedWeightUnder2k,
  estimatedWeightUnderGeneralFreight,
  cargoLoadedBy,
  requestStatus,
  cargoUnloadBy,
  equipments,
  loadedVia,
  cargoCollectedAt,
  vehicleCollectedAt,
  comunicationMode,
  shipmentStatus,
  notificationStatus,
  riderRequestedAs,
  masterCode,
  paymentStatus,
} = require("../config");
const { faqs } = require("../content");
const { Notifications } = require("../models/notifications");
const { default: mongoose } = require("mongoose");

const uploadImage = (req, res) => {

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const protocol = req.protocol;
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  return res
    .status(200)
    .json({ message: "File uploaded successfully", imageUrl: fileUrl });
};

const getFaqs = (req, res) => {
  try {
    res.status(200).send({ message: messages.success, faqs });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: messages.somethingWentWrong });
  }
};

const getSettings = (req, res) => {
  try {
    res.status(200).send({
      message: messages.success,
      platFormRoles,
      quotationVia,
      estimatedWeightFor26,
      estimatedWeightUnder2k,
      estimatedWeightUnderGeneralFreight,
      quotationType,
      requestStatus,
      cargoLoadedBy,
      cargoUnloadBy,
      equipments,
      loadedVia,
      toolsRequiredForEquipments: [
        equipments[0],
        equipments[1],
        equipments[2],
        equipments[3],
        equipments[4],
      ],
      toolsRequiredForLoad: [
        equipments[5],
        equipments[6],
        equipments[7],
        equipments[8],
        equipments[9],
      ],
      toolsRequiredForVehicle: [
        equipments[0],
        equipments[4],
        equipments[2],
        equipments[9],
      ],
      cargoCollectedAt,
      vehicleCollectedAt,
      comunicationMode,
      shipmentStatus,
      notificationStatus,
      riderRequestedAs,
      masterCode,
      paymentStatus,
    });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: messages.somethingWentWrong });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const { user, query } = req;
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const status = query?.status;
    if (status && !notificationStatus.includes(status)) {
      return res.status(200).send({
        message: messages.valuesNotAllowed("status", notificationStatus),
      });
    }
    let filters = {
      userIds: {
        $in: [user._id],
      },
    };
    const options = {
      page,
      sort: { createdAt: -1 },
      limit: pageSize,
    };
    if (status) {
      filters.status = status;
    }
    const notifications = await Notifications.paginate(filters, options);
    return res
      .status(200)
      .send({ message: messages.success, data: notifications });
  } catch (e) {
    return res
      .status(500)
      .send({ error: e?.message, message: messages.somethingWentWrong });
  }
};

const markNotificationAsReadUnread = async (req, res) => {
  try {
    const { params, body } = req;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return res.status(400).send({ message: messages.invalidId });
    }
    if (!body.status) {
      return res
        .status(400)
        .send({ message: messages.fieldRequired("status") });
    }
    if (!notificationStatus.includes(body.status)) {
      return res.status(400).send({
        message: messages.valuesNotAllowed("status", notificationStatus),
      });
    }
    const notification = await Notifications.findById(params.id);
    if (!notification) {
      return res.status(400).send({ message: messages.notExist });
    }
    await Notifications.updateOne({ _id: params.id }, { status: body.status });
    return res.status(200).send({ message: messages.updated });
  } catch (e) {
    return res.status(500).send({ success: false, message: e?.message });
  }
};
module.exports = {
  uploadImage,
  getFaqs,
  getSettings,
  getAllNotifications,
  markNotificationAsReadUnread,
};
