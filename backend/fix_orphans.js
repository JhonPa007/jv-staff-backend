const db = require('./db');

async function fixOrphans() {
    try {
        console.log("Iniciando reparación de adelantos sin caja...");

        // Obtener los adelantos confirmados sin caja
        const orphans = await db.query(
            "SELECT id, sucursal_id, descripcion FROM gastos WHERE categoria_gasto_id = 4 AND estado_confirmacion = 'Confirmado' AND caja_sesion_id IS NULL"
        );

        console.log(`Encontrados ${orphans.rowCount} registros para reparar.`);

        for (const row of orphans.rows) {
            // Buscar sesión abierta para esa sucursal
            const sRes = await db.query(
                "SELECT id FROM caja_sesiones WHERE sucursal_id = $1 AND estado = 'Abierta' ORDER BY id DESC LIMIT 1",
                [row.sucursal_id]
            );

            if (sRes.rowCount > 0) {
                const cajaSesionId = sRes.rows[0].id;
                await db.query(
                    "UPDATE gastos SET caja_sesion_id = $1 WHERE id = $2",
                    [cajaSesionId, row.id]
                );
                console.log(`Reparado adelanto ID ${row.id}: Asociado a sesión ${cajaSesionId} (${row.descripcion})`);
            } else {
                console.log(`No se encontró sesión abierta para sucursal ${row.sucursal_id}. No se pudo reparar ID ${row.id}`);
            }
        }

        console.log("Proceso de reparación finalizado.");
    } catch (e) {
        console.error("Error durante la reparación:", e);
    } finally {
        process.exit();
    }
}

fixOrphans();
