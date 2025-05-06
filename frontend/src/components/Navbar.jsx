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
        <nav className="bg-black/85 backdrop-blur-sm p-4 shadow-md">
            <div className="font-heading container mx-auto flex justify-between items-center">
                <Link to="/" className="text-white text-2xl font-extrabold">
                    Football League
                </Link>
                <div className="space-x-4">
                    <Link
                        to="/teams"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/teams')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        Đội bóng
                    </Link>
                    <Link
                        to="/matches"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/matches')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        Trận đấu
                    </Link>
                    <Link
                        to="/players"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/players')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        Cầu thủ
                    </Link>
                    <Link
                        to="/seasons"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/seasons')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        Mùa giải
                    </Link>
                    <Link
                        to="/regulations"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/regulations')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        Quy định
                    </Link>
                    <Link
                        to="/rankings"
                        className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/rankings')
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        Xếp hạng
                    </Link>
                    {token ? (
                        <button
                            onClick={handleLogout}
                            className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/logout')
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                        >
                            Đăng xuất
                        </button>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/login')
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                Đăng nhập
                            </Link>
                            <Link
                                to="/register"
                                className={`font-heading rounded-md px-3 py-2 text-base font-extrabold ${isActive('/register')
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>

    );
};

export default Navbar;