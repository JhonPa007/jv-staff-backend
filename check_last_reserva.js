const pool = require('./db');

async function checkLastReserva() {
    try {
        console.log('--- Última Reserva ---');
        const resRes = await pool.query("SELECT id, empleado_id, start_time, cliente_id FROM reservas ORDER BY id DESC LIMIT 1");
        if (resRes.rows.length === 0) {
            console.log('No hay reservas.');
            return;
        }
        const lastRes = resRes.rows[0];
        console.log('Última reserva:', lastRes);

        console.log('\n--- Empleado de la Reserva ---');
        const resEmp = await pool.query("SELECT id, nombres, email, push_token FROM empleados WHERE id = $1", [lastRes.empleado_id]);
        if (resEmp.rows.length > 0) {
            const emp = resEmp.rows[0];
            console.log('Empleado:', {
                id: emp.id,
                nombres: emp.nombres,
                email: emp.email,
                hasToken: !!emp.push_token,
                token: emp.push_token ? emp.push_token.substring(0, 20) + '...' : 'NULL'
            });
        } else {
            console.log('Empleado no encontrado con ID:', lastRes.empleado_id);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkLastReserva();
