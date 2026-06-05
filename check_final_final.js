const pool = require('./db');

async function checkFinal() {
    try {
        console.log('--- Últimas 5 Reservas ---');
        const res = await pool.query("SELECT id, empleado_id FROM reservas ORDER BY id DESC LIMIT 5");
        res.rows.forEach(r => {
            console.log(`Reserva [ID: ${r.id}] -> Empleado [ID: ${r.empleado_id}]`);
        });

        console.log('\n--- Estado de Renato (ID 5) y Jhon (ID 2) ---');
        const emps = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE id IN (1, 2, 5)");
        emps.rows.forEach(e => {
            console.log(`Empleado: ${e.nombres} [ID: ${e.id}] | Token: ${e.push_token ? e.push_token.substring(0, 20) + '...' : 'SIN TOKEN'}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkFinal();
