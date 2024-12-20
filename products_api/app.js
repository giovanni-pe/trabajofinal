const express = require('express');
const mongoose = require('mongoose');
const productsRouter = require('./routes/products');
require('./tracer'); // Importar la configuración de OpenTelemetry
const cors = require('cors'); 
const app = express();
app.use(cors({
  origin: '*', // Permitir solicitudes desde este dominio
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
}));
// Middleware
app.use(express.json());

// Rutas
app.use('/products', productsRouter);

// Conexión a MongoDB
mongoose
  .connect('mongodb+srv://gkpe24:gkpe24a@cluster0.ttoc36c.mongodb.net/salesdb?retryWrites=true&w=majority&appName=Cluster0'
   , { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Iniciar el servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Products API running on http://localhost:${PORT}`);
});

