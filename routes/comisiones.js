const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware para verificar TOKEN JWT (Debería extraerse a un archivo middlewares/auth.js en refactor futuro)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Token no provisto' });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
};

// Obtener Comisiones del Empleado
router.get('/', verifyToken, async (req, res) => {
    const empleadoId = req.user.id;
    // Opcional: Recibir fechas desde query params
    const { fecha_inicio, fecha_fin } = req.query;

    try {
        let query = `
            SELECT 
                c.id,
                c.monto_comision,
                c.porcentaje,
                c.estado,
                c.fecha_generacion as fecha,
                v.fecha_venta,
                COALESCE(
                    CASE 
                        WHEN p.nombre IS NOT NULL AND m.nombre IS NOT NULL THEN m.nombre || ' ' || p.nombre
                        WHEN p.nombre IS NOT NULL THEN p.nombre
                        ELSE NULL 
                    END, 
                    s.nombre, 
                    'Servicio/Producto'
                ) as servicio_nombre
            FROM comisiones c
            LEFT JOIN venta_items vi ON c.venta_item_id = vi.id
            LEFT JOIN ventas v ON vi.venta_id = v.id
            LEFT JOIN servicios s ON vi.servicio_id = s.id
            LEFT JOIN productos p ON vi.producto_id = p.id
            LEFT JOIN marcas m ON p.marca_id = m.id
            WHERE c.empleado_id = $1
        `;
        let params = [empleadoId];

        if (fecha_inicio && fecha_fin) {
            query += ` AND c.fecha_generacion BETWEEN $2 AND $3`;
            params.push(fecha_inicio, fecha_fin);
        }

        query += ` ORDER BY c.fecha_generacion DESC LIMIT 50`;

        const result = await db.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error("Error obteniendo comisiones:", error);
        res.status(500).json({ error: 'Error al obtener las comisiones' });
    }
});

// Obtener Resumen de Billetera (Sueldo Neto = Comisiones Pendientes - Adelantos)
router.get('/billetera', verifyToken, async (req, res) => {
    const empleadoId = req.user.id;

    try {
        // 1. Obtener Comisiones Pendientes
        const comisionesQuery = `
            SELECT 
                c.id, c.monto_comision, c.fecha_generacion as fecha,
                COALESCE(
                    CASE 
                        WHEN p.nombre IS NOT NULL AND m.nombre IS NOT NULL THEN m.nombre || ' ' || p.nombre
                        WHEN p.nombre IS NOT NULL THEN p.nombre
                        ELSE NULL 
                    END, 
                    s.nombre, 
                    'Servicio/Producto'
                ) as descripcion
            FROM comisiones c
            LEFT JOIN venta_items vi ON c.venta_item_id = vi.id
            LEFT JOIN ventas v ON vi.venta_id = v.id
            LEFT JOIN servicios s ON vi.servicio_id = s.id
            LEFT JOIN productos p ON vi.producto_id = p.id
            LEFT JOIN marcas m ON p.marca_id = m.id
            WHERE c.empleado_id = $1 AND c.estado = 'Pendiente'
            ORDER BY c.fecha_generacion DESC
        `;
        const comisionesResult = await db.query(comisionesQuery, [empleadoId]);
        const comisiones = comisionesResult.rows;
        const totalComisiones = comisiones.reduce((sum, item) => sum + parseFloat(item.monto_comision || 0), 0);

        // 2. Obtener Adelantos No Retenidos
        const adelantosQuery = `
            SELECT id, monto, fecha, descripcion
            FROM gastos 
            WHERE empleado_beneficiario_id = $1 AND deducido_en_planilla_id IS NULL
            ORDER BY fecha DESC
        `;
        const adelantosResult = await db.query(adelantosQuery, [empleadoId]);
        const adelantos = adelantosResult.rows;
        const totalAdelantos = adelantos.reduce((sum, item) => sum + parseFloat(item.monto || 0), 0);

        // 3. Calcular Saldo Neto
        const saldoNeto = totalComisiones - totalAdelantos;

        res.json({
            comisiones,
            adelantos,
            totalComisiones,
            totalAdelantos,
            saldoNeto
        });

    } catch (error) {
        console.error("Error obteniendo billetera:", error);
        res.status(500).json({ error: 'Error al calcular la billetera' });
    }
});

module.exports = router;
