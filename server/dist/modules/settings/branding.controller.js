import multer from 'multer';
import { HttpError } from '../../utils/http.js';
import { getAdminStoreBranding, getAdminStoreBrandingAssets, updateAdminStoreBranding, } from './settings.service.js';
import { deleteBrandingImage, uploadBrandingFavicon, uploadBrandingLogo } from './branding.storage.js';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 2, fieldSize: 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
        const hasSupportedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname);
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.mimetype) && !hasSupportedExtension) {
            callback(new HttpError(400, 'Branding images must be a JPG, PNG, WEBP, or HEIC/HEIF image.'));
            return;
        }
        callback(null, true);
    },
});
export const brandingImageUpload = (request, response, next) => {
    upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }])(request, response, (error) => {
        if (error instanceof multer.MulterError) {
            next(new HttpError(400, error.code === 'LIMIT_FILE_SIZE'
                ? 'Branding images must be 5 MB or smaller.'
                : error.code === 'LIMIT_FIELD_COUNT'
                    ? 'Only a logo and favicon can be uploaded at once.'
                    : 'The branding image upload is invalid.'));
            return;
        }
        next(error);
    });
};
const filesFromRequest = (request) => request.files && !Array.isArray(request.files) ? request.files : {};
export const getAdminBrandingController = async (_request, response) => {
    response.json({ success: true, data: { branding: await getAdminStoreBranding() } });
};
export const updateAdminBrandingController = async (request, response) => {
    const files = filesFromRequest(request);
    const logoFile = files.logo?.[0];
    const faviconFile = files.favicon?.[0];
    const removeLogo = request.body?.removeLogo === 'true';
    const removeFavicon = request.body?.removeFavicon === 'true';
    if ((logoFile && removeLogo) || (faviconFile && removeFavicon)) {
        throw new HttpError(400, 'Upload a new asset or reset it, not both at once.');
    }
    if (!logoFile && !faviconFile && !removeLogo && !removeFavicon) {
        throw new HttpError(400, 'Choose a logo or favicon before saving.');
    }
    const existing = await getAdminStoreBrandingAssets();
    let logo;
    let favicon;
    try {
        if (logoFile)
            logo = await uploadBrandingLogo(logoFile);
        if (faviconFile)
            favicon = await uploadBrandingFavicon(faviconFile);
        const branding = await updateAdminStoreBranding({ logo, favicon, removeLogo, removeFavicon });
        if ((logo || removeLogo) && existing.logoPublicId)
            await deleteBrandingImage(existing.logoPublicId);
        if ((favicon || removeFavicon) && existing.faviconPublicId)
            await deleteBrandingImage(existing.faviconPublicId);
        response.json({ success: true, message: 'Branding updated.', data: { branding } });
    }
    catch (error) {
        if (logo)
            await deleteBrandingImage(logo.publicId);
        if (favicon)
            await deleteBrandingImage(favicon.publicId);
        throw error;
    }
};
