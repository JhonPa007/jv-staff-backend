const db = require('./db');
db.query("SELECT id, caja_sesion_id FROM gastos WHERE categoria_gasto_id = 4 AND estado_confirmacion = 'Pendiente' AND caja_sesion_id IS NOT NULL").then(res => {
    console.log(res.rows);
}).finally(() => process.exit());
