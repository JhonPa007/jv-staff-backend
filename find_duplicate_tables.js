const pool = require('./db');

async function findTables() {
    try {
        console.log('--- Buscando Tablas "reservas" ---');
        const res = await pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name = 'reservas'
        `);
        console.table(res.rows);

        for (const row of res.rows) {
            console.log(`\nColumnas en ${row.table_schema}.${row.table_name}:`);
            const cols = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'reservas' AND table_schema = $1
            `, [row.table_schema]);
            console.log(cols.rows.map(r => r.column_name).join(', '));
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

findTables();
