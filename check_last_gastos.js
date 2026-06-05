const db = require('./db');
db.query("SELECT id, descripcion, sucursal_id, empleado_emisor_id FROM gastos ORDER BY id DESC LIMIT 5").then(res => {
    console.log(JSON.stringify(res.rows));
}).finally(() => process.exit());
