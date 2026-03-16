const db = require('./db');
db.query("SELECT id, descripcion, sucursal_id, empleado_emisor_id FROM gastos WHERE id IN (202, 199)").then(res => {
    console.log(JSON.stringify(res.rows));
}).finally(() => process.exit());
