const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM gastos LIMIT 1");
        console.log(Object.keys(res.rows[0]).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
