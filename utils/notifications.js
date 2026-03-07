/**
 * Utilidad para enviar notificaciones push a través de Expo
 */
async function sendPushNotification(expoPushToken, title, body, data = {}) {
    if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
        console.log('Token de Expo inválido o no provisto:', expoPushToken);
        return;
    }

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    };

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const resData = await response.json();
        console.log('Respuesta de Expo:', resData);
        return resData;
    } catch (error) {
        console.error('Error enviando notificación push:', error);
    }
}

module.exports = { sendPushNotification };
