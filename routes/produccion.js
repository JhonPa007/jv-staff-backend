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

// Obtener Reporte de Producción por Colaborador
router.get('/', verifyToken, async (req, res) => {
    const empleadoId = req.user.id;
    // Fechas por defecto: hoy
    const today = new Date().toISOString().split('T')[0];
    const fechaInicio = req.query.fecha_inicio || today;
    const fechaFin = req.query.fecha_fin || today;

    try {
        // 1. Resumen: Valores Agrupados
        // Se asume Prod. Base = sum(valor_produccion) de vi donde es_extra=false
        // Venta Productos = sum(subtotal_item_neto) donde producto_id no es nulo
        // Fondo Fidelidad = (En esta estructura, podemos omitirlo o retornar 0 por ahora, asumiendo sum de fondo)
        // Comisiones = sum(monto_comision) de tabla comisiones

        // Query Resumen Produccion + Productos
        const resumenQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN vi.producto_id IS NULL THEN vi.subtotal_item_neto ELSE 0 END), 0) as prod_base,
                COALESCE(SUM(CASE WHEN vi.producto_id IS NOT NULL THEN vi.subtotal_item_neto ELSE 0 END), 0) as venta_productos
            FROM venta_items vi
            JOIN ventas v ON vi.venta_id = v.id
            WHERE v.empleado_id = $1 
            AND DATE(v.fecha_venta) BETWEEN $2 AND $3
            AND v.estado = 'Completada'
        `;
        const resumenResult = await db.query(resumenQuery, [empleadoId, fechaInicio, fechaFin]);

        // Query Comisiones Generadas en el rango (usamos fecha_generacion de tabla comisiones)
        const comisionesQuery = `
            SELECT COALESCE(SUM(monto_comision), 0) as total_comisiones
            FROM comisiones
            WHERE empleado_id = $1
            AND DATE(fecha_generacion) BETWEEN $2 AND $3
        `;
        const comisionesResult = await db.query(comisionesQuery, [empleadoId, fechaInicio, fechaFin]);

        const resumen = {
            prod_base: Number(resumenResult.rows[0].prod_base),
            venta_productos: Number(resumenResult.rows[0].venta_productos),
            fondo_fidelidad: 0, // Placeholder
            comisiones_generadas: Number(comisionesResult.rows[0].total_comisiones)
        };

        // 2. Detalle de Servicios Realizados
        // Solo items que sean servicios (producto_id IS NULL)
        const detalleQuery = `
            SELECT 
                v.id as venta_id,
                v.fecha_venta as fecha,
                COALESCE(c.razon_social_nombres || ' ' || COALESCE(c.apellidos, ''), 'Cliente General') as cliente,
                s.nombre as servicio,
                vi.subtotal_item_neto as valor,
                CASE WHEN vi.es_extra = true OR vi.es_hora_extra = true THEN 'Extra' ELSE 'Normal' END as tipo
            FROM venta_items vi
            JOIN ventas v ON vi.venta_id = v.id
            LEFT JOIN clientes c ON v.cliente_receptor_id = c.id
            JOIN servicios s ON vi.servicio_id = s.id
            WHERE v.empleado_id = $1
            AND vi.producto_id IS NULL
            AND DATE(v.fecha_venta) BETWEEN $2 AND $3
            AND v.estado = 'Completada'
            ORDER BY v.fecha_venta DESC
        `;

        const detalleResult = await db.query(detalleQuery, [empleadoId, fechaInicio, fechaFin]);

        res.json({
            resumen,
            detalle: detalleResult.rows
        });

    } catch (error) {
        console.error("Error obteniendo reporte de producción:", error);
        res.status(500).json({ error: 'Error al obtener reporte de producción' });
    }
});

module.exports = router;
