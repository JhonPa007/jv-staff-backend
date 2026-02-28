const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const path = require('path');

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Route
app.get('/', (req, res) => {
    res.send('API Staff JV App is running');
});

// Import Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reservas', require('./routes/reservas'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/comisiones', require('./routes/comisiones'));
app.use('/api/produccion', require('./routes/produccion'));
app.use('/api/clientes', require('./routes/clientes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de API corriendo en el puerto ${PORT}`);
});
