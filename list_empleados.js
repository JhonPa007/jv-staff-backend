const db = require('./db');

async function list() {
    try {
        const res = await db.query("SELECT id, nombres, apellidos, activo FROM empleados LIMIT 10");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

list();
