import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/notifications/NotificationBell";
import GlobalSearchBar from "../components/search/GlobalSearchBar";
import { getPrimaryRoleSlug, getRoleLabel } from "../routes/roleRouting";
import PageHeader from "../components/ui/PageHeader";
import { usePersistedState } from "../hooks/usePersistedState";

export const AuthenticatedLayout: React.FC = () => {
    const { user, logout, sessionExpired, hasPermission } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = usePersistedState('layout.sidebar-open.v1', true);
    const location = useLocation();

    const primaryRoleSlug = getPrimaryRoleSlug(user);
    const primaryRoleLabel = getRoleLabel(primaryRoleSlug);

    const isActivePath = (path: string): boolean => {
        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        );
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    const linkClassName = (path: string): string => {
        const active = isActivePath(path);
        return `flex items-center min-h-11 px-3 sm:px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
            active
                ? "text-[#f0d695] bg-[#2a2111]/60 border-r-4 border-[#c7a45b] shadow-lg shadow-[#a47a2c]/10"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
        }`;
    };

    const renderRoleNavigation = () => {
        switch (primaryRoleSlug) {
            case "reviewer":
                return (
                    <>
                        <Link to="/requests" className={linkClassName("/requests")}><span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات الشراء الخاصة بي</Link>
                        <Link to="/requests/create" className={linkClassName("/requests/create")}><span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء</Link>
                        <Link
                            to="/reviewer"
                            className={linkClassName("/reviewer")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📊</span> لوحة المراجعة
                        </Link>
                        <Link
                            to="/reviewer/requests"
                            className={linkClassName("/reviewer/requests")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات المراجعة
                        </Link>
                        <Link
                            to="/reviewer/purchase-quotes"
                            className={linkClassName("/reviewer/purchase-quotes")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">💰</span> ترشيح عروض الأسعار
                        </Link>
                    </>
                );
            case "warehouse_keeper":
                return (
                    <>
                        <Link to="/requests" className={linkClassName("/requests")}><span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات الشراء الخاصة بي</Link>
                        <Link to="/requests/create" className={linkClassName("/requests/create")}><span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء</Link>
                        <Link to="/warehouse" className={linkClassName("/warehouse")}><span className="ml-2.5 text-sm" aria-hidden="true">📦</span> استلام المواد
                        </Link>
                    </>
                );
            case "site_engineer":
                return (
                    <>
                        <Link to="/requests" className={linkClassName("/requests")}><span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات الشراء الخاصة بي</Link>
                        <Link to="/requests/create" className={linkClassName("/requests/create")}><span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء</Link>
                        <Link to="/site-engineer" className={linkClassName("/site-engineer")}><span className="ml-2.5 text-sm" aria-hidden="true">🧰</span> اعتماد استلام الموقع
                        </Link>
                    </>
                );
            case "procurement_manager":
                return (
                    <>
                        <Link to="/requests" className={linkClassName("/requests")}><span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات الشراء الخاصة بي</Link>
                        <Link to="/requests/create" className={linkClassName("/requests/create")}><span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء</Link>
                        <Link
                            to="/procurement"
                            className={linkClassName("/procurement")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📊</span> لوحة المشتريات
                        </Link>
                        <Link
                            to="/procurement/purchase-requests"
                            className={linkClassName("/procurement/purchase-requests")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">⊛</span> طلبات الشراء المعتمدة
                        </Link>
                        <Link
                            to="/procurement/purchase-orders"
                            className={linkClassName("/procurement/purchase-orders")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📋</span> أوامر الشراء
                        </Link>
                        <Link
                            to="/procurement/suppliers"
                            className={linkClassName("/procurement/suppliers")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">🏢</span> إدارة الموردين
                        </Link>
                        <Link
                            to="/procurement/reports"
                            className={linkClassName("/procurement/reports")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📈</span> التقارير والتحليلات
                        </Link>
                    </>
                );
            case "accountant":
                return (
                    <>
                        <Link to="/requests" className={linkClassName("/requests")}><span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات الشراء الخاصة بي</Link>
                        <Link to="/requests/create" className={linkClassName("/requests/create")}><span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء</Link>
                        <Link
                            to="/accounting"
                            className={linkClassName("/accounting")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📊</span> لوحة المحاسبة
                        </Link>
                        <Link
                            to="/accounting/purchase-requests"
                            className={linkClassName("/accounting/purchase-requests")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">✅</span> موافقات الطلبات المالية
                        </Link>
                        <Link
                            to="/accounting/purchase-orders"
                            className={linkClassName("/accounting/purchase-orders")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📋</span> أوامر الشراء للحسابات
                        </Link>
                        <Link
                            to="/accounting/purchase-quotes"
                            className={linkClassName("/accounting/purchase-quotes")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">💰</span> ترشيح عروض الأسعار
                        </Link>
                        <Link
                            to="/accounting/supplier-payments"
                            className={linkClassName("/accounting/supplier-payments")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">💳</span> فواتير ودفعات الموردين
                        </Link>
                        <Link
                            to="/accounting/supplier-accounts"
                            className={linkClassName("/accounting/supplier-accounts")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">🏦</span> حسابات الموردين
                        </Link>
                    </>
                );
            case "general_manager":
                return (
                    <>
                        <Link to="/requests" className={linkClassName("/requests")}><span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلبات الشراء الخاصة بي</Link>
                        <Link to="/requests/create" className={linkClassName("/requests/create")}><span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء</Link>
                        <Link
                            to="/general-manager"
                            className={linkClassName("/general-manager")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📊</span> لوحة المدير العام
                        </Link>
                        <Link
                            to="/general-manager/purchase-requests"
                            className={linkClassName("/general-manager/purchase-requests")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">✅</span> طلبات القرار التنفيذي
                        </Link>
                        <Link
                            to="/general-manager/purchase-quotes"
                            className={linkClassName("/general-manager/purchase-quotes")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">⚖️</span> قرار عروض الأسعار
                        </Link>
                        <Link
                            to="/general-manager/purchase-orders"
                            className={linkClassName("/general-manager/purchase-orders")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📋</span> أوامر الشراء الصادرة — العرض التنفيذي
                        </Link>
                    </>
                );
            case "admin":
                return (
                    <>
                        <Link to="/admin" className={linkClassName("/admin")}><span className="ml-2.5 text-sm" aria-hidden="true">⚙️</span> لوحة مدير النظام</Link>
                        <Link to="/admin/system-monitor" className={linkClassName("/admin/system-monitor")}><span className="ml-2.5 text-sm" aria-hidden="true">🩺</span> مراقبة النظام والـDeploy</Link>
                        <Link to="/admin/users" className={linkClassName("/admin/users")}><span className="ml-2.5 text-sm" aria-hidden="true">👥</span> إدارة المستخدمين</Link>
                        <Link to="/admin/roles" className={linkClassName("/admin/roles")}><span className="ml-2.5 text-sm" aria-hidden="true">🛡️</span> الأدوار</Link>
                        <Link to="/admin/permissions" className={linkClassName("/admin/permissions")}><span className="ml-2.5 text-sm" aria-hidden="true">🔑</span> الصلاحيات</Link>
                        <Link to="/admin/departments" className={linkClassName("/admin/departments")}><span className="ml-2.5 text-sm" aria-hidden="true">🏢</span> الأقسام</Link>
                        <Link to="/admin/categories" className={linkClassName("/admin/categories")}><span className="ml-2.5 text-sm" aria-hidden="true">📁</span> التصنيفات</Link>
                        <Link to="/admin/items" className={linkClassName("/admin/items")}><span className="ml-2.5 text-sm" aria-hidden="true">📦</span> الأصناف</Link>
                        <Link to="/admin/suppliers" className={linkClassName("/admin/suppliers")}><span className="ml-2.5 text-sm" aria-hidden="true">🏢</span> الموردين</Link>
                    </>
                );
            case "employee":
            default:
                return (
                    <>
                        <Link
                            to="/employee"
                            className={linkClassName("/employee")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📊</span> لوحة الموظف
                        </Link>
                        <Link
                            to="/employee/requests"
                            className={linkClassName("/employee/requests")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">📋</span> طلباتي
                        </Link>
                        <Link
                            to="/employee/requests/create"
                            className={linkClassName("/employee/requests/create")}
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">✍️</span> إنشاء طلب شراء
                        </Link>
                    </>
                );
        }
    };

    return (
        <div
            dir="rtl"
            className="min-h-screen flex flex-col font-sans bg-[#0b1220] text-slate-100"
        >
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md text-white shadow-xl border-b border-slate-800/80">
                                    <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between min-h-16 py-2">

                        {/* Sidebar Toggle + Company Logo & Title */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={() => { setSidebarOpen(current => !current); setMobileMenuOpen(false); }}
                                aria-label={sidebarOpen ? 'إخفاء القائمة الجانبية' : 'إظهار القائمة الجانبية'}
                                aria-expanded={sidebarOpen}
                                className="flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-2 text-lg text-cyan-300 shadow-inner hover:border-cyan-700 hover:bg-slate-800"
                            >
                                {sidebarOpen ? '‹' : '☰'}
                            </button>
                            <div className="flex items-center space-x-3 space-x-reverse">
                            <div className="w-10 h-10 rounded-xl bg-[#11100e] border border-[#b89552]/60 p-1.5 flex items-center justify-center shadow-inner shadow-black/30">
                                <img src="/eshbelia-logo.png" alt="شعار شركة الإشبيليّة" className="h-full w-full object-contain" />
                            </div>
                            <div className="hidden sm:flex flex-col min-w-0">
                                <span className="text-base font-black tracking-tight text-slate-100">
                                    <span className="truncate">شركة الإشبيليّة</span>
                                </span>
                                <span className="text-[10px] font-bold tracking-wide text-[#d4b36a]">
                                    <span className="truncate">للتطوير العقاري والمقاولات</span>
                                </span>
                                <span className="text-[9px] font-semibold text-slate-500">
                                    <span className="truncate">نظام المشتريات التشغيلية</span>
                                </span>
                            </div>
                            </div>
                        </div>

                        {/* Global Search Bar (Desktop Center) */}
                        <div className="hidden md:flex flex-1 justify-center px-4 max-w-lg">
                            <GlobalSearchBar />
                        </div>

                        {/* User الملف الشخصي & الإجراءات */}
                        <div className="hidden md:flex items-center space-x-4 space-x-reverse">
                            <NotificationBell />
                            <div className="h-6 w-px bg-slate-800"></div>
                            <Link
                                to="/profile"
                                className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700/60"
                            >
                                <div className="w-8 h-8 rounded-full bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center justify-center text-xs">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-100">
                                        {user?.name}
                                    </div>
                                    <div className="text-[10px] text-cyan-400 font-medium">
                                        {primaryRoleLabel}
                                    </div>
                                </div>
                            </Link>
                            <button
                                type="button"
                                onClick={() => logout()}
                                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-rose-800/50"
                            >
                                تسجيل الخروج
                            </button>
                        </div>

                        {/* Mobile Toggle Button */}
                        <div className="md:hidden flex items-center gap-2">
                            <GlobalSearchBar />
                            <NotificationBell />
                            <button
                                type="button"
                                onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setSidebarOpen(true); }}
                                aria-label="Toggle navigation menu"
                                aria-expanded={mobileMenuOpen}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-800/80 p-2.5 text-slate-300 hover:text-white border border-slate-700"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d={
                                            mobileMenuOpen
                                                ? "M6 18L18 6M6 6l12 12"
                                                : "M4 6h16M4 12h16M4 18h16"
                                        }
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Container */}
            <div className="relative flex-1 flex flex-col md:flex-row max-w-[1800px] w-full mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 gap-2 sm:gap-3">
                {mobileMenuOpen && sidebarOpen && <button type="button" aria-label="إغلاق القائمة الجانبية" onClick={closeMobileMenu} className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-[1px] md:hidden" />}
                {/* Sidebar Nav */}
                <aside
                    className={`fixed inset-x-2 bottom-2 top-[4.75rem] z-40 max-h-[calc(100dvh-5.5rem)] w-auto overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-xl backdrop-blur-sm transition-all duration-200 md:relative md:inset-auto md:bottom-auto md:top-auto md:max-h-none md:w-64 md:overflow-visible md:p-4 ${
                        sidebarOpen ? (mobileMenuOpen ? "block" : "hidden md:block") : "hidden"
                    }`}
                >
                    <div className="px-3 py-2 mb-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            القائمة الرئيسية
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                            {primaryRoleLabel}
                        </span>
                    </div>
                    <nav
                        className="space-y-1.5 pb-16 md:pb-0"
                        onClick={(event) => {
                            if ((event.target as HTMLElement).closest('a')) closeMobileMenu();
                        }}
                    >
                        {renderRoleNavigation()}
                        <Link to="/my-archive" className={linkClassName('/my-archive')} onClick={closeMobileMenu}>
                            <span className="ml-2.5 text-sm" aria-hidden="true">🗂️</span> أرشيف إجراءاتي
                        </Link>
                        <div className="border-t border-slate-800/80 my-3 pt-3"></div>
                                                    <Link
                            to="/notifications"

                            className={linkClassName("/notifications")}
                            onClick={closeMobileMenu}
                        >
                            <span className="ml-2.5 text-sm">🔔</span> الإشعارات
                        </Link>
                        <Link
                            to="/profile"
                            className={linkClassName("/profile")}
                            onClick={closeMobileMenu}
                        >
                            <span className="ml-2.5 text-sm">👤</span> الملف الشخصي
                        </Link>
                        <Link
                            to="/preferences"
                            className={linkClassName("/preferences")}
                            onClick={closeMobileMenu}
                        >
                            <span className="ml-2.5 text-sm">⚙️</span> تفضيلات المستخدم
                        </Link>
                        <Link
                            to="/help"
                            className={linkClassName("/help")}
                            onClick={closeMobileMenu}
                        >
                            <span className="ml-2.5 text-sm">🧭</span> مركز المساعدة
                        </Link>
                        <button
                            type="button"
                            onClick={() => { closeMobileMenu(); logout(); }}
                            className="md:hidden flex items-center w-full min-h-11 px-3 sm:px-4 py-2.5 mt-3 text-xs font-bold text-rose-300 hover:bg-rose-950/40 rounded-xl border-t border-slate-800/80"
                        >
                            <span className="ml-2.5 text-sm" aria-hidden="true">↪</span> تسجيل الخروج
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 w-full bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-5 min-h-[calc(100dvh-6rem)] backdrop-blur-sm overflow-visible flex flex-col">
                    {sessionExpired && (
                        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-700/70 bg-amber-950/30 px-4 py-3 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between" role="alert" aria-live="assertive">
                            <span>انتهت جلسة الدخول. احفظ أي بيانات محلية، ثم سجّل الدخول مرة أخرى للمتابعة.</span>
                            <Link to="/login" className="font-bold text-amber-100 underline underline-offset-4 hover:text-white">إعادة تسجيل الدخول</Link>
                        </div>
                    )}
                    <PageHeader />
                    <Outlet />
                </main>
            </div>

            {/* Floating Quick Action Button (+) for All Roles except Admin */}
            {primaryRoleSlug !== 'admin' && location.pathname !== '/requests/create' && location.pathname !== '/employee/requests/create' && (
                <Link
                    to={primaryRoleSlug === 'employee' ? '/employee/requests/create' : '/requests/create'}
                    className="group fixed bottom-6 left-6 z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 p-3.5 sm:px-5 sm:py-3.5 text-slate-950 font-black shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-400/60 border border-cyan-200/50 hover:scale-105 active:scale-95 transition-all duration-200 select-none"
                    aria-label="إنشاء طلب شراء جديد"
                    title="إنشاء طلب شراء جديد"
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/20 text-xl font-black leading-none">
                        +
                    </span>
                    <span className="hidden sm:inline-block text-xs font-black tracking-wide">
                        طلب شراء جديد
                    </span>
                </Link>
            )}

            <footer className="mx-auto w-full max-w-[1800px] px-2 pb-3 text-center text-[10px] text-slate-500 sm:px-3 lg:px-4">
                شركة الإشبيليّة للتطوير العقاري والمقاولات · منظومة المشتريات التشغيلية · <a href="https://ishbilia.dev" target="_blank" rel="noreferrer" className="text-[#d4b36a] hover:text-[#f0d695]">الموقع الرسمي</a> · <a href="https://web.facebook.com/Ishbilia.realestate?locale=ar_AR" target="_blank" rel="noreferrer" className="text-[#d4b36a] hover:text-[#f0d695]">صفحة Facebook</a>
            </footer>
        </div>
    );
};

export default AuthenticatedLayout;
