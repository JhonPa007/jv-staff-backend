const db = require('./db');
async function run() {
    const res = await db.query("SELECT id FROM gastos LIMIT 1");
    console.log("Found:", res.rows.length);
    process.exit();
}
run();
