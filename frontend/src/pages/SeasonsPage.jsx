import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Seasons from '../components/Seasons';
import SeasonForm from '../components/SeasonForm';

const SeasonsPage = ({ token }) => {
    const [seasons, setSeasons] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSeason, setEditingSeason] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchSeasons = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('http://localhost:5000/api/seasons');
            setSeasons(response.data.data);
        } catch (err) {
            setError('Không thể tải danh sách mùa giải. Vui lòng thử lại.');
            console.error("Fetch seasons error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeasons();
    }, []);

    const handleEdit = (season) => {
        setEditingSeason(season);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa mùa giải này? Mọi dữ liệu liên quan (đội bóng, trận đấu, kết quả,...) sẽ bị xóa vĩnh viễn.')) {
            return null; // Trả về null nếu người dùng hủy
        }
        try {
            await axios.delete(`http://localhost:5000/api/seasons/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Tìm nạp lại danh sách mùa giải để cập nhật
            fetchSeasons();
            return true; // Trả về true nếu thành công
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể xóa mùa giải. Có thể mùa giải này đang được sử dụng.');
            console.error("Delete season error:", err);
            return false; // Trả về false nếu thất bại
        }
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingSeason(null);
        fetchSeasons(); // Tìm nạp lại danh sách mùa giải sau khi gửi form thành công
    };


    return (
        <div>
            {showForm ? (
                <SeasonForm
                    editingSeason={editingSeason}
                    setEditingSeason={setEditingSeason}
                    setShowForm={setShowForm}
                    onSuccess={handleFormSuccess} // Sử dụng một trình xử lý thành công
                    token={token}
                />
            ) : (
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="flex justify-between items-center px-7 py-7"
                        style={{
                            backgroundImage: `url('https://i.pinimg.com/736x/4d/39/eb/4d39eb4cfbea4eaf05f6a98e9bf85dbc.jpg')`,
                        }}>
                        <h1 className="text-3xl text-center font-heading font-bold text-white">Quản lý Mùa Giải</h1>
                        {token && (
                            <button
                                onClick={() => { setEditingSeason(null); setShowForm(true); }}
                                className="bg-theme-red hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                            >
                                Thêm mùa giải
                            </button>
                        )}
                    </div>

                    <div className="p-4 md:p-6">
                         {loading ? (
                            <p className="text-center text-gray-500 text-lg py-10">Đang tải danh sách mùa giải...</p>
                        ) : error ? (
                            <p className="text-red-500 text-center text-lg py-10 bg-red-50 p-4 rounded-md">{error}</p>
                        ) : (
                            <Seasons
                                seasons={seasons}
                                handleEdit={handleEdit}
                                handleDelete={handleDelete}
                                token={token}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonsPage;