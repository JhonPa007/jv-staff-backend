const db = require('./db');

async function test() {
    try {
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
            WHERE v.cliente_receptor_id = 1 AND v.estado = 'Completada'
              AND vi.producto_id IS NULL
            ORDER BY v.fecha_venta DESC
        `;
        const result = await db.query(query);
        console.log("SUCCESS:", result.rows.length, "rows");
    } catch (error) {
        console.log("ERROR SQL:", error.message);
    } finally {
        process.exit();
    }
}
test();
