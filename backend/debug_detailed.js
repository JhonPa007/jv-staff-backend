const pool = require('./db');

async function debugDetailed() {
    try {
        console.log('--- Columnas de Reservas ---');
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reservas'");
        console.log('Columnas:', cols.rows.map(r => r.column_name));

        console.log('\n--- Últimas 2 Reservas ---');
        const reservas = await pool.query("SELECT * FROM reservas ORDER BY id DESC LIMIT 2");
        if (reservas.rows.length > 0) {
            console.table(reservas.rows);

            for (const res of reservas.rows) {
                console.log(`\n--- Empleado para Reserva ID: ${res.id} (Empleado ID: ${res.empleado_id}) ---`);
                const emp = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE id = $1", [res.empleado_id]);
                if (emp.rows.length > 0) {
                    console.table(emp.rows.map(e => ({
                        id: e.id,
                        nombres: e.nombres,
                        hasToken: !!e.push_token,
                        token: e.push_token ? e.push_token.substring(0, 20) + '...' : 'NULL'
                    })));
                } else {
                    console.log('No se encontró empleado.');
                }
            }
        } else {
            console.log('No hay reservas.');
        }

    } catch (err) {
        console.error('Error durante la depuración:', err);
    } finally {
        pool.end();
    }
}

debugDetailed();
