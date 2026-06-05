const db = require('./db');

async function check() {
    try {
        const res = await db.query("SELECT id, sucursal_id, caja_sesion_id, estado_confirmacion FROM gastos ORDER BY id DESC LIMIT 5");
        console.log("Gastos:", res.rows);

        const resSesiones = await db.query("SELECT id, sucursal_id, estado FROM caja_sesiones WHERE estado = 'Abierta' ORDER BY id DESC");
        console.log("Sesiones abiertas:", resSesiones.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
