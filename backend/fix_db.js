const db = require('./db');

db.query('ALTER TABLE reservas ALTER COLUMN evidencia_url TYPE TEXT;')
    .then(res => console.log('Éxito ampliando columna evidencia_url'))
    .catch(err => console.error(err))
    .finally(() => process.exit());
