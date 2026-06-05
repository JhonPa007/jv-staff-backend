const pool = require('./db');

async function checkEmp1() {
    try {
        console.log('--- Datos del Empleado ID 1 ---');
        const res = await pool.query("SELECT id, nombres, push_token FROM empleados WHERE id = 1");
        if (res.rows.length > 0) {
            const emp = res.rows[0];
            console.log('Nombre:', emp.nombres);
            console.log('Token:', emp.push_token ? emp.push_token : 'NULL (SIN TOKEN)');
        } else {
            console.log('No existe el empleado con ID 1.');
        }

        const loggedInToken = 'ExponentPushToken[DXUz54KhGfYv-qcspLrYGD]';
        console.log(`\n--- ¿Quién tiene el token que recibió la prueba? ---`);
        const resWithToken = await pool.query("SELECT id, nombres FROM empleados WHERE push_token = $1", [loggedInToken]);
        if (resWithToken.rows.length > 0) {
            const user = resWithToken.rows[0];
            console.log(`Usuario: ${user.nombres} (ID: ${user.id})`);
        } else {
            console.log('Ese token no está en la base de datos de Railway.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkEmp1();
