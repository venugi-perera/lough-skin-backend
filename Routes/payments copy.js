// import express from 'express';
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// const router = express.Router();

// router.post('/create-payment-intent', async (req, res) => {
//   const { amount } = req.body;

//   try {
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(amount * 100), // convert to cents
//       currency: 'eur',
//       payment_method_types: ['card'],
//     });

//     res.send({ clientSecret: paymentIntent.client_secret });
//   } catch (err) {
//     res.status(500).json({ error: 'Stripe error' });
//   }
// });

// export default router;

// import express from 'express';
// import Stripe from 'stripe';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const router = express.Router();

// // Currency and delivery charge
// const currency = 'eur'; // change as needed
// const deliveryCharge = 10;

// router.post('/create-payment-intent', async (req, res) => {
//   const { userId, items, amount, address } = req.body;
//   const { origin } = req.headers;

//   try {
//     // Create new order with payment status = false
//     const orderData = {
//       userId,
//       items,
//       address,
//       amount,
//       paymentMethod: 'Stripe',
//       payment: false,
//       date: Date.now(),
//     };

//     // const newOrder = new orderModel(orderData);
//     // await newOrder.save();

//     // Map items to Stripe line_items
//     const line_items = items.map((item) => ({
//       price_data: {
//         currency,
//         product_data: {
//           name: item.name,
//         },
//         unit_amount: item.price * 100, // in cents
//       },
//       quantity: item.quantity,
//     }));

//     // Add delivery charge as an item
//     line_items.push({
//       price_data: {
//         currency,
//         product_data: {
//           name: 'Delivery Charges',
//         },
//         unit_amount: deliveryCharge * 100,
//       },
//       quantity: 1,
//     });

//     // Create Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items,
//       mode: 'payment',
//       success_url: `${origin}/verify?success=true&orderId=${'1'}`,
//       cancel_url: `${origin}/verify?success=false&orderId=${'1'}`,
//     });

//     res.json({ success: true, session_url: session.url });
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ success: false, message: 'Stripe error', error: err.message });
//   }
// });

// export default router;

import express from 'express';
import Stripe from 'stripe';
import orderModel from '../models/orderModel.js'; // ensure this path is correct

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

const currency = 'eur';
const deliveryCharge = 10;

// Create Checkout Session
router.post('/create-payment-intent', async (req, res) => {
  const { userId, items, amount, address } = req.body;
  const { origin } = req.headers;

  try {
    // Create Stripe Customer with metadata
    const customer = await stripe.customers.create({
      metadata: {
        userId,
        cart: JSON.stringify(items),
      },
    });

    // Convert items to line_items format
    const line_items = items.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : [],
          metadata: {
            id: item.id,
          },
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    // Add delivery charge as an extra line item
    line_items.push({
      price_data: {
        currency,
        product_data: {
          name: 'Delivery Charges',
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer: customer.id,
      phone_number_collection: {
        enabled: true,
      },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'KE', 'GB', 'FR', 'DE'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency,
            },
            display_name: 'Free shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500,
              currency,
            },
            display_name: 'Express Delivery',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 1 },
              maximum: { unit: 'business_day', value: 1 },
            },
          },
        },
      ],
      success_url: `${origin}/verify?success=true`,
      cancel_url: `${origin}/verify?success=false`,
    });

    res.json({ success: true, session_url: session.url });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Stripe error', error: err.message });
  }
});

// Function to create order after successful payment
const createOrder = async (customer, data) => {
  const Items = JSON.parse(customer.metadata.cart);

  const products = Items.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
  }));

  const newOrder = new orderModel({
    userId: customer.metadata.userId,
    customerId: data.customer,
    paymentIntentId: data.payment_intent,
    products,
    subtotal: data.amount_subtotal,
    total: data.amount_total,
    shipping: data.customer_details,
    payment_status: data.payment_status,
    payment: true,
    date: Date.now(),
  });

  try {
    const savedOrder = await newOrder.save();
    console.log('Processed Order:', savedOrder);
  } catch (err) {
    console.log('Order creation failed:', err);
  }
};

// Stripe webhook for order creation
router.post(
  '/webhook',
  express.json({ type: 'application/json' }),
  async (req, res) => {
    let data;
    let eventType;

    const webhookSecret = process.env.STRIPE_WEB_HOOK;

    if (webhookSecret) {
      const signature = req.headers['stripe-signature'];
      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
        data = event.data.object;
        eventType = event.type;
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      data = req.body.data.object;
      eventType = req.body.type;
    }

    if (eventType === 'checkout.session.completed') {
      stripe.customers
        .retrieve(data.customer)
        .then((customer) => createOrder(customer, data))
        .catch((err) => console.error('Customer fetch failed:', err.message));
    }

    res.status(200).end();
  }
);

export default router;
