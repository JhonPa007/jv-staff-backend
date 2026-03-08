const pool = require('./db');

async function mapSchema() {
    try {
        console.log('--- Mapeando Esquema de Producción ---');
        const tables = ['empleados', 'reservas'];
        for (const table of tables) {
            console.log(`\nTabla: ${table}`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            console.log('Columnas:', res.rows.map(r => r.column_name).join(', '));
        }
    } catch (err) {
        console.error('Error mapeando esquema:', err);
    } finally {
        pool.end();
    }
}

mapSchema();
