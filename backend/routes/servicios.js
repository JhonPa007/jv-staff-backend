const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware para verificar TOKEN JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Token no provisto' });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
};

// Obtener lista de servicios activos
router.get('/', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, descripcion, precio, duracion_minutos
            FROM servicios
            WHERE activo = true
            ORDER BY nombre ASC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo servicios:", error);
        res.status(500).json({ error: 'Error al obtener los servicios' });
    }
});

module.exports = router;
