const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        console.log("--- EMLEADOS (Jhon) ---");
        const emp = await client.query("SELECT id, nombre, email FROM empleados WHERE nombre ILIKE '%jhon%'");
        console.log(emp.rows);

        console.log("\n--- ADELANTOS (Gastos) ---");
        const res = await client.query("SELECT id, empleado_beneficiario_id as emp_id, monto, fecha, estado_confirmacion as estado FROM gastos WHERE deducido_en_planilla_id IS NULL AND (estado_confirmacion = 'Pendiente' OR fecha >= '2026-03-01') ORDER BY fecha DESC LIMIT 10");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
