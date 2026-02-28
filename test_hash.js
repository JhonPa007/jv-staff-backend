const crypto = require('crypto');

function checkPasswordHash(pwhash, password) {
    if (!pwhash || typeof pwhash !== 'string') {
        console.log("No pwhash string");
        return false;
    }

    const parts = pwhash.split('$');
    if (parts.length !== 3) {
        console.log("Invalid format");
        return false;
    }

    const methodAndParams = parts[0].split(':');
    if (methodAndParams[0] !== 'scrypt') {
        console.log("Not scrypt");
        return false;
    }

    const N = parseInt(methodAndParams[1], 10);
    const r = parseInt(methodAndParams[2], 10);
    const p = parseInt(methodAndParams[3], 10);

    const salt = parts[1];
    const actualHash = parts[2];

    try {
        // En Werkzeug, el hash resultante se almacena como hexadecimal (hex).
        const derivedKey = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('hex');

        console.log("Derived (hex):", derivedKey, "Actual:", actualHash);

        // Sin embargo, a veces Werkzeug lo corta o el dklen es distinto, vamos a comparar el inicio al menos
        if (derivedKey === actualHash) {
            console.log("MATCH EXACTO en HEX");
            return true;
        }

        // Si no funciona, probemos con la lógica de Werkzeug que usa hashlib (dklen puede variar)
        // Werkzeug security default scrypt length is usually 32 or 64. Let's test dklen 32
        const derivedKey32 = crypto.scryptSync(password, salt, 32, { N, r, p }).toString('hex');
        console.log("Derived 32 (hex):", derivedKey32, "Actual:", actualHash);

        if (derivedKey32 === actualHash) {
            console.log("MATCH EXACTO en HEX (dklen 32)");
            return true;
        }

        return false;
    } catch (e) {
        console.error("Error criptográfico:", e);
        return false;
    }
}

// Simulando el test
const hashDB = "scrypt:32768:8:1$MTulY9X0JsrFWO3x$232f889b0658667290865e9557d5536876fb3279";
const pwTest = "12345678"; // Asumimos una contraseña comun para la prueba si no sabemos cual es, o el error es por el formato hex.
console.log("Testing password '12345678':", checkPasswordHash(hashDB, pwTest));

// La longitud del hash en BD es: 232f889b0658667290865e9557d5536876fb3279 (38 caracteres hex) -> 19 bytes? No parece 32 ni 64.
console.log("Hash length:", hashDB.split('$')[2].length);
