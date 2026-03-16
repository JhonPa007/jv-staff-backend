const db = require('./db');
async function check() {
    try {
        const res = await db.query("SELECT * FROM movimientos_caja ORDER BY id DESC LIMIT 5");
        console.log("Movimientos:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
