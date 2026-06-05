const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect()
    .then(() => console.log('Conectado a la base de datos PostgreSQL exitosamente'))
    .catch(err => console.error('Error conectando a la base de datos', err.stack));

module.exports = pool;
