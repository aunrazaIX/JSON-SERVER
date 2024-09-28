const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const { apiKey, accountSid, authToken } = require("../config");
const { jsPDF } = require("jspdf");
const mongoose = require("mongoose");
const twilio = require("twilio");
const handlebars = require("handlebars");
const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
handlebars.registerHelper('eq', function (string1, string2, options) {
  if (string1 == string2) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});
const htmlToPdf = async (htmlContent) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();
  return pdfBuffer;
};

const returnRequestObj = (model, body) => {
  let reqObj = {};
  const obj = model?.schema?.tree;
  let schemaKeys = Object.keys(obj);
  for (let key in body) {
    if (schemaKeys.includes(key)) {
      reqObj[key] = body[key];
    }
  }
  return reqObj;
};
const pickExcept = (model, exceptArray) => {
  const obj = {};
  for (let key in model) {
    if (!exceptArray?.includes(key)) {
      obj[key] = model[key];
    }
  }
  return obj;
};
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};
const generateRandomPassword = (length = 8) => {
  const minLength = 8;
  if (length < minLength) {
    throw new Error("Password length must be at least 8 characters.");
  }
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }
  return password;
};
const getSearchQuery = (value) => ({ $regex: value, $options: "i" });

const sendEmail = async (info, _path, fields, convert = false) => {
  try {
    if (_path) {

      let templatePath = path.join(__dirname, `../templates/${_path}`);
      const templateSource = fs.readFileSync(templatePath, "utf8");
      const template = handlebars.compile(templateSource);
      html = template(fields);
    }
    if (convert) {
      let pdf = await htmlToPdf(html);
      info.attachments =
        info?.attachments?.length > 0
          ? [
            ...info?.attachments,
            {
              filename: "summary.pdf",
              content: pdf,
              encoding: "base64",
            },
          ]
          : [
            {
              filename: "summary.pdf",
              content: pdf,
              encoding: "base64",
            },
          ];
    }
    return new Promise((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "active.projects@hellohotshot.co",
          pass: " impdcbhaopjbodbo",
        },
      });
      let mailOptions = {
        from: "Hotshot",
        to: info?.emailTo,
        subject: info?.subject,
        text: info?.message,
        html: info?.html
      };
      if (info.attachments) {
        mailOptions.attachments = info?.attachments;
      }
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          reject(err);
        } else {
          resolve(info);
        }
      });
    });
  } catch (e) {
    throw new Error(e);
  }
};
const sendSms = (message, to) => {
  return new Promise((resolve, reject) => {
    const client = twilio(accountSid, authToken);
    client.messages
      .create({
        shortenUrls: true,
        body: message,
        from: "+18447450094",
        to: to,
      })
      .then(() => {
        resolve("Message Sent!");
      })
      .catch((e) => reject(e));
  });
};
const getLatLong = async (zipCode) => {
  try {
    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode}&components=country:US &key=${apiKey}`;
    const unFormatedRes = await fetch(apiUrl);
    const data = await unFormatedRes.json();
    if (data.status === "OK" && data?.results?.length > 0) {
      const location = data?.results?.filter((v) => !v?.partial_match);
      if (location?.length > 0) {
        const address = location[0]?.formatted_address;
        const latitude = location[0]?.geometry?.location?.lat;
        const longitude = location[0]?.geometry?.location?.lng;
        return {
          location: [longitude, latitude],
          address,
        };
      } else {
        throw new Error("No Location Found");
      }
    } else {
      throw new Error("No Location Found");
    }
  } catch (e) {
    throw new Error(e?.message);
  }
};

const getCityAndState = async (location) => {
  try {
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location[1]},${location[0]}&key=${apiKey}`;
    const addressRes = await fetch(geocodingUrl);
    const addressJson = await addressRes.json();
    if (addressJson.status === "OK") {
      const addressComponents = addressJson.results[0].address_components;
      let city, state;
      for (const component of addressComponents) {
        if (component.types.includes("locality")) {
          city = component.long_name;
        } else if (component.types.includes("administrative_area_level_1")) {
          state = component.short_name;
        }
      }
      return { city, state };
    } else {
      throw new Error(addressJson?.status);
    }
  } catch (e) {
    throw new Error(e?.message);
  }
};

const evaluateTime = async (origin, destination) => {
  try {
    const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
    const unFormatedRes = await fetch(apiUrl);
    if (!unFormatedRes.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await unFormatedRes.json();
    if (data.status === "OK" && data?.routes?.length > 0) {
      const durationInSeconds = data?.routes[0]?.legs[0]?.duration?.value;
      const durationInMinutes = durationInSeconds / 60;
      return durationInMinutes;
    } else {
      throw new Error("No Valid Route for these cordinates");
    }
  } catch (e) {
    throw new Error(e?.message);
  }
};
const generatePdfFile = (obj) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let y = 10;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = String(obj[key]);
      doc.text(`${key}: ${value}`, 10, y);
      y += 10;
      if (y > pageHeight - 10) {
        doc.addPage();
        y = 10;
      }
    }
  }
  const pdfBytes = doc.output();
  return pdfBytes;
};

const getUniqueTrackingId = () => {
  let timestamp = Date.now();
  let last5Digits = ("0000" + timestamp).slice(-5);
  let uniqueNumber = "HH-" + last5Digits;
  return uniqueNumber;
};
function flattenObject(obj, parentKey = "", visited = new Set()) {
  let result = {};
  if (visited.has(obj)) {
    return result;
  }
  visited.add(obj);
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const nestedKey = parentKey ? `${parentKey}.${key}` : key;
      const value = obj[key];
      if (value instanceof mongoose.Types.ObjectId) {
        result[nestedKey] = value.toString();
      } else if (typeof value === "object" && !Array.isArray(value)) {
        const flattened = flattenObject(value, nestedKey, visited);
        result = { ...result, ...flattened };
      } else {
        result[nestedKey] = value;
      }
    }
  }
  return result;
}

module.exports = {
  returnRequestObj,
  pickExcept,
  generateOTP,
  sendEmail,
  generateRandomPassword,
  getLatLong,
  evaluateTime,
  generatePdfFile,
  flattenObject,
  sendSms,
  getSearchQuery,
  getUniqueTrackingId,
  getCityAndState,
};
