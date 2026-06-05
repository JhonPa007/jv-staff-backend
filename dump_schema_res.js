const pool = require('./db');

async function dumpSchema() {
    try {
        console.log('--- Esquema de Reservas ---');
        const res = await pool.query(`
            SELECT column_name, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'reservas'
            ORDER BY ordinal_position
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

dumpSchema();
