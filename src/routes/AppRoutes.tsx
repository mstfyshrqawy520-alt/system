import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthenticatedLayout from "../layouts/AuthenticatedLayout";
import LoginPage from "../pages/LoginPage";
import ProtectedPage from "../pages/ProtectedPage";
const EmployeeDashboardPage = React.lazy(() => import("../pages/employee/EmployeeDashboardPage"));
const PurchaseRequestsPage = React.lazy(() => import("../pages/employee/PurchaseRequestsPage"));
const CreatePurchaseRequestPage = React.lazy(() => import("../pages/employee/CreatePurchaseRequestPage"));
const EditPurchaseRequestPage = React.lazy(() => import("../pages/employee/EditPurchaseRequestPage"));
const PurchaseRequestDetailsPage = React.lazy(() => import("../pages/employee/PurchaseRequestDetailsPage"));
const AdminSystemMonitoringPage = React.lazy(() => import("../pages/admin/AdminSystemMonitoringPage"));
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
const ReviewerDashboardPage = React.lazy(() => import("../pages/reviewer/ReviewerDashboardPage"));
const ReviewerRequestsPage = React.lazy(() => import("../pages/reviewer/ReviewerRequestsPage"));
const ReviewerPurchaseRequestDetailsPage = React.lazy(() => import("../pages/reviewer/ReviewerPurchaseRequestDetailsPage"));
const ReviewPurchaseRequestPage = React.lazy(() => import("../pages/reviewer/ReviewPurchaseRequestPage"));
const ApprovedPurchaseRequestsPage = React.lazy(() => import("../pages/procurement/ApprovedPurchaseRequestsPage"));
const CreatePurchaseOrderPage = React.lazy(() => import("../pages/procurement/CreatePurchaseOrderPage"));
const EditPurchaseOrderPage = React.lazy(() => import("../pages/procurement/EditPurchaseOrderPage"));
const PurchaseOrderDetailsPage = React.lazy(() => import("../pages/procurement/PurchaseOrderDetailsPage"));
const ProcurementManagerPage = React.lazy(() => import("../pages/procurement/ProcurementManagerPage"));
const ProcurementReportsPage = React.lazy(() => import("../pages/procurement/ProcurementReportsPage"));
const AccountingDashboardPage = React.lazy(() => import("../pages/accounting/AccountingDashboardPage"));
const AccountingPurchaseOrdersPage = React.lazy(() => import("../pages/accounting/AccountingPurchaseOrdersPage"));
const AccountingPurchaseRequestsPage = React.lazy(() => import("../pages/accounting/AccountingPurchaseRequestsPage"));
const AccountingPurchaseOrderDetailsPage = React.lazy(() => import("../pages/accounting/AccountingPurchaseOrderDetailsPage"));
const GeneralManagerDashboardPage = React.lazy(() => import("../pages/general-manager/GeneralManagerDashboardPage"));
const GeneralManagerPurchaseRequestsPage = React.lazy(() => import("../pages/general-manager/GeneralManagerPurchaseRequestsPage"));
const GeneralManagerPurchaseOrdersPage = React.lazy(() => import("../pages/general-manager/GeneralManagerPurchaseOrdersPage"));
const GeneralManagerPurchaseOrderDetailsPage = React.lazy(() => import("../pages/general-manager/GeneralManagerPurchaseOrderDetailsPage"));
const GeneralManagerReportsPage = React.lazy(() => import("../pages/general-manager/GeneralManagerReportsPage"));
const PurchaseQuotesDecisionPage = React.lazy(() => import("../pages/purchase-quotes/PurchaseQuotesDecisionPage"));
const PurchaseReceiptPage = React.lazy(() => import("../pages/receipts/PurchaseReceiptPage"));
const SupplierPaymentsPage = React.lazy(() => import("../pages/accounting/SupplierPaymentsPage"));
const SupplierAccountsPage = React.lazy(() => import("../pages/accounting/SupplierAccountsPage"));
const LandParcelsPage = React.lazy(() => import("../pages/accounting/LandParcelsPage"));
const NotificationsPage = React.lazy(() => import("../pages/NotificationsPage"));
const RoleArchivePage = React.lazy(() => import("../pages/RoleArchivePage"));
const ProfilePage = React.lazy(() => import("../pages/ProfilePage"));
const HelpCenterPage = React.lazy(() => import("../pages/HelpCenterPage"));
const UserPreferencesPage = React.lazy(() => import("../pages/UserPreferencesPage"));
const AdminDashboardPage = React.lazy(() => import("../pages/admin/AdminDashboardPage"));
const UsersPage = React.lazy(() => import("../pages/admin/UsersPage"));
const RolesPage = React.lazy(() => import("../pages/admin/RolesPage"));
const PermissionsPage = React.lazy(() => import("../pages/admin/PermissionsPage"));
const DepartmentsPage = React.lazy(() => import("../pages/admin/DepartmentsPage"));
const CategoriesPage = React.lazy(() => import("../pages/admin/CategoriesPage"));
const ItemsPage = React.lazy(() => import("../pages/admin/ItemsPage"));
const SuppliersPage = React.lazy(() => import("../pages/admin/SuppliersPage"));
import RoleHomeRedirect from "./RoleHomeRedirect";
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from "../pages/ErrorPages";

export const AppRoutes: React.FC = () => {
    return (
        <React.Suspense fallback={
            <div className="min-h-[40vh] flex items-center justify-center text-cyan-300" dir="rtl">جاري تحميل الصفحة...</div>
        }>
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes wrapped in Authenticated Layout */}
            <Route
                element={
                    <ProtectedRoute>
                        <AuthenticatedLayout />
                    </ProtectedRoute>
                }
            >
                <Route path="/protected" element={<ProtectedPage />} />
                {/* Shared routes available to all authenticated users */}
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/my-archive" element={<RoleArchivePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/help" element={<HelpCenterPage />} />
                <Route path="/preferences" element={<UserPreferencesPage />} />

                {/* ── Shared Purchase Request Routes for all operational roles ── */}
                <Route element={<RoleRoute allowedRoles={["employee", "reviewer", "warehouse_keeper", "site_engineer", "procurement_manager", "accountant", "general_manager"]} />}>
                    <Route path="/requests" element={<PurchaseRequestsPage />} />
                    <Route path="/requests/create" element={<CreatePurchaseRequestPage />} />
                    <Route path="/requests/:id" element={<PurchaseRequestDetailsPage />} />
                    <Route path="/requests/:id/edit" element={<EditPurchaseRequestPage />} />
                </Route>

                {/* ── Admin Routes ─────────────────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/system-monitor" element={<AdminSystemMonitoringPage />} />
                    <Route path="/admin/users" element={<UsersPage />} />
                    <Route path="/admin/roles" element={<RolesPage />} />
                    <Route path="/admin/permissions" element={<PermissionsPage />} />
                    <Route path="/admin/departments" element={<DepartmentsPage />} />
                    <Route path="/admin/categories" element={<CategoriesPage />} />
                    <Route path="/admin/items" element={<ItemsPage />} />
                    <Route path="/admin/suppliers" element={<SuppliersPage />} />
                </Route>

                {/* ── Employee Routes ───────────────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["employee"]} />}>
                    <Route path="/employee" element={<EmployeeDashboardPage />} />
                    <Route path="/employee/requests" element={<PurchaseRequestsPage />} />
                    <Route path="/employee/requests/create" element={<CreatePurchaseRequestPage />} />
                    <Route path="/employee/requests/:id" element={<PurchaseRequestDetailsPage />} />
                    <Route path="/employee/requests/:id/edit" element={<EditPurchaseRequestPage />} />
                </Route>

                {/* ── Reviewer Routes ───────────────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["reviewer"]} />}>
                    <Route path="/reviewer" element={<ReviewerDashboardPage />} />
                    <Route path="/reviewer/requests" element={<ReviewerRequestsPage />} />
                    <Route path="/reviewer/requests/:id" element={<ReviewerPurchaseRequestDetailsPage />} />
                    <Route path="/reviewer/requests/:id/review" element={<ReviewPurchaseRequestPage />} />
                    <Route path="/reviewer/purchase-quotes" element={<PurchaseQuotesDecisionPage mode="recommend" />} />
                </Route>

                {/* ── Warehouse Keeper Routes ─────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["warehouse_keeper"]} />}>
                    <Route path="/warehouse" element={<PurchaseReceiptPage mode="warehouse" />} />
                </Route>

                {/* ── Site Engineer Routes ──────────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["site_engineer"]} />}>
                    <Route path="/site-engineer" element={<PurchaseReceiptPage mode="site" />} />
                </Route>

                {/* ── Procurement Manager Routes ────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["procurement_manager"]} />}>
                    <Route path="/procurement" element={<ProcurementManagerPage />} />
                    <Route path="/procurement/approved-requests" element={<ApprovedPurchaseRequestsPage />} />
                    <Route path="/procurement/purchase-orders/create" element={<CreatePurchaseOrderPage />} />
                    <Route path="/procurement/purchase-orders/:id/edit" element={<EditPurchaseOrderPage />} />
                    <Route path="/procurement/purchase-orders/:id" element={<PurchaseOrderDetailsPage />} />
                    <Route path="/procurement/*" element={<ProcurementManagerPage />} />
                </Route>

                {/* ── Accounting Routes ─────────────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["accountant"]} />}>
                    <Route path="/accounting" element={<AccountingDashboardPage />} />
                    <Route path="/accounting/purchase-requests" element={<AccountingPurchaseRequestsPage />} />
                    <Route path="/accounting/purchase-orders" element={<AccountingPurchaseOrdersPage />} />
                    <Route path="/accounting/purchase-orders/:id" element={<AccountingPurchaseOrderDetailsPage />} />
                    <Route path="/accounting/purchase-quotes" element={<PurchaseQuotesDecisionPage mode="recommend" />} />
                    <Route path="/accounting/supplier-payments" element={<SupplierPaymentsPage />} />
                    <Route path="/accounting/supplier-accounts" element={<SupplierAccountsPage />} />
                    <Route path="/accounting/land-parcels" element={<LandParcelsPage />} />
                </Route>

                {/* ── General Manager Routes ────────────────────────────────── */}
                <Route element={<RoleRoute allowedRoles={["general_manager"]} />}>
                    <Route path="/general-manager" element={<GeneralManagerDashboardPage />} />
                    <Route path="/general-manager/purchase-requests" element={<GeneralManagerPurchaseRequestsPage />} />
                    <Route path="/general-manager/purchase-quotes" element={<PurchaseQuotesDecisionPage mode="executive" />} />
                    <Route path="/general-manager/purchase-orders" element={<GeneralManagerPurchaseOrdersPage />} />
                    <Route path="/general-manager/purchase-orders/:id" element={<GeneralManagerPurchaseOrderDetailsPage />} />
                    <Route path="/general-manager/reports" element={<GeneralManagerReportsPage />} />
                </Route>
            </Route>

            {/* Root & Error Routes */}
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/500" element={<ServerErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </React.Suspense>
    );
};

export default AppRoutes;
