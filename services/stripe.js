const stripe = require('stripe')(process.env.STRIPEKEY);
module.exports = stripe