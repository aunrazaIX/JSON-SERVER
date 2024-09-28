const { platFormRoles } = require("../config");
const { Devices } = require("../models/devices");
const { Notifications } = require("../models/notifications");
const { User } = require("../models/user");
const { notificationService } = require("../services/notification");

const sendNotification = async (notification, ids, tokens, metaData) => {
  try {
    let notifications = new Notifications({
      notification: {
        title: notification.title,
        body: notification.body,
      },
      type: notification.type,
      userIds: ids,
    });
    if (metaData) {
      notification = {
        ...notification,
        metaData: {
          id: metaData,
        },
      };
    }
    await notifications.save();
    if (tokens?.length > 0) {
      await Promise.all(
        tokens?.map(async (token) => {
          const res = await notificationService.messaging().send({
            notification: {
              title: notification.title,
              body: notification.body,
            },
            token,
          });
        })
      );
    }
  } catch (e) {
    console.log("Error Sending Notification", e?.message);
  }
};

const shortFormReview = async (message) => {
  try {
    let notificationObject = {
      title: "New Quotation Received!",
      body: message,
      type: "shortFormReview",
    };
    const { tokens, ids } = await getAdminTokens();
    await sendNotification(notificationObject, ids, tokens);
  } catch (e) {
    console.log("Error Creating Create Quotation Notification", e?.message);
  }
};

const newShipmentNotification = async (message) => {
  try {
    let notificationObject = {
      title: "New Shipment Onboarded!",
      body: message,
      type: "newShipment",
    };
    const { tokens, ids } = await getAdminTokens();

    await sendNotification(notificationObject, ids, tokens);
  } catch (e) {
    console.log("Error Creating Create Quotation Notification", e?.message);
  }
};

const masterCodeIsUsed = async (message, metaData) => {
  try {
    let notificationObject = {
      title: "Master Code Used!",
      body: message,
      type: "masterCode",
    };
    const { tokens, ids } = await getAdminTokens();
    await sendNotification(notificationObject, ids, tokens, metaData);
  } catch (e) {
    console.log("Error Creating Create Quotation Notification", e?.message);
  }
};

const notifyRiders = async (riders, metaData) => {
  console.log(metaData, 'Meta');
  try {
    let tokens = [];
    await Promise.all(
      riders?.map(async (rider) => {
        let deviceInfo = await Devices.findOne({ user: rider });
        if (deviceInfo) {
          let loadType = rider.truckInformation?.carrierType == metaData.quotation.type ? 'match' : 'open'
          let notificationObject = {
            title: "New Shipment!",
            body: `Good news. Hello Hotshot has sent you a project request. Please review your ${loadType} loads.`,
            type: "shipment",
          };
          await sendNotification(notificationObject, riders, [deviceInfo?.fcmToken], metaData);
          // tokens.push(deviceInfo?.fcmToken);
        }
      })
    );

  } catch (e) {
    console.log("Error Creating notify rider Notification", e?.message);
  }
};

const assignShipmentNotification = async (rider, metaData) => {
  try {
    let tokens = [];
    const deviceInfo = await Devices.findOne({ user: rider });
    if (deviceInfo) {
      tokens.push(deviceInfo.fcmToken);
    }
    let notificationObject = {
      title: "Shipment Assigned!",
      body: "Please Follow up as you have a current ongoing shipment!",
      type: "shipment",
    };
    await sendNotification(notificationObject, [rider], tokens, metaData);
  } catch (e) {
    console.log("Error Creating notify rider Notification", e?.message);
  }
};

const pickupUserNotification = async (user, metaData) => {
  try {
    let tokens = [];
    const deviceInfo = await Devices.findOne({ user: user });
    if (deviceInfo) {
      tokens.push(deviceInfo.fcmToken);
    }
    let notificationObject = {
      title: "Shipment Picked Up!",
      body: `Your Shipment (id:${metaData}) has been picked up by the rider.`,
      type: "shipment",
    };
    await sendNotification(notificationObject, user, tokens, metaData);
  } catch (e) {
    console.log("Error Creating notify rider Notification", e?.message);
  }
};
const dropoffUserNotification = async (user, metaData) => {
  try {
    let tokens = [];
    const deviceInfo = await Devices.findOne({ user: user });
    if (deviceInfo) {
      tokens.push(deviceInfo.fcmToken);
    }
    let notificationObject = {
      title: "Shipment Droped-Off!",
      body: `Your Shipment (id:${metaData}) has been droped-off by the rider.`,
      type: "shipment",
    };
    await sendNotification(notificationObject, user, tokens, metaData);
  } catch (e) {
    console.log("Error Creating notify rider Notification", e?.message);
  }
};
const delayUserNotification = async (user, metaData) => {
  try {
    let tokens = [];
    const deviceInfo = await Devices.findOne({ user: user });
    if (deviceInfo) {
      tokens.push(deviceInfo.fcmToken);
    }
    let notificationObject = {
      title: "Shipment Delayed!",
      body: `Your Shipment (id:${metaData?.id}) will be delayed because ${metaData?.issue} and will take ${metaData?.time} time to resole the issue.`,
      type: "shipment",
    };
    await sendNotification(notificationObject, user, tokens, metaData);
  } catch (e) {
    console.log("Error Creating notify rider Notification", e?.message);
  }
};

const riderMarkedIntrestTypeNotification = async (data, metaData) => {
  try {
    const { tokens, ids } = await getAdminTokens();
    let notificationObject = {
      title: "Rider Followup!",
      body: `Rider has marked ${data?.type} on shipment ${data?.shipmentId} !`,
      type: "shipment",
    };
    await sendNotification(notificationObject, ids, tokens, metaData);
  } catch (e) {
    console.log("Rider marked interest type notification", e?.message);
  }
};

const riderProfileVerify = async (rider, metaData) => {
  try {
    let tokens = [];
    const deviceInfo = await Devices.findOne({ user: rider });
    if (deviceInfo) {
      tokens.push(deviceInfo.fcmToken);
    }
    let notificationObject = {
      title: "Profile Verified",
      body: `Congratulations! Your profile has been verified.`,
      type: "rider",
    };
    await sendNotification(notificationObject, rider, tokens, metaData);
  } catch (e) {
    console.log("Error Creating notify rider Notification", e?.message);
  }
};
const getAdminTokens = async () => {
  let ids = [];
  let tokens = [];
  const admins = await User.find({ role: platFormRoles[0] });
  await Promise.allSettled(
    admins?.map(async (admin) => {
      ids.push(admin._id);
      const devices = await Devices.find({ user: admin._id });
      if (devices?.length > 0) {
        devices?.forEach((device) => {
          if (device.fcmToken) {
            tokens.push(device.fcmToken);
          }
        });
      }
    })
  );
  return {
    ids,
    tokens,
  };
};

module.exports = {
  sendNotification,
  shortFormReview,
  newShipmentNotification,
  masterCodeIsUsed,
  riderMarkedIntrestTypeNotification,
  notifyRiders,
  assignShipmentNotification,
  dropoffUserNotification,
  pickupUserNotification,
  delayUserNotification,
  riderProfileVerify,
};
