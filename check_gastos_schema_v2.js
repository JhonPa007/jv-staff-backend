const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT table_schema, column_name FROM information_schema.columns WHERE table_name = 'gastos'");
        res.rows.forEach(r => console.log(`${r.table_schema}: ${r.column_name}`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
