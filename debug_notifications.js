const pool = require('./db');

async function checkNotifications() {
    try {
        console.log('--- Verificando Tabla Empleados (Todos) ---');
        const resEmpAll = await pool.query("SELECT id, nombres, email, push_token FROM empleados LIMIT 10");
        console.log('Lista de empleados:', resEmpAll.rows);

        const resEmpWithToken = await pool.query("SELECT id, nombres, email, push_token FROM empleados WHERE push_token IS NOT NULL");
        console.log('Empleados con token:', resEmpWithToken.rows);

        console.log('\n--- Verificando Últimas 5 Reservas ---');
        const resRes = await pool.query("SELECT id, start_time, estado_id FROM reservas ORDER BY id DESC LIMIT 5");
        console.log('Últimas reservas:', resRes.rows);

        console.log('\n--- Verificando Trigger ---');
        const resTrig = await pool.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'reservas';
        `);
        console.log('Triggers en reservas:', resTrig.rows);

        console.log('\n--- Verificando Función de Notificación ---');
        const resFunc = await pool.query(`
            SELECT routine_name, routine_definition 
            FROM information_schema.routines 
            WHERE routine_name = 'notify_new_reserva';
        `);
        console.log('Función notify_new_reserva:', resFunc.rows.length > 0 ? 'EXISTE' : 'NO EXISTE');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkNotifications();
