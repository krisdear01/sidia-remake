import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authApi, clearAuthToken } from '../api/client';
import {
    LayoutDashboard,
    Building2,
    DoorOpen,
    Package,
    Map,
    Calendar,
    Settings,
    LogOut,
    Menu,
    X,
    MapPin,
    Bell,
    ChevronDown,
    Gavel,
    Users,
    ShieldCheck,
    TrendingDown,
} from 'lucide-react';

interface NavItem {
    path: string;
    icon: React.ElementType;
    label: string;
    end?: boolean;
    badge?: string;
}

const navItems: NavItem[] = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { path: '/admin/buildings', icon: Building2, label: 'Gedung' },
    { path: '/admin/rooms', icon: DoorOpen, label: 'Ruangan' },
    { path: '/admin/validate-rooms', icon: ShieldCheck, label: 'Validasi Ruangan' },
    { path: '/admin/assets', icon: Package, label: 'Aset' },
    { path: '/admin/penyusutan', icon: TrendingDown, label: 'Penyusutan Aset', badge: 'Soon' },
    { path: '/admin/polygons', icon: Map, label: 'Peta & Polygon' },
    { path: '/admin/schedules', icon: Calendar, label: 'Jadwal' },
    { path: '/admin/auctions', icon: Gavel, label: 'E-Tender' },
];

export const AdminLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Load user info
        authApi.me().then(setUser).catch(() => {
            navigate('/admin/login');
        });
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch {
            clearAuthToken();
        }
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-slate-900 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 flex-shrink-0">
                        <MapPin className="text-white" size={20} />
                    </div>
                    {sidebarOpen && (
                        <div className="overflow-hidden">
                            <h1 className="text-lg font-bold text-white whitespace-nowrap">SIAU</h1>
                            <p className="text-xs text-slate-400 whitespace-nowrap">Admin Panel</p>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <item.icon size={20} className="flex-shrink-0" />
                            {sidebarOpen && (
                                <span className="whitespace-nowrap flex-1 flex items-center justify-between gap-2">
                                    <span>{item.label}</span>
                                    {item.badge && (
                                        <span className="rounded-full bg-teal-500/20 text-teal-300 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                                            {item.badge}
                                        </span>
                                    )}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Sidebar Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="m-3 p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </aside>

            {/* Main Content */}
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'
                    }`}
            >
                {/* Top Bar */}
                <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Admin Dashboard</h2>
                            <p className="text-sm text-slate-500">Kelola aset dan ruangan Universitas Udayana</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                <Bell size={20} />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                        {user?.name?.charAt(0) || 'A'}
                                    </div>
                                    {user && (
                                        <div className="text-left hidden md:block">
                                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    )}
                                    <ChevronDown size={16} className="text-slate-400" />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                                        <button
                                            onClick={() => navigate('/admin/settings')}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <Settings size={16} />
                                            Settings
                                        </button>
                                        <hr className="my-2 border-slate-100" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <LogOut size={16} />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
