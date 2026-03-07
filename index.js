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
    res.send('API Staff JV App is running');
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
    try {
        const client = await db.connect();
        await client.query('LISTEN new_reserva');

        client.on('notification', async (msg) => {
            if (msg.channel === 'new_reserva') {
                const reserva = JSON.parse(msg.payload);
                console.log('Nueva reserva detectada:', reserva.id);

                // Obtener push_token del empleado asignado
                try {
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
                        } else {
                            console.log(`El empleado ${nombres} no tiene push_token registrado.`);
                        }
                    }
                } catch (err) {
                    console.error('Error al procesar notificación de reserva:', err);
                }
            }
        });

        console.log('Escuchando notificaciones de base de datos (LISTEN new_reserva)...');
    } catch (err) {
        console.error('Error iniciando listener de notificaciones:', err);
    }
}

startNotificationListener();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de API corriendo en el puerto ${PORT}`);
});
