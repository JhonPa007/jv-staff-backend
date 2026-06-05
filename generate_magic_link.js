const jwt = require('jsonwebtoken');
require('dotenv').config();

const empleadoId = process.argv[2];
const expiresIn = process.argv[3] || '24h';

if (!empleadoId) {
    console.log('Uso: node generate_magic_link.js <empleado_id> [expiresIn (ej: 1h, 24h)]');
    process.exit(1);
}

const token = jwt.sign(
    { id: parseInt(empleadoId), purpose: 'magic-link' },
    process.env.JWT_SECRET,
    { expiresIn }
);

const scheme = 'mobileapp';
const link = `${scheme}://login?token=${token}`;

console.log('\n--- MAGIC LINK GENERADO ---');
console.log(`Empleado ID: ${empleadoId}`);
console.log(`Expira en: ${expiresIn}`);
console.log(`\nLink para abrir en la app:\n${link}`);
console.log('\n---------------------------\n');
