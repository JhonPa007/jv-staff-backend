const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware para verificar TOKEN JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Token no provisto' });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
};

// Historial de un cliente
router.get('/:id/historial', verifyToken, async (req, res) => {
    const clienteId = req.params.id;

    try {
        // Obtenemos los últimos servicios del cliente
        const query = `
            SELECT 
                v.id as venta_id,
                v.fecha_venta as fecha,
                s.nombre as servicio,
                vi.subtotal_item_neto as valor,
                EMP.nombres as barbero
            FROM ventas v
            JOIN venta_items vi ON v.id = vi.venta_id
            JOIN servicios s ON vi.servicio_id = s.id
            JOIN empleados EMP ON v.empleado_id = EMP.id
            WHERE v.cliente_receptor_id = $1 AND v.estado = 'Completada'
              AND vi.producto_id IS NULL
            ORDER BY v.fecha_venta DESC
        `;
        const result = await db.query(query, [clienteId]);

        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo historial de cliente:", error);
        res.status(500).json({ error: 'Error al obtener historial del cliente' });
    }
});

module.exports = router;
