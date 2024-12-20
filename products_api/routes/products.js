const express = require('express');
const { trace } = require('@opentelemetry/api');
const router = express.Router();
const Product = require('../models/Product');

// Obtén el tracer de OpenTelemetry
const tracer = trace.getTracer('products-api');

// POST: Registrar un nuevo producto
router.post('/', async (req, res) => {
  console.log(req.body);
  const span = tracer.startSpan('POST /products');
  try {
    const { name, price, description } = req.body;

    if (!name || !price) {
      throw new Error('Both "name" and "price" are required');
    }

    const newProduct = new Product({ name, price, description });
    const savedProduct = await newProduct.save();

    span.setAttributes({
      'http.method': 'POST',
      'http.route': '/products',
      'http.status_code': 201,
    });
    res.status(201).json(savedProduct);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 400);
    res.status(400).json({ message: err.message });
  } finally {
    span.end();
  }
});

// GET: Listar todos los productos
router.get('/', async (req, res) => {
  const span = tracer.startSpan('GET /products');
  try {
    const products = await Product.find();

    span.setAttributes({
      'http.method': 'GET',
      'http.route': '/products',
      'http.status_code': 200,
    });
    res.json(products);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 500);
    res.status(500).json({ message: err.message });
  } finally {
    span.end();
  }
});

// GET: Obtener un producto por ID
router.get('/:id', async (req, res) => {
  console.log(req.params.id);
  const span = tracer.startSpan('GET /products/:id');
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      span.setAttribute('http.status_code', 404);
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    span.setAttributes({
      'http.method': 'GET',
      'http.route': '/products/:id',
      'http.status_code': 200,
    });
    res.json(product);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 500);
    res.status(500).json({ message: err.message });
  } finally {
    span.end();
  }
});

module.exports = router;
