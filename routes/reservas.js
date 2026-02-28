const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de multer-storage-cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'staff-jv-evidencias',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => 'evidencia-' + Date.now() + '-' + Math.round(Math.random() * 1E9),
    },
});
const upload = multer({ storage: storage });

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

// Obtener Reservas asignadas a un empleado (Del día actual en adelante)
router.get('/', verifyToken, async (req, res) => {
    const empleadoId = req.user.id;
    try {
        const result = await db.query(`
            SELECT 
                r.id, 
                r.cliente_id,
                r.fecha_hora_inicio, 
                r.fecha_hora_fin, 
                r.estado, 
                r.notas_cliente,
                COALESCE(c.razon_social_nombres || ' ' || COALESCE(c.apellidos, ''), c.razon_social_nombres) as cliente_nombre,
                s.nombre as servicio_nombre,
                suc.nombre as sucursal_nombre
            FROM reservas r
            JOIN clientes c ON r.cliente_id = c.id
            JOIN servicios s ON r.servicio_id = s.id
            JOIN sucursales suc ON r.sucursal_id = suc.id
            WHERE r.empleado_id = $1 AND r.fecha_hora_inicio >= CURRENT_DATE
            ORDER BY r.fecha_hora_inicio ASC
        `, [empleadoId]);

        res.json(result.rows);
    } catch (error) {
        console.error("Error obteniendo reservas:", error);
        res.status(500).json({ error: 'Error al obtener las reservas' });
    }
});

// Modificar el servicio de una reserva
router.put('/:id/servicio', verifyToken, async (req, res) => {
    const reservaId = req.params.id;
    const { nuevo_servicio_id } = req.body;
    const empleadoId = req.user.id; // Para asegurar que el empleado tenga permisos

    if (!nuevo_servicio_id) {
        return res.status(400).json({ error: 'Falta proveer el nuevo_servicio_id' });
    }

    try {
        // Obtenemos info del servicio nuevo para calcular el precio
        const svcRes = await db.query('SELECT precio FROM servicios WHERE id = $1', [nuevo_servicio_id]);
        if (svcRes.rows.length === 0) return res.status(404).json({ error: 'Servicio nuevo no existe' });
        const nuevoPrecio = svcRes.rows[0].precio;

        // Actualizamos reserva solo si pertenece a este empleado o hay reglas más flexibles.
        // Aquí pediremos que el empleado sea el que está asignado, para seguridad.
        const updateRes = await db.query(`
            UPDATE reservas 
            SET servicio_id = $1, precio_cobrado = $2, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $3 AND empleado_id = $4
            RETURNING id, servicio_id, precio_cobrado
        `, [nuevo_servicio_id, nuevoPrecio, reservaId, empleadoId]);

        if (updateRes.rowCount === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada o no pertenece a este colaborador' });
        }

        res.json({ message: 'Servicio actualizado', reserva: updateRes.rows[0] });

    } catch (error) {
        console.error("Error actualizando servicio de reserva:", error);
        res.status(500).json({ error: 'Error al cambiar servicio de la cita' });
    }
});

// Obtener evidencias de una reserva
router.get('/:id/evidencias', verifyToken, async (req, res) => {
    const reservaId = req.params.id;
    try {
        const result = await db.query('SELECT evidencia_url FROM reservas WHERE id = $1', [reservaId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

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
        console.error("Error obteniendo evidencias:", error);
        res.status(500).json({ error: 'Error al obtener evidencias' });
    }
});

// Subir evidencias fotográficas de la reserva (hasta 4)
router.post('/:id/evidencias', verifyToken, (req, res) => {
    upload.array('fotos', 4)(req, res, async (err) => {
        if (err) {
            console.error("Multer/Cloudinary Error:", err);
            return res.status(400).json({ error: 'Error subiendo la(s) foto(s): ' + err.message });
        }
        const reservaId = req.params.id;
        const empleadoId = req.user.id; // Podría validarse que la reserva le pertenezca

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }

        try {
            // Obtener URLs desde Cloudinary (file.path contiene la URL segura ya subida)
            const fileUrls = req.files.map(file => file.path);

            // Obtener la reserva actual
            const resActual = await db.query('SELECT evidencia_url FROM reservas WHERE id = $1', [reservaId]);
            if (resActual.rowCount === 0) return res.status(404).json({ error: 'Reserva no encontrada' });

            let urlsExistentes = [];
            if (resActual.rows[0].evidencia_url) {
                try {
                    urlsExistentes = JSON.parse(resActual.rows[0].evidencia_url);
                    if (!Array.isArray(urlsExistentes)) urlsExistentes = [];
                } catch (e) {
                    // Posible compatibilidad antigua donde era solo un string
                    urlsExistentes = [resActual.rows[0].evidencia_url];
                }
            }

            const urlsFinales = [...urlsExistentes, ...fileUrls].slice(0, 4); // Limitar a max 4 siempre
            const jsonUrls = JSON.stringify(urlsFinales);

            await db.query(`
            UPDATE reservas 
            SET evidencia_url = $1, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [jsonUrls, reservaId]);

            res.json({ message: 'Evidencias subidas', evidencia_url: urlsFinales });
        } catch (error) {
            console.error("Error subiendo evidencias SQL:", error);
            res.status(500).json({ error: 'Error al persistir las imágenes en base de datos' });
        }
    }); // fin de multer callback
});

module.exports = router;
