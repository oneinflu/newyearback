const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

const cloudinaryUpload = async (req, res, next) => {
  try {
    const cfg = cloudinary.config();
    if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
      return res.status(400).json({ error: "cloudinary_not_configured" });
    }
    const publicId = req.params.username || uuidv4();
    let result;
    if (req.file) {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "avatars", public_id: publicId, overwrite: true },
          (error, uploaded) => {
            if (error) reject(error);
            else resolve(uploaded);
          }
        );
        stream.end(req.file.buffer);
      });
    } else if (req.body && req.body.url) {
      result = await cloudinary.uploader.upload(req.body.url, {
        folder: "avatars",
        public_id: publicId,
        overwrite: true
      });
    } else {
      return res.status(400).json({ error: "no_file_or_url" });
    }
    req.avatarUrl = result.secure_url || result.url;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, cloudinaryUpload };
