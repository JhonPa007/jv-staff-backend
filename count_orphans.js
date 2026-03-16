const db = require('./db');
async function run() {
    try {
        const res = await db.query(
            "SELECT COUNT(*) FROM gastos WHERE categoria_gasto_id = 4 AND estado_confirmacion = 'Confirmado' AND caja_sesion_id IS NULL"
        );
        console.log("Adelantos confirmados sin caja:", res.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
