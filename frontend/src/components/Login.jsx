import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // Import Link

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
            navigate('/teams');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        }
    };

    return (
        <div className="flex min-h-screen"> {/* Container chính sử dụng flex */}
            {/* Cột bên trái - Hình nền */}
            <div
                className="w-full min-h-screen bg-cover bg-[center_65%] " // Chiếm 50% chiều rộng, full chiều cao, cover và center bg
                style={{ backgroundImage: "url('https://imagedelivery.net/c2SKP8Bk0ZKw6UDgeeIlbw/1205ceeb-4aeb-4573-40ce-66172f50dd00/public')" }}
            >
                {/* Có thể để trống hoặc thêm nội dung/overlay nếu muốn */}
            </div>

            {/* Cột bên phải - Form đăng nhập */}
            <div className="w-1/2 min-h-screen bg-gray-500 flex items-center justify-center p-4"> {/* Chiếm 50% chiều rộng, full chiều cao, căn giữa nội dung */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full"> {/* Thẻ chứa form */}
                    <h2 className="text-4xl font-heading font-bold mb-6 text-center text-gray-300 py-3 rounded-md">Đăng nhập</h2>
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full p-3 border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-[#111827] placeholder-[#80776b]"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                className="w-full p-3 border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-[#111827] placeholder-[#6B7280]"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-orange-400 text-white p-3 rounded-md hover:bg-opacity-90 transition-colors duration-200"
                        >
                            Đăng nhập
                        </button>
                    </form>
                    <p className="text-center text-gray-400 mt-6">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="text-orange-400 hover:underline">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;