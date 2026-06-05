const db = require('./db');
async function run() {
    try {
        const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(res.rows.map(t => t.table_name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
