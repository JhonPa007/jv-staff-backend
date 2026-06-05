const pool = require('./db');

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'empleados';
        `);
        console.log('Columnas de empleados:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkColumns();
