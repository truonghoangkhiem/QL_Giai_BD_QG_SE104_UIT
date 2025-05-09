import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    BuildingOfficeIcon,
    TrophyIcon,
    UserIcon,
    CalendarIcon,
    DocumentTextIcon,
    ChartBarIcon,
    ArrowLeftOnRectangleIcon,
    ArrowRightOnRectangleIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';

const Navbar = ({ token, setToken }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed left-0 top-0 h-screen bg-gray-900 shadow-md w-16 hover:w-48 transition-all duration-300 ease-in-out group z-50">
            <div className="flex flex-col h-full">
                {/* Logo */}
                <Link to="/" className="text-white p-4 flex items-center gap-3">
                    <HomeIcon className="h-8 w-8" />
                    <span className="text-xl font-bold uppercase tracking-tight hidden group-hover:block">
                        Home
                    </span>
                </Link>

                {/* Menu items */}
                <div className="flex flex-col flex-1 space-y-2 px-2">
                    <Link
                        to="/teams"
                        className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                            isActive('/teams')
                                ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                : 'text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                    >
                        <BuildingOfficeIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden group-hover:block">Đội bóng</span>
                    </Link>
                    <Link
                        to="/matches"
                        className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                            isActive('/matches')
                                ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                : 'text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                    >
                        <TrophyIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden group-hover:block">Trận đấu</span>
                    </Link>
                    <Link
                        to="/players"
                        className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                            isActive('/players')
                                ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                : 'text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                    >
                        <UserIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden group-hover:block">Cầu thủ</span>
                    </Link>
                    <Link
                        to="/seasons"
                        className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                            isActive('/seasons')
                                ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                : 'text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                    >
                        <CalendarIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden group-hover:block">Mùa giải</span>
                    </Link>
                    <Link
                        to="/regulations"
                        className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                            isActive('/regulations')
                                ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                : 'text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                    >
                        <DocumentTextIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden group-hover:block">Quy định</span>
                    </Link>
                    <Link
                        to="/rankings"
                        className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                            isActive('/rankings')
                                ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                : 'text-gray-300 hover:bg-red-600 hover:text-white'
                        }`}
                    >
                        <ChartBarIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden group-hover:block">Xếp hạng</span>
                    </Link>
                </div>

                {/* Đăng nhập/Đăng xuất */}
                <div className="px-2 pb-4">
                    {token ? (
                        <button
                            onClick={handleLogout}
                            className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 w-full uppercase tracking-tight ${
                                isActive('/logout')
                                    ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                    : 'text-gray-300 hover:bg-red-600 hover:text-white'
                            }`}
                        >
                            <ArrowLeftOnRectangleIcon className="h-6 w-6 flex-shrink-0" />
                            <span className="hidden group-hover:block">Đăng xuất</span>
                        </button>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 uppercase tracking-tight ${
                                    isActive('/login')
                                        ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                        : 'text-gray-300 hover:bg-red-600 hover:text-white'
                                }`}
                            >
                                <ArrowRightOnRectangleIcon className="h-6 w-6 flex-shrink-0" />
                                <span className="hidden group-hover:block">Đăng nhập</span>
                            </Link>
                            <Link
                                to="/register"
                                className={`rounded-lg px-3 py-2 text-lg font-semibold flex items-center gap-3 mt-2 uppercase tracking-tight ${
                                    isActive('/register')
                                        ? 'bg-gray-900 text-white border-l-4 border-red-600'
                                        : 'text-gray-300 hover:bg-red-600 hover:text-white'
                                }`}
                            >
                                <UserPlusIcon className="h-6 w-6 flex-shrink-0" />
                                <span className="hidden group-hover:block">Đăng ký</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;