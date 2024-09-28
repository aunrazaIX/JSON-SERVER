const stripe = require("../services/stripe");

const createService = async (shipment) => {
  try {
    const service = await stripe.products.create({
      name: `${shipment?.pickupAddress} - ${shipment.dropOffAdress}`,
      type: "service",
    });
    const amountInDollars = shipment.amount;
    const amountInCents = Math.round(amountInDollars * 100);
    const price = await stripe.prices.create({
      product: service.id,
      unit_amount: amountInCents,
      currency: "usd",
    });
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        id: shipment.id.toString(),
      },
      success_url: "https://hellohotshot.co/",
      cancel_url: "https://hellohotshot.co/",
    });
    return session.url;
  } catch (e) {
    throw new Error(e?.message);
  }
};

module.exports = {
  createService,
};
