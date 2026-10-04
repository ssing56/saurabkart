const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/saurabkart";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model("Product", productSchema);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "SaurabKart backend is running"
  });
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);

    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch products",
      error: error.message
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: "ERROR",
        message: "Product not found"
      });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error.message);

    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch product",
      error: error.message
    });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    const product = new Product({
      name,
      description,
      price,
      image,
      category
    });

    const savedProduct = await product.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error.message);

    res.status(500).json({
      status: "ERROR",
      message: "Failed to create product",
      error: error.message
    });
  }
});

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
  });
