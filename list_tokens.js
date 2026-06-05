const pool = require('./db');

async function listAllTokens() {
    try {
        console.log('--- Todos los Empleados con Token ---');
        const res = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE push_token IS NOT NULL");
        if (res.rows.length === 0) {
            console.log('Nadie tiene token.');
        } else {
            res.rows.forEach(r => {
                console.log(`- ID: ${r.id}, Nombre: ${r.nombres}, Token: ${r.push_token.substring(0, 20)}...`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

listAllTokens();
