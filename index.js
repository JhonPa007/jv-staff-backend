const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const path = require('path');
const { sendPushNotification } = require('./utils/notifications');

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic Route
app.get('/', (req, res) => {
    res.send('JV Staff API - Production v2.0 - Active');
});

// Import Routes
const auth = require('./routes/auth');
app.use('/api/auth', auth.router);
app.use('/api/reservas', require('./routes/reservas'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/comisiones', require('./routes/comisiones'));
app.use('/api/produccion', require('./routes/produccion'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/adelantos', require('./routes/adelantos'));

// --- MONITOR DE BASE DE DATOS (NOTIFICACIONES) ---
async function startNotificationListener() {
    let client;

    async function connect() {
        try {
            if (client) {
                client.release(true); // Liberar y forzar destrucción del cliente anterior si existe
            }

            client = await db.connect();

            // Manejar errores en la conexión del listener
            client.on('error', (err) => {
                console.error('Error de base de datos en el Notification Listener:', err);
                // Si la conexión se pierde, intentamos reconectar en 5 segundos
                setTimeout(connect, 5000);
            });

            await client.query('LISTEN new_reserva');

            client.on('notification', async (msg) => {
                if (msg.channel === 'new_reserva') {
                    try {
                        const reserva = JSON.parse(msg.payload);
                        console.log('Nueva reserva detectada:', reserva.id);

                        const empRes = await db.query(
                            'SELECT nombres, push_token FROM empleados WHERE id = $1',
                            [reserva.empleado_id]
                        );

                        if (empRes.rows.length > 0) {
                            const { nombres, push_token } = empRes.rows[0];
                            if (push_token) {
                                console.log(`Enviando notificación a ${nombres}...`);
                                await sendPushNotification(
                                    push_token,
                                    'Nueva Cita Asignada 📅',
                                    `Hola ${nombres}, se te ha asignado una nueva reserva. Revisa tu agenda.`,
                                    { reservaId: reserva.id }
                                );
                            }
                        }
                    } catch (err) {
                        console.error('Error al procesar notificación de reserva:', err);
                    }
                }
            });

            console.log('Escuchando notificaciones de base de datos (LISTEN new_reserva)...');
        } catch (err) {
            console.error('Error iniciando listener de notificaciones (reintentando en 5s):', err);
            setTimeout(connect, 5000);
        }
    }

    await connect();
}

startNotificationListener();

// --- SERVIR VERSIÓN WEB DE LA APP ---
// Los archivos de la app compilada para web irán en esta carpeta
const webPath = path.join(__dirname, 'web-build');
app.use(express.static(webPath));

// Cualquier otra ruta que no sea de la API servirá el index.html de la App Web
// Esto permite que el enrutamiento de la aplicación funcione correctamente
// Middleware para servir la versión web (fallback)
app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.sendFile(path.join(webPath, 'index.html'), (err) => {
            if (err) {
                // Si aún no se ha compilado la web, mostrar mensaje amigable
                res.status(404).send('Servidor activo. Versión web aún no disponible (pendiente build).');
            }
        });
    } else {
        next();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de API corriendo en el puerto ${PORT}`);
});
