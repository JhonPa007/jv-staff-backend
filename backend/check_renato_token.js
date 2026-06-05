const pool = require('./db');
async function run() {
    const res = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE id = 5");
    console.log(JSON.stringify(res.rows[0], null, 2));
    pool.end();
}
run();
