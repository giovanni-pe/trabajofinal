const express = require('express');
const { trace } = require('@opentelemetry/api');
const axios = require('axios');
const router = express.Router();
const Sale = require('../models/Sale');

// Obtén el tracer de OpenTelemetry
const tracer = trace.getTracer('../tracer.js');

// POST: Registrar una nueva venta individual
router.post('/', async (req, res) => {
  const span = tracer.startSpan('POST /sales');
  console.log(req.body);
  try {
    const { date, value, productId } = req.body;

    if (!date || !value || !productId) {
      throw new Error('Fields "date", "value", and "productId" are required');
    }

    // Llamada al servicio externo para verificar el producto
    const productSpan = tracer.startSpan('GET /products/:id', { parent: span });
    const productResponse = await axios.get(`http://localhost:5001/products/${productId}`);
    productSpan.setAttributes({
      'http.method': 'GET',
      'http.url': `http://localhost:5001/products/${productId}`,
      'http.status_code': productResponse.status,
    });
    productSpan.end();

    const product = productResponse.data;

    // Crea la venta en la base de datos
    const newSale = new Sale({ date, value, product });
    const savedSale = await newSale.save();

    span.setAttributes({
      'http.method': 'POST',
      'http.route': '/sales',
      'http.status_code': 201,
    });
    res.status(201).json(savedSale);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 400);
    res.status(400).json({ message: err.message });
  } finally {
    span.end();
  }
});

// GET: Estadísticas por período (week, month, year, max)
router.get('/:period', async (req, res) => {
  const span = tracer.startSpan(`GET /sales/${req.params.period}`);
  try {
    const { period } = req.params;
    const sales = await Sale.find();

    let stats = [];
    switch (period) {
      case 'week':
        stats = calculateWeeklyStats(sales);
        break;
      case 'month':
        stats = calculateMonthlyStats(sales);
        break;
      case 'year':
        stats = calculateYearlyStats(sales);
        break;
      case 'max':
        stats = calculateMaxPoints(sales);
        break;
      default:
        span.setAttribute('http.status_code', 400);
        res.status(400).json({ message: 'Invalid period' });
        span.end();
        return;
    }

    span.setAttributes({
      'http.method': 'GET',
      'http.route': `/sales/${period}`,
      'http.status_code': 200,
    });
    res.json(stats);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 500);
    res.status(500).json({ message: err.message });
  } finally {
    span.end();
  }
});

// GET: Todas las ventas individuales
router.get('/', async (req, res) => {
  const span = tracer.startSpan('GET /sales');
  try {
    const sales = await Sale.find();

    span.setAttributes({
      'http.method': 'GET',
      'http.route': '/sales',
      'http.status_code': 200,
    });
    res.json(sales);
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 500);
    res.status(500).json({ message: err.message });
  } finally {
    span.end();
  }
});

// DELETE: Eliminar todas las ventas
router.delete('/', async (req, res) => {
  const span = tracer.startSpan('DELETE /sales');
  try {
    await Sale.deleteMany();

    span.setAttributes({
      'http.method': 'DELETE',
      'http.route': '/sales',
      'http.status_code': 204,
    });
    res.status(204).send();
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 500);
    res.status(500).json({ message: err.message });
  } finally {
    span.end();
  }
});

// DELETE: Eliminar una venta por ID
router.delete('/:id', async (req, res) => {
  const span = tracer.startSpan(`DELETE /sales/${req.params.id}`);
  try {
    const { id } = req.params;
    const deletedSale = await Sale.findByIdAndDelete(id);

    if (!deletedSale) {
      span.setAttribute('http.status_code', 404);
      res.status(404).json({ message: 'Sale not found' });
    } else {
      span.setAttributes({
        'http.method': 'DELETE',
        'http.route': `/sales/${id}`,
        'http.status_code': 204,
      });
      res.status(204).send();
    }
  } catch (err) {
    span.recordException(err);
    span.setAttribute('http.status_code', 500);
    res.status(500).json({ message: err.message });
  } finally {
    span.end();
  }
});

// Helper Functions
function calculateWeeklyStats(sales) {
  const grouped = {};
  sales.forEach((sale) => {
    const week = getWeekOfYear(sale.date);
    grouped[week] = (grouped[week] || 0) + sale.value;
  });
  return Object.keys(grouped).map((week) => ({ week, value: grouped[week] }));
}

function calculateMonthlyStats(sales) {
  const grouped = {};
  sales.forEach((sale) => {
    const month = `${sale.date.getFullYear()}-${sale.date.getMonth() + 1}`;
    grouped[month] = (grouped[month] || 0) + sale.value;
  });
  return Object.keys(grouped).map((month) => ({ month, value: grouped[month] }));
}

function calculateYearlyStats(sales) {
  const grouped = {};
  sales.forEach((sale) => {
    const year = sale.date.getFullYear();
    grouped[year] = (grouped[year] || 0) + sale.value;
  });
  return Object.keys(grouped).map((year) => ({ year, value: grouped[year] }));
}

function calculateMaxPoints(sales) {
  return sales.sort((a, b) => b.value - a.value).slice(0, 5);
}

function getWeekOfYear(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports = router;
