const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 21, rol: 'Colaborador' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/comisiones/billetera?fecha_inicio=2026-03-01&fecha_fin=2026-03-31',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            console.log('STATUS:', res.statusCode);
            const parsedData = JSON.parse(rawData);
            console.log(parsedData);
        } catch (e) {
            console.error(e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
