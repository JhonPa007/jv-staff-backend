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

// Función auxiliar para obtener días del mes
const buildPayrollObject = (baseInfo, sueldoMinimoVital, comisionesResult, gastadoResult, bonosResult, penalidadesResult, fraccionSueldoBase) => {
    const { tipo_contrato, configuracion_comision } = baseInfo;

    // Comisiones por Producción
    const ventaPagable = Number(comisionesResult.rows[0]?.venta_pagable || 0);
    const detalleVentas = comisionesResult.rows; // Asignaremos el desglose

    let comisionProduccion = 0;

    if (tipo_contrato === 'MIXTO' && configuracion_comision) {
        const meta = Number(configuracion_comision.meta || 0);
        const porcentaje = Number(configuracion_comision.porcentaje || 0);
        if (ventaPagable > meta) {
            comisionProduccion = (ventaPagable - meta) * (porcentaje / 100);
        }
    } else if (tipo_contrato === 'ESCALA' && configuracion_comision && configuracion_comision.tramos) {
        const tramos = configuracion_comision.tramos;
        let porcentajeAplicable = 0;
        // La escala evalúa el avance total (En Billetera es el total del periodo actual)
        for (let i = 0; i < tramos.length; i++) {
            if (ventaPagable >= tramos[i].min && (tramos[i].max === null || ventaPagable <= tramos[i].max)) {
                porcentajeAplicable = Number(tramos[i].porcentaje || 0);
                break;
            }
        }
        comisionProduccion = ventaPagable * (porcentajeAplicable / 100);
    }

    const totalBonos = Number(bonosResult.rows[0]?.total_bonos || 0);
    const totalPenalidades = Number(penalidadesResult.rows[0]?.total_penalidades || 0);
    const totalAdelantos = Number(gastadoResult.rows[0]?.total_adelantos || 0);

    const smv = Number(sueldoMinimoVital || 0);
    let reintegroSmv = 0;

    const ingresoBaseMasComision = fraccionSueldoBase + comisionProduccion;

    if (ingresoBaseMasComision > 0 && ingresoBaseMasComision < smv) {
        reintegroSmv = smv - ingresoBaseMasComision;
    }

    if (tipo_contrato === 'ESCALA' && fraccionSueldoBase === 0 && comisionProduccion === 0 && totalBonos === 0) {
        reintegroSmv = 0; // Si no produjo y es solo comisión, normalmente no hay reintegro si no hay asistencia, pero seguimos la fórmula
    }

    const saldoNeto = ingresoBaseMasComision + totalBonos - totalPenalidades + reintegroSmv - totalAdelantos;

    return {
        saldoNeto: saldoNeto,
        desglose: {
            sueldoBaseProporcional: fraccionSueldoBase,
            ventaPagableRealizada: ventaPagable,
            comisionesCalculadas: comisionProduccion,
            bonos: totalBonos,
            penalidades: totalPenalidades,
            reintegroSMV: reintegroSmv,
            adelantos: totalAdelantos
        },
        // Mantenemos la estructura compatible requerida por el frontend antiguo por el momento
        comisiones: comisionesResult.rows || [],
        adelantos: [], // Si quisiéramos listar el detalle, haríamos otra query. Dejamos vacío o llenamos si el front lo usa.
        totalComisiones: comisionProduccion,
        totalAdelantos: totalAdelantos
    };
};

// Obtener Resumen de Billetera (Sueldo Neto a Pagar real)
router.get('/billetera', verifyToken, async (req, res) => {
    const empleadoId = req.user.id;
    const { fecha_inicio, fecha_fin } = req.query; // Para soportar rangos si el frontend los envía

    try {
        // Obtenemos los datos base del empleado
        const empQuery = `SELECT tipo_contrato, sueldo_base, configuracion_comision FROM empleados WHERE id = $1`;
        const empResult = await db.query(empQuery, [empleadoId]);
        if (empResult.rows.length === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
        const baseInfo = empResult.rows[0];

        // Obtenemos el SMV
        const sysQuery = `SELECT sueldo_minimo_vital FROM configuracion_sistema LIMIT 1`;
        const sysResult = await db.query(sysQuery);
        const smv = sysResult.rows[0]?.sueldo_minimo_vital || 0;

        // Construimos filtro de fechas si se envía
        let fraccionSueldoBase = 0;
        let dateFilterVentas = '';
        let dateFilterOtros = '';
        let paramsVentas = [empleadoId];
        let paramsOtros = [empleadoId];

        if (fecha_inicio && fecha_fin) {
            dateFilterVentas = ` AND DATE(v.fecha_venta) BETWEEN $2 AND $3`;
            dateFilterOtros = ` AND DATE(fecha) BETWEEN $2 AND $3`; // asumiendo columna 'fecha'
            paramsVentas.push(fecha_inicio, fecha_fin);
            paramsOtros.push(fecha_inicio, fecha_fin);

            const hoy = new Date();
            // Evitar problemas de timezone ajustando las horas
            const inicio = new Date(fecha_inicio + 'T00:00:00');
            const fin = new Date(fecha_fin + 'T23:59:59');

            // Lógica de prorrateo
            if (baseInfo.tipo_contrato === 'FIJO' || baseInfo.tipo_contrato === 'MIXTO') {
                const diasMes = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();

                if (hoy >= inicio && hoy <= fin) {
                    // Mes actual, prorrateado a los días transcurridos
                    fraccionSueldoBase = (Number(baseInfo.sueldo_base || 0) / diasMes) * hoy.getDate();
                } else if (hoy > fin) {
                    // Mes pasado, asume que trabajó todo el mes
                    fraccionSueldoBase = Number(baseInfo.sueldo_base || 0);
                } else {
                    // Mes futuro
                    fraccionSueldoBase = 0;
                }
            }
        } else {
            // Comportamiento por defecto antiguo
            if (baseInfo.tipo_contrato === 'FIJO' || baseInfo.tipo_contrato === 'MIXTO') {
                fraccionSueldoBase = Number(baseInfo.sueldo_base || 0);
            }
        }

        // 1. Obtener la Suma Total de lo vendido ("La Producción") pendiente
        const comisionesQuery = `
            SELECT 
                COALESCE(SUM(vi.subtotal_item_neto), 0) as venta_pagable
            FROM ventas v
            JOIN venta_items vi ON v.id = vi.venta_id
            WHERE v.empleado_id = $1 
            AND v.estado != 'Anulada' 
            AND v.pago_nomina_id IS NULL
            ${dateFilterVentas}
        `;
        const comisionesResult = await db.query(comisionesQuery, paramsVentas);

        // 1.b Obtener el detalle de comisiones para la lista de la UI (ingresos)
        const detalleIngresosQuery = `
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
        const detalleIngresosResult = await db.query(detalleIngresosQuery, [empleadoId]);

        // 2. Obtener Adelantos pendientes
        const adelantosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_adelantos
            FROM gastos 
            WHERE empleado_beneficiario_id = $1 
            AND deducido_en_planilla_id IS NULL
            ${dateFilterOtros}
        `;
        const adelantosResult = await db.query(adelantosQuery, paramsOtros);

        // 2.b Obtener detalle de adelantos para la lista de la UI
        const detalleAdelantosQuery = `
            SELECT id, monto, fecha, descripcion
            FROM gastos 
            WHERE empleado_beneficiario_id = $1 AND deducido_en_planilla_id IS NULL
            ORDER BY fecha DESC
        `;
        const detalleAdelantosResult = await db.query(detalleAdelantosQuery, [empleadoId]);

        // 3. Obtener Bonos pendientes
        const bonosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_bonos
            FROM empleado_bonos 
            WHERE empleado_id = $1 
            AND deducido_en_planilla_id IS NULL
            ${dateFilterOtros}
        `;
        const bonosResult = await db.query(bonosQuery, paramsOtros);

        // 4. Obtener Penalidades pendientes
        const penalidadesQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_penalidades
            FROM empleado_penalidades 
            WHERE empleado_id = $1 
            AND deducido_en_planilla_id IS NULL
            ${dateFilterOtros}
        `;
        const penalidadesResult = await db.query(penalidadesQuery, paramsOtros);

        const billeteraData = buildPayrollObject(
            baseInfo,
            smv,
            comisionesResult,
            adelantosResult,
            bonosResult,
            penalidadesResult,
            fraccionSueldoBase
        );

        // Asignamos las listas detalladas para mantener la compatibilidad con el frontend
        billeteraData.comisiones = detalleIngresosResult.rows;
        billeteraData.adelantos = detalleAdelantosResult.rows;

        res.json(billeteraData);

    } catch (error) {
        console.error("Error obteniendo billetera:", error);
        res.status(500).json({ error: 'Error al calcular la billetera' });
    }
});

module.exports = router;
