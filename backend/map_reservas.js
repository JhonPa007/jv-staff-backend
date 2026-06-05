const pool = require('./db');

async function mapReservas() {
    try {
        console.log('--- Columnas de Reservas ---');
        const res = await pool.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'reservas'
            ORDER BY ordinal_position
        `);
        console.log(res.rows.map(r => r.column_name));

        console.log('\n--- Última Reserva (Data Completa) ---');
        const data = await pool.query("SELECT * FROM reservas ORDER BY id DESC LIMIT 1");
        console.log(JSON.stringify(data.rows[0], null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

mapReservas();
