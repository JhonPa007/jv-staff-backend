const pool = require('./db');

async function checkTokens() {
    try {
        const res = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE push_token IS NOT NULL");
        console.log('--- Empleados con Token ---');
        console.table(res.rows);

        const resLast = await pool.query("SELECT id, empleado_id FROM reservas ORDER BY id DESC LIMIT 5");
        console.log('\n--- Últimas 5 Reservas ---');
        console.table(resLast.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkTokens();
