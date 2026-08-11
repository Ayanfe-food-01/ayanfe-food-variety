import { prisma } from '../../lib/prisma.js';
const SETTINGS_KEY = 'default';
const DEFAULT_STORE_SETTINGS = {
    businessName: 'Ayanfe Food Variety',
    businessEmail: 'Ayanfefoodvariety@gmail.com',
    businessPhone: '08125595879',
    whatsappNumber: '08125595879',
    address: '',
    description: '',
};
const toStoreSettings = (settings) => ({
    businessName: settings.businessName,
    businessEmail: settings.businessEmail,
    businessPhone: settings.businessPhone,
    whatsappNumber: settings.whatsappNumber,
    address: settings.address,
    description: settings.description,
});
const toStoreInformation = (settings) => ({
    businessName: settings.businessName,
    address: settings.address,
    description: settings.description,
});
const toContactInformation = (settings) => ({
    businessEmail: settings.businessEmail,
    businessPhone: settings.businessPhone,
    whatsappNumber: settings.whatsappNumber,
});
const toPaymentSettings = (settings) => ({
    bankName: settings.bankName,
    accountName: settings.accountName,
    accountNumber: settings.accountNumber,
    instructions: settings.instructions,
});
const getSettings = () => prisma.storeSettings.findUnique({ where: { singletonKey: SETTINGS_KEY } });
const getPaymentSettings = () => prisma.paymentSettings.findUnique({ where: { singletonKey: SETTINGS_KEY } });
export async function getAdminStoreInformation() {
    const settings = await getSettings();
    return settings ? toStoreInformation(settings) : {
        businessName: DEFAULT_STORE_SETTINGS.businessName,
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
        },
        update: input,
    });
    return toStoreInformation(settings);
}
export async function getAdminContactInformation() {
    const settings = await getSettings();
    return settings ? toContactInformation(settings) : {
        businessEmail: DEFAULT_STORE_SETTINGS.businessEmail,
        businessPhone: DEFAULT_STORE_SETTINGS.businessPhone,
        whatsappNumber: DEFAULT_STORE_SETTINGS.whatsappNumber,
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
        where: { singletonKey: SETTINGS_KEY },
        create: { singletonKey: SETTINGS_KEY, ...input, isActive: true },
        update: { ...input, isActive: true },
    });
    return toPaymentSettings(settings);
}
export async function getPublicPaymentSettings() {
    const settings = await prisma.paymentSettings.findFirst({
        where: { singletonKey: SETTINGS_KEY, isActive: true },
        select: { bankName: true, accountName: true, accountNumber: true, instructions: true },
    });
    return settings;
}
export async function getPublicStoreSettings() {
    const [store, payment] = await Promise.all([
        getSettings(),
        getPublicPaymentSettings(),
    ]);
    return {
        store: store ? toStoreSettings(store) : DEFAULT_STORE_SETTINGS,
        payment: payment ?? null,
    };
}
