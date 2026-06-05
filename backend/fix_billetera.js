const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function fix() {
    try {
        await client.connect();

        console.log("Agregando columna tipo_contrato a empleados...");
        try {
            await client.query("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS tipo_contrato VARCHAR(50) DEFAULT 'FIJO'");
            console.log("Columna agregada.");
        } catch (e) {
            console.log("Error agregando columna:", e.message);
        }

        console.log("Buscando adelantos pendientes para Jhon (ID 2)...");
        const gastos = await client.query("SELECT id, monto, fecha, estado_confirmacion FROM gastos WHERE empleado_beneficiario_id = 2");
        console.log("Adelantos de Jhon:", gastos.rows);

        if (gastos.rows.length === 0) {
            console.log("No hay adelantos para Jhon (ID 2). Buscando el último adelanto general para reasignar si es necesario...");
            const ultimoGasto = await client.query("SELECT id, empleado_beneficiario_id, monto FROM gastos ORDER BY id DESC LIMIT 1");
            console.log("Último gasto registrado:", ultimoGasto.rows[0]);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

fix();
