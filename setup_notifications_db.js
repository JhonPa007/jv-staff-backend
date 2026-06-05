const pool = require('./db');

const sql = `
-- 1. Crear o reemplazar la función de notificación
CREATE OR REPLACE FUNCTION notify_new_reserva()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_reserva', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar el trigger si ya existe (para evitar duplicados)
DROP TRIGGER IF EXISTS trg_new_reserva ON reservas;

-- 3. Crear el trigger nuevamente
CREATE TRIGGER trg_new_reserva
AFTER INSERT ON reservas
FOR EACH ROW
EXECUTE FUNCTION notify_new_reserva();

-- 4. Notificar que se ha completado la configuración
SELECT 'Trigger y Función configurados correctamente' as resultado;
`;

async function setup() {
    try {
        const res = await pool.query(sql);
        console.log('Resultado:', res[res.length - 1].rows[0].resultado);
    } catch (err) {
        console.error('Error configurando DB:', err);
    } finally {
        pool.end();
    }
}

setup();
