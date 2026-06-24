const db = require('./db');

async function list() {
    try {
        const res = await db.query("SELECT fecha_generacion FROM comisiones WHERE empleado_id = 2 ORDER BY fecha_generacion DESC LIMIT 5");
        console.log("Fechas de comisiones de empleado 2:");
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

list();
