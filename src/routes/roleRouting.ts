import { User } from "../types/auth";
import { hasRole } from "../utils/permissions";

export type AppRoleSlug =
    | "admin"
    | "general_manager"
    | "accountant"
    | "procurement_manager"
    | "reviewer"
    | "warehouse_keeper"
    | "site_engineer"
    | "employee";

export const ROLE_HOME_PRIORITY: AppRoleSlug[] = [
    "admin",
    "general_manager",
    "accountant",
    "procurement_manager",
    "reviewer",
    "warehouse_keeper",
    "site_engineer",
    "employee",
];

const ROLE_HOME_PATHS: Record<AppRoleSlug, string> = {
    admin: "/admin",
        general_manager: "/general-manager/purchase-requests",

    accountant: "/accounting",
    procurement_manager: "/procurement",
    reviewer: "/reviewer",
    warehouse_keeper: "/warehouse",
    site_engineer: "/site-engineer",
    employee: "/employee",
};

const ROLE_LABELS: Record<AppRoleSlug, string> = {
    admin: "مدير النظام",
    general_manager: "المدير العام",
    accountant: "المحاسب",
    procurement_manager: "مدير المشتريات",
    reviewer: "المراجع",
    warehouse_keeper: "أمين المخزن",
    site_engineer: "مهندس الموقع",
    employee: "الموظف",
};

export const getPrimaryRoleSlug = (user: User | null): AppRoleSlug | null => {
    if (!user?.roles?.length) {
        return null;
    }

    return (
        ROLE_HOME_PRIORITY.find((roleSlug) => hasRole(user, roleSlug)) ?? null
    );
};

export const getRoleHomePath = (roleSlug: AppRoleSlug | null): string => {
    if (!roleSlug) {
        return "/employee";
    }

    return ROLE_HOME_PATHS[roleSlug];
};

export const getRoleLabel = (roleSlug: AppRoleSlug | null): string => {
    if (!roleSlug) {
        return "مستخدم";
    }

    return ROLE_LABELS[roleSlug];
};
