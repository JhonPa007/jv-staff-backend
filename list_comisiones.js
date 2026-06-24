const db = require('./db');

async function list() {
    try {
        const res = await db.query("SELECT empleado_id, COUNT(*) FROM comisiones GROUP BY empleado_id");
        console.log("Comisiones agrupadas por empleado_id:");
        console.log(JSON.stringify(res.rows, null, 2));

        const resHE = await db.query("SELECT v.empleado_id, COUNT(*) FROM venta_items vi JOIN ventas v ON vi.venta_id = v.id WHERE vi.es_hora_extra = TRUE GROUP BY v.empleado_id");
        console.log("Horas extras en venta_items agrupadas por empleado_id:");
        console.log(JSON.stringify(resHE.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

list();
