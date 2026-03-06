const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'gastos'");
        console.log('GASTOS COLUMNS:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
