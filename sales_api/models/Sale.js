const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  value: { type: Number, required: true },
  product: {
    type: Object,
    required: true,
  },
});

module.exports = mongoose.model('Sale', SaleSchema);
