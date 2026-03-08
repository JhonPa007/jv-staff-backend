const pool = require('./db');

async function checkTokensDetailed() {
    try {
        console.log('--- Empleados con Token ---');
        const resEmp = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE push_token IS NOT NULL");
        resEmp.rows.forEach(r => {
            console.log(`ID: ${r.id}, Nombre: ${r.nombres}, Token: ${r.push_token.substring(0, 30)}...`);
        });

        console.log('\n--- Últimas 5 Reservas ---');
        const resLast = await pool.query("SELECT id, empleado_id, start_time FROM reservas ORDER BY id DESC LIMIT 5");
        resLast.rows.forEach(r => {
            console.log(`Reserva ID: ${r.id}, Empleado ID: ${r.empleado_id}, Hora: ${r.start_time}`);
        });

        const loggedInToken = 'ExponentPushToken[DXUz54KhGfYv-qcspLrYGD]';
        console.log(`\n--- ¿Quién tiene el token de los logs? (${loggedInToken.substring(0, 20)}...) ---`);
        const resLog = await pool.query("SELECT id, nombres FROM empleados WHERE push_token = $1", [loggedInToken]);
        if (resLog.rows.length > 0) {
            console.log(`Pertenece a: ${resLog.rows[0].nombres} (ID: ${resLog.rows[0].id})`);
        } else {
            console.log('Nadie tiene ese token en la DB actualmente.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkTokensDetailed();
