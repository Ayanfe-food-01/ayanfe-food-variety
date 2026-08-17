import { HttpError } from '../../utils/http.js';
import { listAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead, } from './notification.service.js';
import { validateAdminNotificationsQuery } from './notification.validator.js';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validateNotificationId = (value) => {
    if (typeof value !== 'string' || !uuidPattern.test(value)) {
        throw new HttpError(400, 'Notification id is invalid.');
    }
    return value;
};
export const listAdminNotificationsController = async (request, response) => {
    response.json({
        success: true,
        data: await listAdminNotifications(request.authenticatedUser.id, validateAdminNotificationsQuery(request.query)),
    });
};
export const markAdminNotificationReadController = async (request, response) => {
    await markAdminNotificationRead(validateNotificationId(request.params.id), request.authenticatedUser.id);
    response.json({ success: true, message: 'Notification marked as read.' });
};
export const markAllAdminNotificationsReadController = async (request, response) => {
    await markAllAdminNotificationsRead(request.authenticatedUser.id);
    response.json({ success: true, message: 'Notifications marked as read.' });
};
