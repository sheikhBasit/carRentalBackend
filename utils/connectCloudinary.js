const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path"); // Don't forget this import

cloudinary.config({ 
    cloud_name: 'dq4orzghg', 
    api_key: '945372436862786', 
    api_secret: 'YYjM2eBCJso3umUx2idi2xbi0L0'
});

const uploadOnCloudinary = async (localFilePath) => {
    // Early return for missing path
    if (!localFilePath) {
        return { success: false, error: "No file path provided" };
    }

    // Validate file extension
    const ext = path.extname(localFilePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up invalid file:', cleanupError);
        }
        return { success: false, error: "Invalid file type. Only JPG/JPEG/PNG allowed" };
    }

    // Verify file exists
    if (!fs.existsSync(localFilePath)) {
        return { success: false, error: "File not found" };
    }

    try {
        // Upload with additional validation
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            invalidate: true // Optional: force CDN cache refresh
        });

        // Clean up local file
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            console.warn('Could not delete temp file:', unlinkError.message);
        }

        return {
            success: true,
            url: response.secure_url, // Always use HTTPS
            public_id: response.public_id,
            format: response.format
        };

    } catch (error) {
        console.error('Cloudinary upload error:', error);
        
        // Clean up local file on error
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up after failed upload:', cleanupError);
        }

        return {
            success: false,
            error: error.message || "Failed to upload to Cloudinary"
        };
    }
};

module.exports = { uploadOnCloudinary };