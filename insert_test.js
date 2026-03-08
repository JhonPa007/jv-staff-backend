const pool = require('./db');

async function insertDummy() {
    try {
        console.log('Insertando reserva de prueba para Renato (ID 5)...');
        // Usando los nombres de columna REALES: fecha_hora_inicio, fecha_hora_fin, estado (VARCHAR), sucursal_id, etc.
        const res = await pool.query(`
            INSERT INTO reservas (empleado_id, cliente_id, fecha_hora_inicio, fecha_hora_fin, servicio_id, sucursal_id, estado, origen)
            VALUES (5, 1048, NOW(), NOW() + interval '1 hour', 1, 1, 'Confirmada', 'TEST')
            RETURNING id;
        `);
        console.log('Reserva insertada con ID:', res.rows[0].id);
    } catch (err) {
        console.error('Error insertando dummy:', err.message);
    } finally {
        pool.end();
    }
}

insertDummy();
