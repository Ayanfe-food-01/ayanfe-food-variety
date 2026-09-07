// App-wide limits and labels shared across modules. Domain enums live in
// prisma/schema.prisma and runtime config lives in src/config, so constants
// here should only hold values that are duplicated across feature modules.
export const JSON_BODY_LIMIT = '1mb' as const