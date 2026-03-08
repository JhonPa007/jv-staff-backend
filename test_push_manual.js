const { sendPushNotification } = require('./utils/notifications');
require('dotenv').config();

async function testManual() {
    const token = 'ExponentPushToken[DXUz54KhGfYv-qcspLrYGD]'; // Token del usuario de sus logs previos
    console.log('Enviando notificación de prueba a:', token);

    const result = await sendPushNotification(
        token,
        'Prueba de Sistema 🚀',
        'Si ves esto, las notificaciones están funcionando perfectamente.'
    );

    console.log('Resultado final:', JSON.stringify(result, null, 2));
}

testManual();
