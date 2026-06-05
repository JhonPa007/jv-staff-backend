const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'staff-jv-evidencias',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => 'evidencia-venta-' + Date.now() + '-' + Math.round(Math.random() * 1E9),
    },
});
const upload = multer({ storage: storage });

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Token no provisto' });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = decoded;
        next();
    });
};

// GET evidencias de venta
router.get('/:id/evidencias', verifyToken, async (req, res) => {
    const ventaId = req.params.id;
    try {
        const result = await db.query('SELECT evidencia_url FROM ventas WHERE id = $1', [ventaId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Venta no encontrada' });

        let urls = [];
        if (result.rows[0].evidencia_url) {
            try {
                urls = JSON.parse(result.rows[0].evidencia_url);
                if (!Array.isArray(urls)) urls = [];
            } catch (e) {
                urls = [result.rows[0].evidencia_url];
            }
        }
        res.json({ evidencia_url: urls });
    } catch (error) {
        console.error("Error obteniendo evidencias de venta:", error);
        res.status(500).json({ error: 'Error al obtener evidencias' });
    }
});

// POST subir evidencias a venta
router.post('/:id/evidencias', verifyToken, (req, res) => {
    upload.array('fotos', 4)(req, res, async (err) => {
        if (err) {
            console.error("Multer/Cloudinary Error en Ventas:", err);
            return res.status(400).json({ error: 'Error subiendo foto: ' + err.message });
        }

        const ventaId = req.params.id;
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }

        try {
            const fileUrls = req.files.map(file => file.path);
            const resActual = await db.query('SELECT evidencia_url FROM ventas WHERE id = $1', [ventaId]);
            if (resActual.rowCount === 0) return res.status(404).json({ error: 'Venta no encontrada' });

            let urlsExistentes = [];
            if (resActual.rows[0].evidencia_url) {
                try {
                    urlsExistentes = JSON.parse(resActual.rows[0].evidencia_url);
                    if (!Array.isArray(urlsExistentes)) urlsExistentes = [];
                } catch (e) {
                    urlsExistentes = [resActual.rows[0].evidencia_url];
                }
            }

            const urlsFinales = [...urlsExistentes, ...fileUrls].slice(0, 4);
            const jsonUrls = JSON.stringify(urlsFinales);

            await db.query(`UPDATE ventas SET evidencia_url = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2`, [jsonUrls, ventaId]);
            res.json({ message: 'Evidencias subidas', evidencia_url: urlsFinales });
        } catch (error) {
            console.error("Error BD subiendo evidencias de venta:", error);
            res.status(500).json({ error: 'Error al persistir evidencias' });
        }
    });
});

// DELETE eliminar evidencia de venta
router.delete('/:id/evidencias', verifyToken, async (req, res) => {
    const ventaId = req.params.id;
    const { url_to_delete } = req.body;

    if (!url_to_delete) return res.status(400).json({ error: 'Se requiere url_to_delete' });

    try {
        const resActual = await db.query('SELECT evidencia_url FROM ventas WHERE id = $1', [ventaId]);
        if (resActual.rowCount === 0) return res.status(404).json({ error: 'Venta no encontrada' });

        let urlsExistentes = [];
        if (resActual.rows[0].evidencia_url) {
            try {
                urlsExistentes = JSON.parse(resActual.rows[0].evidencia_url);
                if (!Array.isArray(urlsExistentes)) urlsExistentes = [];
            } catch (e) { }
        }

        const urlsFinales = urlsExistentes.filter(u => u !== url_to_delete);
        const jsonUrls = JSON.stringify(urlsFinales);

        await db.query(`UPDATE ventas SET evidencia_url = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2`, [jsonUrls, ventaId]);
        res.json({ message: 'Evidencia eliminada', evidencia_url: urlsFinales });
    } catch (error) {
        console.error("Error eliminando evidencia de venta:", error);
        res.status(500).json({ error: 'Error al eliminar evidencia' });
    }
});

module.exports = router;
