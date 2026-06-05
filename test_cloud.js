require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP6zwAAZgD/AAA=", { folder: "test" })
    .then(res => console.log("Success Cloudinary:", res.secure_url))
    .catch(err => {
        console.log("CLOUDINARY_ERROR_MESSAGE:", err.message);
    });
