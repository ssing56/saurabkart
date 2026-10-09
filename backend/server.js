
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/saurabkart";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn("Razorpay credentials are not configured.");
}

// ---------------- PRODUCT MODEL ----------------

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

// ---------------- ORDER MODEL ----------------

const orderSchema = new mongoose.Schema(
  {
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

// ---------------- HEALTH CHECK ----------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "SaurabKart backend is running",
  });
});

// ---------------- GET ALL PRODUCTS ----------------

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);

    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch products",
    });
  }
});

// ---------------- GET SINGLE PRODUCT ----------------

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: "ERROR",
        message: "Product not found",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({
      status: "ERROR",
      message: "Invalid product ID",
    });
  }
});

// ---------------- CREATE PRODUCT ----------------

app.post("/api/products", async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    const product = new Product({
      name,
      description,
      price,
      image,
      category,
    });

    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error.message);

    res.status(400).json({
      status: "ERROR",
      message: "Failed to create product",
    });
  }
});

// ---------------- CREATE RAZORPAY ORDER ----------------

app.post("/api/payment/create-order", async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        status: "ERROR",
        message: "Payment service is not configured",
      });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({
        status: "ERROR",
        message: "Please provide valid cart items",
      });
    }

    // Validate IDs and quantities before querying MongoDB.
    const quantities = new Map();

    for (const item of items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !mongoose.isValidObjectId(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        return res.status(400).json({
          status: "ERROR",
          message: "Invalid product ID or quantity",
        });
      }

      const id = item.productId;
      quantities.set(id, (quantities.get(id) || 0) + item.quantity);

      if (quantities.get(id) > 99) {
        return res.status(400).json({
          status: "ERROR",
          message: "Maximum quantity per product is 99",
        });
      }
    }

    const productIds = [...quantities.keys()];

    const products = await Product.find({
      _id: { $in: productIds },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        status: "ERROR",
        message: "One or more products no longer exist",
      });
    }

    // Never trust prices sent by the browser.
    const orderItems = products.map((product) => ({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: quantities.get(product._id.toString()),
    }));

    const totalRupees = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const amountInPaise = Math.round(totalRupees * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0 ||
      amountInPaise > 100000000
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Invalid order amount",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sk_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`,
    });

    try {
      await Order.create({
        razorpayOrderId: razorpayOrder.id,
        items: orderItems,
        amount: amountInPaise,
        currency: "INR",
        status: "PENDING",
      });
    } catch (dbError) {
      // Do not allow checkout to continue if we cannot persist the order.
      console.error("Order persistence failed:", dbError.message);

      return res.status(500).json({
        status: "ERROR",
        message: "Unable to save order. Please retry.",
      });
    }

    res.status(201).json({
      status: "OK",
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create payment order failed:", error.message);

    res.status(502).json({
      status: "ERROR",
      message: "Unable to create payment order",
    });
  }
});

// ---------------- VERIFY PAYMENT ----------------

app.post("/api/payment/verify", async (req, res) => {
  try {
    if (!razorpay || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        status: "ERROR",
        message: "Payment service is not configured",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature)
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Invalid payment verification details",
      });
    }

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!order) {
      return res.status(404).json({
        status: "ERROR",
        message: "Order not found",
      });
    }

    // Verify the Razorpay checkout signature.
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest();

    const receivedSignature = Buffer.from(razorpay_signature, "hex");

    if (
      expectedSignature.length !== receivedSignature.length ||
      !crypto.timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Payment signature verification failed",
      });
    }

    if (order.status === "PAID") {
      if (order.razorpayPaymentId !== razorpay_payment_id) {
        return res.status(409).json({
          status: "ERROR",
          message: "Order has already been paid using another payment",
        });
      }

      return res.status(200).json({
        status: "OK",
        message: "Payment already verified",
        orderId: order.razorpayOrderId,
      });
    }

    // Confirm payment details directly with Razorpay.
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      payment.order_id !== order.razorpayOrderId ||
      payment.amount !== order.amount ||
      payment.currency !== order.currency
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Payment details do not match the order",
      });
    }

    if (payment.status !== "captured") {
      return res.status(409).json({
        status: "ERROR",
        message:
          "Payment is not captured yet. Please check payment status.",
      });
    }

    // Atomic update prevents two different payments marking the same
    // pending order as paid at the same time.
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: "PENDING",
      },
      {
        $set: {
          status: "PAID",
          razorpayPaymentId: razorpay_payment_id,
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        status: "ERROR",
        message: "Order status changed. Please check your order.",
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Payment verified successfully",
      orderId: updatedOrder.razorpayOrderId,
      paymentId: updatedOrder.razorpayPaymentId,
    });
  } catch (error) {
    console.error("Payment verification failed:", error.message);

    res.status(502).json({
      status: "ERROR",
      message: "Unable to verify payment. Please retry or check status.",
    });
  }
});

// ---------------- START SERVER ----------------

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log("Backend running on port " + PORT);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
