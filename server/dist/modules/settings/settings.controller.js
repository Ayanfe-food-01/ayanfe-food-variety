import { getAdminContactInformation, getAdminPaymentSettings, getAdminStoreInformation, getPublicStoreSettings, updateAdminContactInformation, updateAdminPaymentSettings, updateAdminStoreInformation, } from './settings.service.js';
import { validateContactInformationInput, validatePaymentSettingsInput, validateStoreInformationInput, } from './settings.validator.js';
export const getAdminStoreInformationController = async (_request, response) => {
    response.json({ success: true, data: { settings: await getAdminStoreInformation() } });
};
export const updateAdminStoreInformationController = async (request, response) => {
    const fields = validateStoreInformationInput(request.body);
    response.json({
        success: true,
        message: 'Store information updated.',
        data: { settings: await updateAdminStoreInformation(fields) },
    });
};
export const getAdminContactInformationController = async (_request, response) => {
    response.json({ success: true, data: { settings: await getAdminContactInformation() } });
};
export const updateAdminContactInformationController = async (request, response) => {
    response.json({
        success: true,
        message: 'Contact information updated.',
        data: { settings: await updateAdminContactInformation(validateContactInformationInput(request.body)) },
    });
};
export const getAdminPaymentSettingsController = async (_request, response) => {
    response.json({ success: true, data: { settings: await getAdminPaymentSettings() } });
};
export const updateAdminPaymentSettingsController = async (request, response) => {
    response.json({
        success: true,
        message: 'Payment settings updated.',
        data: { settings: await updateAdminPaymentSettings(validatePaymentSettingsInput(request.body)) },
    });
};
export const getPublicStoreSettingsController = async (_request, response) => {
    response.json({ success: true, data: await getPublicStoreSettings() });
};
