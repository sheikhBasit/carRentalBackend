// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./public/temp"); // Store files temporarily
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
//   }
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file limit
//   fileFilter: function (req, file, cb) {
//     const allowedTypes = ["image/jpeg", "image/png"]; // Removed "image/jpg"
//     if (allowedTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Invalid file type. Only JPEG and PNG files are allowed"), false);
//     }
//   }
// });
// module.exports = upload;
const multer = require("multer");
const path = require("path");

// Use memory storage for Vercel (no file system writes)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    allowedTypes.includes(file.mimetype) 
      ? cb(null, true) 
      : cb(new Error("Only JPEG/PNG files allowed"), false);
  }
});

module.exports = upload;