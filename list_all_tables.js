const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(res.rows.map(r => r.table_name).join('\n'));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
