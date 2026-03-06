const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, empleado_beneficiario_id as emp_id, monto, fecha_gasto as fecha, estado_confirmacion as estado FROM gastos WHERE deducido_en_planilla_id IS NULL AND (estado_confirmacion = 'Pendiente' OR fecha_gasto >= '2026-03-01') ORDER BY fecha_gasto DESC LIMIT 10");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
