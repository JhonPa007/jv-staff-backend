const db = require('./db');
db.query("SELECT id, evidencia_url FROM reservas WHERE evidencia_url LIKE '%cloudinary%'")
    .then(res => {
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
