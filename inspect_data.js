const db = require('./db');

async function inspect() {
    try {
        console.log("Conectando y buscando ítems de venta...");
        const query = `
            SELECT 
                vi.id as item_id,
                v.id as venta_id,
                v.fecha_venta,
                s.nombre as servicio_nombre,
                vi.es_hora_extra,
                vi.pagado_al_empleado,
                vi.entregado_al_colaborador,
                vi.comision_servicio_extra,
                v.estado as venta_estado
            FROM venta_items vi
            JOIN ventas v ON vi.venta_id = v.id
            JOIN servicios s ON vi.servicio_id = s.id
            WHERE vi.es_hora_extra = TRUE
            ORDER BY v.fecha_venta DESC
            LIMIT 15
        `;
        const res = await db.query(query);
        console.log("Resultados:");
        res.rows.forEach(row => {
            console.log(`ID: ${row.item_id} | Servicio: ${row.servicio_nombre} | Fecha: ${row.fecha_venta.toISOString().split('T')[0]} | H.Extra: ${row.es_hora_extra} | Pagado: ${row.pagado_al_empleado} | Entregado: ${row.entregado_al_colaborador} | Comision: ${row.comision_servicio_extra} | Venta Estado: ${row.venta_estado}`);
        });
    } catch (e) {
        console.error("Error al inspeccionar datos:", e);
    } finally {
        await db.end();
    }
}

inspect();
