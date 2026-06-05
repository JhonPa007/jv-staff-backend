const db = require('./db');
async function check() {
    try {
        const res = await db.query("SELECT concepto, monto FROM movimientos_caja WHERE tipo = 'EGRESO' ORDER BY id DESC LIMIT 5");
        console.log("Egresos:", res.rows);

        const resGastos = await db.query("SELECT descripcion, monto FROM gastos WHERE caja_sesion_id IS NOT NULL ORDER BY id DESC LIMIT 5");
        console.log("Gastos con caja:", resGastos.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
