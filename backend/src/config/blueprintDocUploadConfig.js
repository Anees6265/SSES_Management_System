const multer = require("multer");
const path = require("path");

const blueprintDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    fieldSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|pdf|docx|doc/;
    const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, "");
    const extMatches = allowedExtensions.test(ext);

    const allowedMimePrefixes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/octet-stream",
    ];
    const mimeMatches = allowedMimePrefixes.some((m) => file.mimetype.toLowerCase().includes(m));

    if (extMatches || mimeMatches) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file format! Allowed formats: PDF (.pdf), Word Documents (.doc, .docx), and Images (PNG, JPG, WEBP)."
        ),
        false
      );
    }
  },
});

module.exports = blueprintDocUpload;
