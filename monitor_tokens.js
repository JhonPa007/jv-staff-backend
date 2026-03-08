const pool = require('./db');

async function monitorTokens() {
    console.log('Monitoreando cambios en push_tokens de empleados (Ctrl+C para salir)...');
    let lastTokens = {};

    // Obtener estado inicial
    const initial = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE push_token IS NOT NULL");
    initial.rows.forEach(r => {
        lastTokens[r.id] = r.push_token;
    });

    setInterval(async () => {
        try {
            const current = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE push_token IS NOT NULL");
            current.rows.forEach(r => {
                if (!lastTokens[r.id] || lastTokens[r.id] !== r.push_token) {
                    console.log(`[${new Date().toLocaleTimeString()}] CAMBIO DETECTADO:`);
                    console.log(`Empleado: ${r.nombres} (ID: ${r.id})`);
                    console.log(`Nuevo Token: ${r.push_token}`);
                    console.log('-----------------------------------');
                    lastTokens[r.id] = r.push_token;
                }
            });
        } catch (err) {
            console.error('Error durante el monitoreo:', err.message);
        }
    }, 5000); // Cada 5 segundos
}

monitorTokens();
