import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { User } from "../types/auth";
import { CatalogItemAdmin, SupplierAdmin } from "../types/admin";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import UsersPage from "../pages/admin/UsersPage";
import RolesPage from "../pages/admin/RolesPage";
import PermissionsPage from "../pages/admin/PermissionsPage";
import DepartmentsPage from "../pages/admin/DepartmentsPage";
import CategoriesPage from "../pages/admin/CategoriesPage";
import ItemsPage from "../pages/admin/ItemsPage";
import SuppliersPage from "../pages/admin/SuppliersPage";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";
import ProtectedRoute from "../routes/ProtectedRoute";
import * as authStorage from "../utils/authStorage";
import * as authApi from "../api/auth";
import * as adminItemsApi from "../api/admin/items";
import * as adminSuppliersApi from "../api/admin/suppliers";

const mockAdminUser: User = {
    id: 99,
    name: "System Administrator",
    email: "admin@ashbiliya.com",
    is_active: true,
    roles: ["admin"],
    permissions: [
        "system.users.manage",
        "system.roles.manage",
        "system.permissions.manage",
        "system.departments.manage",
        "system.categories.manage",
        "system.items.manage",
        "system.suppliers.manage",
    ],
};

const mockEmployeeUser: User = {
    id: 1,
    name: "Standard Employee",
    email: "employee@ashbiliya.com",
    is_active: true,
    roles: ["employee"],
    permissions: ["purchase_request.create", "purchase_request.view_own"],
};

const mockItems: CatalogItemAdmin[] = [
    {
        id: 1,
        sku: "SKU-MONITOR-27",
        name: "4K Display Monitor 27 Inch",
        uom: "PCS",        category: { id: 10, name: "IT Equipment" },
        is_active: true,
    },
];

const mockSuppliers: SupplierAdmin[] = [
    {
        id: 1,
        code: "SUP-001",
        name: "Al-Falak Technology Corp",
        company_name: "Al-Falak Technology Corp",
        email: "info@alfalak.com",
        phone: "+966112223333",
        is_active: true,
    },
];

describe("Admin Frontend Feature Suite", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("1. Admin dashboard renders KPIs and status modules", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        vi.spyOn(adminItemsApi, "getCatalogItemsAdminApi").mockResolvedValue(
            mockItems,
        );
        vi.spyOn(adminSuppliersApi, "getSuppliersAdminApi").mockResolvedValue(
            mockSuppliers,
        );

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <AuthProvider>
                    <Routes>
                        <Route path="/admin" element={<AdminDashboardPage />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "لوحة تحكم الإدارة" }),
            ).toBeInTheDocument();
        });
        expect(
            screen.getByText("حالة وحدات إدارة النظام"),
        ).toBeInTheDocument();
    });

    it("2. Permission-based sidebar displays admin links for Admin user", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <AuthProvider>
                    <Routes>
                        <Route element={<AuthenticatedLayout />}>
                            <Route
                                path="/admin"
                                element={<AdminDashboardPage />}
                            />
                        </Route>
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByText("لوحة مدير النظام"),
            ).toBeInTheDocument();
        });
        expect(
            screen.getAllByText("إدارة المستخدمين").length,
        ).toBeGreaterThan(0);
        expect(screen.getAllByText("الأصناف").length).toBeGreaterThan(
            0,
        );
    });

    it("3. المستخدمون page renders with backend availability notice", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        const adminUsersModule = await import("../api/admin/users");
        const adminRolesModule = await import("../api/admin/roles");
        const adminDeptsModule = await import("../api/admin/departments");
        vi.spyOn(adminUsersModule, "getUsersAdminApi").mockResolvedValue([]);
        vi.spyOn(adminRolesModule, "getRolesAdminApi").mockResolvedValue([]);
        vi.spyOn(adminDeptsModule, "getDepartmentsAdminApi").mockResolvedValue([]);

        render(
            <MemoryRouter initialEntries={["/admin/users"]}>
                <AuthProvider>
                    <Routes>
                        <Route path="/admin/users" element={<UsersPage />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "إدارة المستخدمين" }),
            ).toBeInTheDocument();
        });
    });

    it("4. Roles page renders with backend availability notice", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        const adminRolesModule = await import("../api/admin/roles");
        vi.spyOn(adminRolesModule, "getRolesAdminApi").mockResolvedValue([]);

        render(
            <MemoryRouter initialEntries={["/admin/roles"]}>
                <AuthProvider>
                    <Routes>
                        <Route path="/admin/roles" element={<RolesPage />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "الأدوار" }),
            ).toBeInTheDocument();
        });
    });

    it("5. الصلاحيات page renders with backend availability notice", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        const permModule = await import("../api/admin/permissions");
        vi.spyOn(permModule, "getPermissionsAdminApi").mockRejectedValue(new Error("API Not Available"));

        render(
            <MemoryRouter initialEntries={["/admin/permissions"]}>
                <AuthProvider>
                    <Routes>
                        <Route
                            path="/admin/permissions"
                            element={<PermissionsPage />}
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "الصلاحيات" }),
            ).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(
            screen.getAllByText('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')[0],
        ).toBeInTheDocument();
    });

    it("6. الأقسام page renders with backend availability notice", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        const deptModule = await import("../api/admin/departments");
        vi.spyOn(deptModule, "getDepartmentsAdminApi").mockRejectedValue(new Error("API Not Available"));

        render(
            <MemoryRouter initialEntries={["/admin/departments"]}>
                <AuthProvider>
                    <Routes>
                        <Route
                            path="/admin/departments"
                            element={<DepartmentsPage />}
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "الأقسام" }),
            ).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(
            screen.getAllByText('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')[0],
        ).toBeInTheDocument();
    });

    it("7. التصنيفات page renders with backend availability notice", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        const catModule = await import("../api/admin/categories");
        vi.spyOn(catModule, "getCategoriesAdminApi").mockRejectedValue(new Error("API Not Available"));

        render(
            <MemoryRouter initialEntries={["/admin/categories"]}>
                <AuthProvider>
                    <Routes>
                        <Route
                            path="/admin/categories"
                            element={<CategoriesPage />}
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "التصنيفات" }),
            ).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(
            screen.getAllByText('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')[0],
        ).toBeInTheDocument();
    });

    it("8. البنود page renders and loads items from backend API", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        vi.spyOn(adminItemsApi, "getCatalogItemsAdminApi").mockResolvedValue(
            mockItems,
        );

        render(
            <MemoryRouter initialEntries={["/admin/items"]}>
                <AuthProvider>
                    <Routes>
                        <Route path="/admin/items" element={<ItemsPage />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.queryByText("SKU-MONITOR-27")).not.toBeInTheDocument();
            expect(
                screen.getByText("4K Display Monitor 27 Inch"),
            ).toBeInTheDocument();
        });
    });

    it("9. الموردون page renders and loads suppliers from backend API", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockAdminUser);
        vi.spyOn(adminSuppliersApi, "getSuppliersAdminApi").mockResolvedValue(
            mockSuppliers,
        );

        render(
            <MemoryRouter initialEntries={["/admin/suppliers"]}>
                <AuthProvider>
                    <Routes>
                        <Route
                            path="/admin/suppliers"
                            element={<SuppliersPage />}
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByText("SUP-001")).toBeInTheDocument();
            expect(
                screen.getByText("Al-Falak Technology Corp"),
            ).toBeInTheDocument();
        });
    });

    it("10. Unauthorized users without permissions are blocked from admin submodules", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue("mock_token");
        vi.spyOn(authApi, "getMeApi").mockResolvedValue(mockEmployeeUser);

        render(
            <MemoryRouter initialEntries={["/admin/users"]}>
                <AuthProvider>
                    <Routes>
                        <Route path="/admin/users" element={<UsersPage />} />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(
                screen.getByText(/عفواً، لا تملك الصلاحية اللازمة للوصول/i),
            ).toBeInTheDocument();
        });
    });

    it("11. Unauthenticated users are redirected by ProtectedRoute", async () => {
        vi.spyOn(authStorage, "getToken").mockReturnValue(null);

        render(
            <MemoryRouter initialEntries={["/admin"]}>
                <AuthProvider>
                    <Routes>
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute>
                                    <AdminDashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                <div data-testid="login-page">Login Page</div>
                            }
                        />
                    </Routes>
                </AuthProvider>
            </MemoryRouter>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("login-page")).toBeInTheDocument();
        });
    });
});
