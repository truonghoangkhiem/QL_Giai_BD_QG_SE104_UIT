import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ token, setToken }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
        navigate('/login');
    };

    // Kiểm tra xem mục có phải là trang hiện tại không
    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed left-0 top-0 h-screen bg-black/85 backdrop-blur-sm shadow-md w-16 hover:w-48 transition-all duration-300 ease-in-out group z-50">
            <div className="font-heading flex flex-col h-full">
                {/* Logo */}
                <Link to="/" className="text-white text-xl font-extrabold p-4 flex items-center gap-3">
                    <span className="text-2xl">⚽</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Home
                    </span>
                </Link>

                {/* Menu items */}
                <div className="flex flex-col flex-1 space-y-2 px-2">
                    <Link
                        to="/teams"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/teams')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">🏟️</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Đội bóng
                        </span>
                    </Link>
                    <Link
                        to="/matches"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/matches')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">⚽</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Trận đấu
                        </span>
                    </Link>
                    <Link
                        to="/players"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/players')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">👤</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Cầu thủ
                        </span>
                    </Link>
                    <Link
                        to="/seasons"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/seasons')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">📅</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Mùa giải
                        </span>
                    </Link>
                    <Link
                        to="/regulations"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/regulations')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">📜</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Quy định
                        </span>
                    </Link>
                    <Link
                        to="/rankings"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/rankings')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <span className="text-xl">🏆</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Xếp hạng
                        </span>
                    </Link>
                </div>

                {/* Đăng nhập/Đăng xuất */}
                <div className="px-2 pb-4">
                    {token ? (
                        <button
                            onClick={handleLogout}
                            className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 w-full ${isActive('/logout')
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                        >
                            <span className="text-xl">🚪</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Đăng xuất
                            </span>
                        </button>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 ${isActive('/login')
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">🔑</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    Đăng nhập
                                </span>
                            </Link>
                            <Link
                                to="/register"
                                className={`font-heading rounded-md px-3 py-2 text-base font-extrabold flex items-center gap-3 mt-2 ${isActive('/register')
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">📝</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    Đăng ký
                                </span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;