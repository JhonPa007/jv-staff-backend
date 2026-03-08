const pool = require('./db');

async function checkEmployees() {
    try {
        console.log('--- Todos los Empleados ---');
        const res = await pool.query("SELECT id, nombres, push_token FROM empleados ORDER BY id ASC");
        res.rows.forEach(r => {
            console.log(`ID: ${r.id}, Nombre: ${r.nombres}, Token: ${r.push_token ? 'SÍ' : 'NO'}`);
        });

        console.log('\n--- Última Reserva ---');
        const resLast = await pool.query("SELECT id, empleado_id FROM reservas ORDER BY id DESC LIMIT 1");
        if (resLast.rows.length > 0) {
            console.log(`ID Reserva: ${resLast.rows[0].id}, Asignada a ID: ${resLast.rows[0].empleado_id}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkEmployees();
