import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const Login = ({ setToken }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            const token = response.data.data.token;
            setToken(token);
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            navigate('/teams'); // Hoặc trang Home sau khi đăng nhập
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        }
    };

    return (
        <div className="flex min-h-screen">
            <div
                className="w-full min-h-screen bg-cover bg-[center_65%]"
                style={{ backgroundImage: "url('https://imagedelivery.net/c2SKP8Bk0ZKw6UDgeeIlbw/1205ceeb-4aeb-4573-40ce-66172f50dd00/public')" }}
            >
            </div>
            <div className="w-1/2 min-h-screen bg-gray-500 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
                    <h2 className="text-4xl font-heading font-bold mb-6 text-center text-gray-300 py-3">Đăng nhập</h2>
                    {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-3 rounded-md">{error}</p>}
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                            Đăng nhập
                        </button>
                    </form>
                    <p className="text-center text-gray-400 mt-8">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="font-semibold text-theme-red hover:text-red-500 hover:underline">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;