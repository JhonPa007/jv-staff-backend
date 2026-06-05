const pool = require('./db');
const fs = require('fs');

async function dumpSchemaToFile() {
    try {
        console.log('Consultando esquema...');
        const res = await pool.query(`
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns 
            WHERE table_name = 'reservas'
            ORDER BY ordinal_position
        `);
        fs.writeFileSync('schema_reservas_debug.json', JSON.stringify(res.rows, null, 2));
        console.log('Esquema guardado en schema_reservas_debug.json');
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

dumpSchemaToFile();
