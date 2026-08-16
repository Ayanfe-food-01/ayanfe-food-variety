import { PaymentMethod } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
const SETTINGS_KEY = 'default';
const DEFAULT_STORE_SETTINGS = {
    businessName: 'Ayanfe Food Variety',
    businessEmail: 'Ayanfefoodvariety@gmail.com',
    businessPhone: '08125595879',
    whatsappNumber: '08125595879',
    callToOrderPhone: '08125595879',
    announcementText: 'Quality foodstuff, delivered with care',
    address: '',
    description: '',
    openingHours: '',
    pickupInformation: '',
    deliveryInformation: '',
    mapEmbedUrl: '',
    logoUrl: null,
    logoPublicId: null,
    faviconUrl: null,
    faviconPublicId: null,
};
const toStoreSettings = (settings) => ({
    businessName: settings.businessName,
    businessEmail: settings.businessEmail,
    businessPhone: settings.businessPhone,
    whatsappNumber: settings.whatsappNumber,
    callToOrderPhone: settings.callToOrderPhone,
    announcementText: settings.announcementText,
    address: settings.address,
    description: settings.description,
    openingHours: settings.openingHours,
    pickupInformation: settings.pickupInformation,
    deliveryInformation: settings.deliveryInformation,
    mapEmbedUrl: settings.mapEmbedUrl,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
});
const toStoreBranding = (settings) => ({
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
});
const toStoreBrandingAssets = (settings) => ({
    logoUrl: settings.logoUrl,
    logoPublicId: settings.logoPublicId,
    faviconUrl: settings.faviconUrl,
    faviconPublicId: settings.faviconPublicId,
});
const toStoreInformation = (settings) => ({
    businessName: settings.businessName,
    callToOrderPhone: settings.callToOrderPhone,
    announcementText: settings.announcementText,
    address: settings.address,
    description: settings.description,
});
const toContactInformation = (settings) => ({
    businessEmail: settings.businessEmail,
    businessPhone: settings.businessPhone,
    whatsappNumber: settings.whatsappNumber,
    openingHours: settings.openingHours,
    pickupInformation: settings.pickupInformation,
    deliveryInformation: settings.deliveryInformation,
    mapEmbedUrl: settings.mapEmbedUrl,
});
const toPaymentSettings = (settings) => ({
    paymentMethod: settings.paymentMethod,
    bankName: settings.bankName,
    accountName: settings.accountName,
    accountNumber: settings.accountNumber,
    instructions: settings.instructions,
    isActive: settings.isActive,
});
const getSettings = () => prisma.storeSettings.findUnique({ where: { singletonKey: SETTINGS_KEY } });
const getPaymentSettings = (paymentMethod = PaymentMethod.BANK_TRANSFER) => prisma.paymentSettings.findUnique({
    where: { singletonKey_paymentMethod: { singletonKey: SETTINGS_KEY, paymentMethod } },
});
export async function getAdminStoreInformation() {
    const settings = await getSettings();
    return settings ? toStoreInformation(settings) : {
        businessName: DEFAULT_STORE_SETTINGS.businessName,
        callToOrderPhone: DEFAULT_STORE_SETTINGS.callToOrderPhone,
        announcementText: DEFAULT_STORE_SETTINGS.announcementText,
        address: DEFAULT_STORE_SETTINGS.address,
        description: DEFAULT_STORE_SETTINGS.description,
    };
}
export async function updateAdminStoreInformation(input) {
    const settings = await prisma.storeSettings.upsert({
        where: { singletonKey: SETTINGS_KEY },
        create: {
            singletonKey: SETTINGS_KEY,
            businessName: input.businessName,
            address: input.address,
            description: input.description,
            businessEmail: DEFAULT_STORE_SETTINGS.businessEmail,
            businessPhone: DEFAULT_STORE_SETTINGS.businessPhone,
            whatsappNumber: DEFAULT_STORE_SETTINGS.whatsappNumber,
            callToOrderPhone: input.callToOrderPhone,
            announcementText: input.announcementText,
        },
        update: input,
    });
    return toStoreInformation(settings);
}
export async function getAdminStoreBranding() {
    const settings = await getSettings();
    return settings ? toStoreBranding(settings) : { logoUrl: null, faviconUrl: null };
}
export async function getAdminStoreBrandingAssets() {
    const settings = await getSettings();
    return settings
        ? toStoreBrandingAssets(settings)
        : { logoUrl: null, logoPublicId: null, faviconUrl: null, faviconPublicId: null };
}
export async function updateAdminStoreBranding(input) {
    const data = {
        ...(input.logo ? { logoUrl: input.logo.url, logoPublicId: input.logo.publicId } : {}),
        ...(input.removeLogo ? { logoUrl: null, logoPublicId: null } : {}),
        ...(input.favicon ? { faviconUrl: input.favicon.url, faviconPublicId: input.favicon.publicId } : {}),
        ...(input.removeFavicon ? { faviconUrl: null, faviconPublicId: null } : {}),
    };
    const settings = await getSettings();
    const updated = settings
        ? await prisma.storeSettings.update({ where: { singletonKey: SETTINGS_KEY }, data })
        : await prisma.storeSettings.create({
            data: {
                singletonKey: SETTINGS_KEY,
                ...DEFAULT_STORE_SETTINGS,
                ...data,
            },
        });
    return toStoreBranding(updated);
}
export async function getAdminContactInformation() {
    const settings = await getSettings();
    return settings ? toContactInformation(settings) : {
        businessEmail: DEFAULT_STORE_SETTINGS.businessEmail,
        businessPhone: DEFAULT_STORE_SETTINGS.businessPhone,
        whatsappNumber: DEFAULT_STORE_SETTINGS.whatsappNumber,
        openingHours: DEFAULT_STORE_SETTINGS.openingHours,
        pickupInformation: DEFAULT_STORE_SETTINGS.pickupInformation,
        deliveryInformation: DEFAULT_STORE_SETTINGS.deliveryInformation,
        mapEmbedUrl: DEFAULT_STORE_SETTINGS.mapEmbedUrl,
    };
}
export async function updateAdminContactInformation(input) {
    const settings = await getSettings();
    const updated = settings
        ? await prisma.storeSettings.update({
            where: { singletonKey: SETTINGS_KEY },
            data: input,
        })
        : await prisma.storeSettings.create({
            data: {
                singletonKey: SETTINGS_KEY,
                ...input,
                ...DEFAULT_STORE_SETTINGS,
                ...input,
            },
        });
    return toContactInformation(updated);
}
export async function getAdminPaymentSettings() {
    const settings = await getPaymentSettings();
    return settings ? toPaymentSettings(settings) : null;
}
export async function updateAdminPaymentSettings(input) {
    const settings = await prisma.paymentSettings.upsert({
        where: {
            singletonKey_paymentMethod: {
                singletonKey: SETTINGS_KEY,
                paymentMethod: input.paymentMethod,
            },
        },
        create: { singletonKey: SETTINGS_KEY, ...input },
        update: input,
    });
    return toPaymentSettings(settings);
}
export async function getPublicPaymentSettings() {
    const settings = await prisma.paymentSettings.findFirst({
        where: { singletonKey: SETTINGS_KEY, paymentMethod: PaymentMethod.BANK_TRANSFER, isActive: true },
    });
    return settings ? toPaymentSettings(settings) : null;
}
export async function getPublicStoreSettings() {
    const [store, paymentMethods] = await Promise.all([
        getSettings(),
        prisma.paymentSettings.findMany({
            where: { singletonKey: SETTINGS_KEY, isActive: true },
            orderBy: { createdAt: 'asc' },
        }),
    ]);
    const publicPaymentMethods = paymentMethods.map(toPaymentSettings);
    return {
        store: store ? toStoreSettings(store) : DEFAULT_STORE_SETTINGS,
        payment: publicPaymentMethods.find((method) => method.paymentMethod === PaymentMethod.BANK_TRANSFER) ?? null,
        paymentMethods: publicPaymentMethods,
    };
}
