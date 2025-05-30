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
        <div className="min-h-screen bg-[#F9FAFB] bg-cover bg-center flex items-center justify-center p-4"
            style={{ backgroundImage: "url('https://media.istockphoto.com/id/504637736/vi/anh/th%E1%BB%A7-m%C3%B4n-b%C3%B3ng-%C4%91%C3%A1-b%E1%BA%AFt-b%C3%B3ng.jpg?s=612x612&w=0&k=20&c=ltnY8LxWCiRp5nwYVpglNiHHe1SWCLS9isyOfQMvD2E=')" }}>
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 max-w-md w-full"> {/* Tăng độ mờ và bóng */}
                <h2 className="text-4xl font-heading font-bold mb-6 text-center text-gray-800 py-3">Đăng ký</h2> {/* Đổi màu text */}
                {error && <p className="text-red-600 text-center mb-4 bg-red-100 p-3 rounded-md">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tên người dùng"
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red text-gray-700 placeholder-gray-400 shadow-sm" // Chuẩn hóa input
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red text-gray-700 placeholder-gray-400 shadow-sm" // Chuẩn hóa input
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mật khẩu"
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-red text-gray-700 placeholder-gray-400 shadow-sm" // Chuẩn hóa input
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-theme-red hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-200 text-lg" // Chuẩn hóa button
                    >
                        Đăng ký
                    </button>
                </form>
                <p className="text-center text-gray-600 mt-8"> {/* Đổi màu text */}
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="font-semibold text-theme-red hover:text-red-500 hover:underline">
                        Đăng nhập ngay
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;