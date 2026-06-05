const { Client } = require('pg');
const client = new Client('postgresql://postgres:JbCjfwFkrmmbuQdkFpCWGvNEbmqCUldc@gondola.proxy.rlwy.net:17823/railway');

async function check() {
    try {
        await client.connect();

        console.log("--- TEST EMPLEADOS ---");
        try {
            const emp = await client.query("SELECT * FROM empleados LIMIT 1");
            console.log("Columnas empleados:", Object.keys(emp.rows[0]).join(', '));
        } catch (e) {
            console.log("Error empleados:", e.message);
        }

        console.log("\n--- TEST GASTOS ---");
        try {
            const gas = await client.query("SELECT * FROM gastos LIMIT 1");
            console.log("Columnas gastos:", Object.keys(gas.rows[0]).join(', '));
        } catch (e) {
            console.log("Error gastos:", e.message);
        }

        console.log("\n--- TEST BONOS ---");
        try {
            const bonos = await client.query("SELECT * FROM empleado_bonos LIMIT 1");
            console.log("Columnas bonos:", Object.keys(bonos.rows[0]).join(', '));
        } catch (e) {
            console.log("Error bonos:", e.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
