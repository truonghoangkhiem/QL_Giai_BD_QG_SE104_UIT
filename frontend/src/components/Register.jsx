import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
            style={{ backgroundImage: "url('https://treobangron.com.vn/wp-content/uploads/2022/11/background-bong-da-39.jpg')" }}>
            <div className="bg-white/80 rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-4xl font-heading font-bold mb-6 text-center text-black  py-3 rounded-md">Đăng ký</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tên người dùng"
                            className="w-full p-3 border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-[#111827] placeholder-[#6B7280]"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full p-3 border border-[#E5E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-[#111827] placeholder-[#6B7280]"
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
                        className="w-full bg-[#1E3A8A] text-white p-3 rounded-md hover:bg-opacity-90 transition-colors duration-200"
                    >
                        Đăng ký
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Register;