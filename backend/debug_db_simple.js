const pool = require('./db');

async function debug() {
    try {
        console.log('--- Empleados ---');
        const emps = await pool.query("SELECT * FROM empleados");
        console.table(emps.rows.map(r => ({ id: r.id, email: r.email, token: r.push_token ? r.push_token.substring(0, 20) + '...' : 'NULL' })));

        console.log('\n--- Reservas (últimas 3) ---');
        const res = await pool.query("SELECT * FROM reservas ORDER BY id DESC LIMIT 3");
        console.table(res.rows);

        console.log('\n--- Triggers ---');
        const trg = await pool.query("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'reservas'");
        console.table(trg.rows);

    } catch (err) {
        console.error('Error detallado:', err);
    } finally {
        pool.end();
    }
}

debug();
