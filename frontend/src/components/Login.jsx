import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
        <div className="min-h-screen bg-[#F9FAFB] bg-cover bg-center flex items-center justify-center p-4"
            style={{ backgroundImage: "url('https://cdn.vectorstock.com/i/500p/96/15/soccer-ball-on-grass-football-stadium-vector-22349615.jpg')" }}>

            <div className="bg-white/80 rounded-lg shadow-lg p-8 max-w-md w-full">
                <h2 className="text-4xl font-heading font-bold mb-6 text-center text-black  py-3 rounded-md">Đăng nhập</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
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
                        className="w-full bg-orange-400 text-white p-3 rounded-md hover:bg-opacity-90 transition-colors duration-200"
                    >
                        Đăng nhập
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;