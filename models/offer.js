const mongoose = require("mongoose");
 

const offerSchema = new mongoose.Schema({
  title: { type: String, default: null },
  description: { type: String, default: null },
  priceType: { type: String, enum: ["Fixed Price", "Starting From", "Custom Price"], required: true },
  price: { 
    type: Number, 
    default: null,
    required: function () { 
      return this.priceType === "Fixed Price" || this.priceType === "Starting From"; 
    },
    min: [1, "price must be greater than 0"],
    validate: {
      validator: function (v) {
        if (this.priceType === "Custom Price") return v === null || v === undefined;
        return true;
      },
      message: "price must be null when priceType is Custom Price"
    }
  },
  includes: { type: [String], default: [] },
  cta: { type: String, default: null },
  delivery: { type: String, default: null },
  visible: { type: Boolean, default: true },
  currency: { type: String, default: null },
  order: { type: Number, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
 
 module.exports = mongoose.model("Offer", offerSchema);
