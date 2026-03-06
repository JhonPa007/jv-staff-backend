const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Token no provisto' });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
};

// Confirmar un adelanto
router.put('/:id/confirmar', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE gastos 
             SET estado_confirmacion = 'Confirmado' 
             WHERE id = $1 AND empleado_beneficiario_id = $2 AND estado_confirmacion = 'Pendiente'
             RETURNING id`,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Adelanto no encontrado o ya procesado.' });
        }

        res.json({ message: 'Adelanto confirmado correctamente', id: result.rows[0].id });
    } catch (error) {
        console.error("Error al confirmar adelanto:", error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Rechazar un adelanto
router.put('/:id/rechazar', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE gastos 
             SET estado_confirmacion = 'Rechazado' 
             WHERE id = $1 AND empleado_beneficiario_id = $2 AND estado_confirmacion = 'Pendiente'
             RETURNING id`,
            [req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Adelanto no encontrado o ya procesado.' });
        }

        res.json({ message: 'Adelanto rechazado correctamente', id: result.rows[0].id });
    } catch (error) {
        console.error("Error al rechazar adelanto:", error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
