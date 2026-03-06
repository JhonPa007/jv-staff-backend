const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const tables = ['gastos', 'empleado_bonos', 'empleado_penalidades'];
        for (const table of tables) {
            const res = await client.query("SELECT * FROM " + table + " LIMIT 1");
            console.log(`--- ${table} ---`);
            if (res.rows[0]) {
                console.log(Object.keys(res.rows[0]).join(', '));
            } else {
                const schema = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", [table]);
                console.log(schema.rows.map(r => r.column_name).join(', '));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
