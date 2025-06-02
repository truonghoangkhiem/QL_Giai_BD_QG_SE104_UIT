import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', { username, email, password });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng ký thất bại');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Cột trái: Form đăng ký (Theme tối giống Login.jsx) */}
            <div className="w-full md:w-1/2 lg:w-2/5 bg-gray-500 flex items-center justify-center p-4 md:p-8">
                <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-center text-gray-300 py-3">
                        Tạo tài khoản
                    </h2>
                    {error && (
                        <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md">
                            {error}
                        </p>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Tên người dùng"
                                className="w-full p-3 border border-gray-600 bg-gray-700 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red placeholder-gray-400 shadow-sm"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full p-3 border border-gray-600 bg-gray-700 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red placeholder-gray-400 shadow-sm"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                className="w-full p-3 border border-gray-600 bg-gray-700 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red placeholder-gray-400 shadow-sm"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-theme-red hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-200 text-lg"
                        >
                            Đăng ký
                        </button>
                    </form>
                    <p className="text-center text-gray-400 mt-8">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="font-semibold text-theme-red hover:text-red-500 hover:underline">
                            Đăng nhập ngay
                        </Link>
                    </p>
                </div>
            </div>

            {/* Cột phải: Hình ảnh nền (Cristiano Ronaldo) */}
            <div
                className="hidden md:block md:w-1/2 lg:w-3/5 bg-cover bg-center"
                style={{ backgroundImage: "url('https://r4.wallpaperflare.com/wallpaper/819/699/581/cristiano-ronaldo-real-madrid-wallpaper-2014-wallpaper-433bd8dda095f3fd8b1536b6f6874848.jpg')" }}
            >
                {/* Có thể giữ lại hoặc bỏ trống tùy ý */}
            </div>
        </div>
    );
};

export default Register;