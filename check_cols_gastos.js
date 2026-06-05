const db = require('./db');
db.query("SELECT * FROM gastos LIMIT 1").then(res => {
    console.log(Object.keys(res.rows[0]));
}).finally(() => process.exit());
