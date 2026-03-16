const db = require('./db');

async function checkTriggers() {
    try {
        const res = await db.query(`
            SELECT tgname 
            FROM pg_trigger 
            JOIN pg_class ON pg_class.oid = tgrelid 
            WHERE relname = 'gastos' AND tgisinternal = false
        `);
        console.log("Custom triggers on gastos:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkTriggers();
