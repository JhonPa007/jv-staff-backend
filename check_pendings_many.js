const db = require('./db');
async function check() {
    try {
        const res = await db.query(
            "SELECT id, caja_sesion_id, descripcion FROM gastos WHERE categoria_gasto_id = 4 AND estado_confirmacion = 'Pendiente' LIMIT 50"
        );
        console.log("Adelantos Pendientes:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
