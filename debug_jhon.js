const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM empleados WHERE nombre_display ILIKE '%jhon%' OR nombres ILIKE '%jhon%'");
        if (res.rows.length > 0) {
            const row = res.rows[0];
            console.log("EMPLEADO ENCONTRADO:", row.id, row.nombre_display);
            console.log("COLUMNAS:", Object.keys(row).join(', '));
            console.log("VALORES:", JSON.stringify(row, null, 2));
        } else {
            console.log("Empleado Jhon no encontrado.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
