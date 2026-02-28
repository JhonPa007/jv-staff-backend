const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

// Función que emula check_password_hash de Werkzeug (scrypt)
function checkPasswordHash(pwhash, password) {
    if (!pwhash || !pwhash.startsWith('scrypt:')) return false;

    // El formato de pwhash es: scrypt:N:r:p$salt$hash
    const parts = pwhash.split('$');
    if (parts.length !== 3) return false;

    const methodAndParams = parts[0].split(':');
    const N = parseInt(methodAndParams[1], 10);
    const r = parseInt(methodAndParams[2], 10);
    const p = parseInt(methodAndParams[3], 10);
    const salt = parts[1];
    const actualHash = parts[2];

    try {
        // En Node.js, scrpytSync por defecto tiene un maxmem de 32MB. Werkzeug N=32768,r=8 ocupa ~33MB. 
        // Aumentamos maxmem a 64MB para evitar RangeError. El hash resultante es Hex.
        const derivedKey = crypto.scryptSync(password, salt, actualHash.length / 2, {
            N, r, p,
            maxmem: 64 * 1024 * 1024
        }).toString('hex');

        return crypto.timingSafeEqual(Buffer.from(derivedKey), Buffer.from(actualHash));
    } catch (e) {
        console.error("Error criptográfico:", e);
        return false;
    }
}

// Login de Empleados
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    try {
        // Buscar empleado por email
        const result = await db.query(
            "SELECT id, nombres, apellidos, rol_id, password FROM empleados WHERE email = $1 AND activo = true",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
        }

        const user = result.rows[0];

        const isMatch = checkPasswordHash(user.password, password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, rol_id: user.rol_id, nombre: user.nombres },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Expira en 7 días
        );

        res.json({
            message: 'Autenticación exitosa',
            token,
            user: {
                id: user.id,
                nombres: user.nombres,
                apellidos: user.apellidos,
                rol_id: user.rol_id
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
