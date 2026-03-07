const db = require('./db');

async function setupTrigger() {
    try {
        // 1. Crear la función de notificación
        await db.query(`
            CREATE OR REPLACE FUNCTION notify_new_reserva()
            RETURNS trigger AS $$
            BEGIN
                PERFORM pg_notify('new_reserva', row_to_json(NEW)::text);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 2. Crear el trigger
        await db.query(`
            DROP TRIGGER IF EXISTS trg_new_reserva ON reservas;
            CREATE TRIGGER trg_new_reserva
            AFTER INSERT ON reservas
            FOR EACH ROW
            EXECUTE FUNCTION notify_new_reserva();
        `);

        console.log('Trigger de base de datos configurado exitosamente.');
        process.exit(0);
    } catch (e) {
        console.error('Error configurando trigger:', e);
        process.exit(1);
    }
}

setupTrigger();
