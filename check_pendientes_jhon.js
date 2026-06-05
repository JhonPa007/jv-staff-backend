const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, monto, fecha, estado_confirmacion FROM gastos WHERE empleado_beneficiario_id = 2 AND estado_confirmacion = 'Pendiente'");
        console.log("ADELANTOS PENDIENTES JHON:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
