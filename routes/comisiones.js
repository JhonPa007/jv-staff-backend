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
const buildPayrollObject = (baseInfo, comisionesResult, gastadoResult, bonosResult, penalidadesResult, fraccionSueldoBase) => {
    const { tipo_contrato, configuracion_comision } = baseInfo;

    // Totales de Producción
    const ventaServicios = Number(comisionesResult.rows[0]?.venta_servicios || 0);
    const ventaProductos = Number(comisionesResult.rows[0]?.venta_productos || 0);

    // Las comisiones de productos ya vienen calculadas individualmente en la tabla comisiones (detalleVentas)
    // Pero para el resumen escalonado, el % solo aplica a servicios.
    const comisionesProductosFijas = Number(comisionesResult.rows[0]?.comisiones_productos_fijas || 0);

    let comisionProduccion = 0;

    if (tipo_contrato === 'MIXTO' && configuracion_comision) {
        const meta = Number(configuracion_comision.meta || 0);
        const porcentaje = Number(configuracion_comision.porcentaje || 0);
        if (ventaServicios > meta) {
            comisionProduccion = (ventaServicios - meta) * (porcentaje / 100);
        }
    } else if ((tipo_contrato === 'ESCALA' || tipo_contrato === 'ESCALONADA') && configuracion_comision && configuracion_comision.tramos) {
        const tramos = configuracion_comision.tramos;
        let porcentajeAplicable = 0;
        // La escala evalúa el avance total de SERVICIOS
        for (let i = 0; i < tramos.length; i++) {
            if (ventaServicios >= tramos[i].min && (tramos[i].max === null || ventaServicios <= tramos[i].max)) {
                porcentajeAplicable = Number(tramos[i].pct || tramos[i].porcentaje || 0);
                break;
            }
        }
        comisionProduccion = ventaServicios * (porcentajeAplicable / 100);
    }

    // Sumamos las comisiones de productos (que son S/ 3, S/ 5, etc. fijos) al total de comisiones
    const totalComisionesCalculadas = comisionProduccion + comisionesProductosFijas;

    const totalBonos = Number(bonosResult.rows[0]?.total_bonos || 0);
    const totalPenalidades = Number(penalidadesResult.rows[0]?.total_penalidades || 0);
    const totalAdelantos = Number(gastadoResult.rows[0]?.total_adelantos || 0);

    // Eliminamos lógica de SMV (Billetera Informativa)
    const reintegroSmv = 0;

    const saldoNeto = fraccionSueldoBase + totalComisionesCalculadas + totalBonos - totalPenalidades - totalAdelantos;

    return {
        saldoNeto: saldoNeto,
        desglose: {
            sueldoBaseProporcional: fraccionSueldoBase,
            ventaServicios: ventaServicios,
            ventaProductos: ventaProductos,
            comisionesCalculadas: totalComisionesCalculadas,
            bonos: totalBonos,
            penalidades: totalPenalidades,
            reintegroSMV: reintegroSmv,
            adelantos: totalAdelantos
        },
        comisiones: [], // Se llenará con el detalle si es necesario
        totalComisiones: totalComisionesCalculadas,
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
        let dateFilterBonosPenalidades = '';
        let paramsVentas = [empleadoId];
        let paramsOtros = [empleadoId];

        let dateFilterDetalleIngresos = '';

        if (fecha_inicio && fecha_fin) {
            dateFilterVentas = ` AND DATE(v.fecha_venta) BETWEEN $2 AND $3`;
            dateFilterOtros = ` AND DATE(fecha) BETWEEN $2 AND $3`; // Para tabla 'gastos'
            dateFilterBonosPenalidades = ` AND DATE(fecha_registro) BETWEEN $2 AND $3`; // Para bonos y penalidades
            dateFilterDetalleIngresos = ` AND DATE(c.fecha_generacion) BETWEEN $2 AND $3`;
            paramsVentas.push(fecha_inicio, fecha_fin);
            paramsOtros.push(fecha_inicio, fecha_fin);

            const hoy = new Date();

            // Extraer de string YYYY-MM-DD
            const [yearInicio, monthInicio, dayInicio] = fecha_inicio.split('-').map(Number);
            const [yearFin, monthFin, dayFin] = fecha_fin.split('-').map(Number);

            // Al crear date con new Date(year, monthIndex, day) usa local timezone
            const inicio = new Date(yearInicio, monthInicio - 1, dayInicio, 0, 0, 0);
            const fin = new Date(yearFin, monthFin - 1, dayFin, 23, 59, 59);

            // Lógica de prorrateo
            if (baseInfo.tipo_contrato === 'FIJO' || baseInfo.tipo_contrato === 'MIXTO') {
                // Obtener total de días del mes evaluado
                const diasMes = new Date(yearInicio, monthInicio, 0).getDate();

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

        // 1. Obtener la Suma Total de lo vendido ("La Producción") separando servicios y productos
        const comisionesQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN vi.servicio_id IS NOT NULL THEN vi.subtotal_item_neto ELSE 0 END), 0) as venta_servicios,
                COALESCE(SUM(CASE WHEN vi.producto_id IS NOT NULL THEN vi.subtotal_item_neto ELSE 0 END), 0) as venta_productos,
                COALESCE(SUM(c.monto_comision), 0) as comisiones_productos_fijas
            FROM ventas v
            JOIN venta_items vi ON v.id = vi.venta_id
            LEFT JOIN comisiones c ON vi.id = c.venta_item_id AND vi.producto_id IS NOT NULL
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
            ${dateFilterDetalleIngresos}
            ORDER BY c.fecha_generacion DESC
        `;
        const detalleIngresosResult = await db.query(detalleIngresosQuery, paramsOtros);

        // 2. Obtener Adelantos CONFIRMADOS para restar del saldo
        const adelantosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_adelantos
            FROM gastos 
            WHERE empleado_beneficiario_id = $1 
            AND deducido_en_planilla_id IS NULL
            AND estado_confirmacion = 'Confirmado'
            ${dateFilterOtros}
        `;
        const adelantosResult = await db.query(adelantosQuery, paramsOtros);

        // 2.b Obtener detalle de adelantos para la lista de la UI (Todos los del mes)
        const detalleAdelantosQuery = `
            SELECT id, monto, fecha, descripcion, estado_confirmacion
            FROM gastos 
            WHERE empleado_beneficiario_id = $1 AND deducido_en_planilla_id IS NULL
            ${dateFilterOtros}
            ORDER BY fecha DESC
        `;
        const detalleAdelantosResult = await db.query(detalleAdelantosQuery, paramsOtros);

        // 2.c Obtener SOLAMENTE los adelantos pendientes globales (sin filtro de fecha) para las Alertas
        const adelantosPendientesQuery = `
            SELECT id, monto, fecha, descripcion, estado_confirmacion
            FROM gastos
            WHERE empleado_beneficiario_id = $1 AND deducido_en_planilla_id IS NULL
            AND estado_confirmacion = 'Pendiente'
            ORDER BY fecha DESC
        `;
        const adelantosPendientesResult = await db.query(adelantosPendientesQuery, [empleadoId]);

        // 3. Obtener Bonos pendientes
        const bonosQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_bonos
            FROM empleado_bonos 
            WHERE empleado_id = $1 
            AND deducido_en_planilla_id IS NULL
            ${dateFilterBonosPenalidades}
        `;
        const bonosResult = await db.query(bonosQuery, paramsOtros);

        // 4. Obtener Penalidades pendientes
        const penalidadesQuery = `
            SELECT COALESCE(SUM(monto), 0) as total_penalidades
            FROM empleado_penalidades 
            WHERE empleado_id = $1 
            AND deducido_en_planilla_id IS NULL
            ${dateFilterBonosPenalidades}
        `;
        const penalidadesResult = await db.query(penalidadesQuery, paramsOtros);

        // Enviamos el objeto final
        const payroll = buildPayrollObject(baseInfo, comisionesResult, gastadoResult, bonosResult, penalidadesResult, fraccionSueldoBase);

        // Agregar el detalle al objeto final para los tabs
        payroll.comisiones = detalleIngresosResult.rows;
        payroll.adelantos = detalleAdelantosResult.rows;
        payroll.adelantosPendientes = adelantosPendientesResult.rows;

        res.json(payroll);

    } catch (error) {
        console.error("Error obteniendo billetera:", error);
        res.status(500).json({ error: 'Error al calcular la billetera' });
    }
});

module.exports = router;
