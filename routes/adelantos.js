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
        // 1. Buscar la sucursal del adelanto
        const gastoRes = await db.query('SELECT sucursal_id FROM gastos WHERE id = $1', [req.params.id]);
        if (gastoRes.rowCount === 0) {
            return res.status(404).json({ error: 'Adelanto no encontrado.' });
        }
        const sucursalId = gastoRes.rows[0].sucursal_id;

        // 2. Buscar sesión de caja abierta en esa sucursal
        const sesionRes = await db.query(
            "SELECT id FROM caja_sesiones WHERE sucursal_id = $1 AND estado = 'Abierta' ORDER BY id DESC LIMIT 1",
            [sucursalId]
        );

        if (sesionRes.rowCount === 0) {
            return res.status(400).json({
                error: 'No se puede confirmar el adelanto porque no hay una sesión de caja abierta en esta sucursal.'
            });
        }

        const cajaSesionId = sesionRes.rows[0].id;

        // 3. Actualizar el gasto con el nuevo estado y el caja_sesion_id
        const result = await db.query(
            `UPDATE gastos 
             SET estado_confirmacion = 'Confirmado', caja_sesion_id = $1 
             WHERE id = $2 AND empleado_beneficiario_id = $3 AND estado_confirmacion = 'Pendiente'
             RETURNING id`,
            [cajaSesionId, req.params.id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Adelanto no encontrado, ya procesado o no eres el beneficiario.' });
        }

        res.json({
            message: 'Adelanto confirmado correctamente y cargado a la caja',
            id: result.rows[0].id,
            caja_sesion_id: cajaSesionId
        });
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
