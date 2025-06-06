// frontend/src/pages/RegulationsPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Regulations from '../components/Regulations';
import RegulationForm from '../components/RegulationForm';

const RegulationsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingRegulation, setEditingRegulation] = useState(null);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [pageError, setPageError] = useState(''); // Trạng thái lỗi tập trung cho trang

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const seasonsRes = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(seasonsRes.data.data);
                if (seasonsRes.data.data.length > 0) {
                    setSelectedSeasonId(seasonsRes.data.data[0]._id);
                }
            } catch (err) {
                console.error('Không thể tải danh sách mùa giải', err);
                setPageError('Lỗi: Không thể tải danh sách mùa giải.');
            }
        };
        fetchSeasons();
    }, []);

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingRegulation(null);
        setRefreshKey(prevKey => prevKey + 1);
    };

    const handleEditClick = (regulation) => {
        setEditingRegulation(regulation);
        setShowForm(true);
    };

    const handleDeleteClick = async (id) => {
        // Hộp thoại xác nhận trước khi xóa
        if (!window.confirm('Bạn có chắc chắn muốn xóa quy định này không?')) {
            return false; // Người dùng đã hủy
        }
        try {
            await axios.delete(`http://localhost:5000/api/regulations/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRefreshKey(prevKey => prevKey + 1); // Kích hoạt tải lại danh sách
            return true; // Thành công
        } catch (err) {
            setPageError(err.response?.data?.message || 'Không thể xóa quy định. Vui lòng thử lại.');
            console.error('Lỗi xóa quy định:', err);
            return false; // Thất bại
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans"
            style={{
                backgroundImage: 'url(https://i.pinimg.com/736x/cd/07/2b/cd072bdf8a259e2d064fbb291a4456e8.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'scroll',
            }}>
            <div className="container mx-auto p-4 md:p-6">
                {pageError && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4 text-center">{pageError}</p>}
                {showForm ? (
                    <RegulationForm
                        editingRegulation={editingRegulation}
                        token={token}
                        seasons={seasons}
                        selectedSeasonId={selectedSeasonId} // <-- THAY ĐỔI: Truyền ID mùa giải đã chọn
                        onSuccess={handleFormSuccess}
                        setShowForm={setShowForm}
                        setEditingRegulation={setEditingRegulation}
                    />
                ) : (
                    <div className="bg-white/90 rounded-lg shadow-xl overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-5 border-b border-gray-200">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0">
                                📜Quản lý Quy định Giải đấu
                            </h1>
                            {token && (
                                <button
                                    onClick={() => { setEditingRegulation(null); setShowForm(true); }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 w-full sm:w-auto"
                                >
                                    Thêm quy định
                                </button>
                            )}
                        </div>

                        <div className="p-4 md:p-6">
                            <div className="mb-6 flex justify-center sm:justify-start">
                                <div className="w-full sm:w-auto sm:max-w-xs md:max-w-sm">
                                    <label htmlFor="page-season-select" className="block text-sm font-medium text-gray-700 mb-1">
                                        Xem quy định cho mùa giải:
                                    </label>
                                    <select
                                        id="page-season-select"
                                        value={selectedSeasonId}
                                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    >
                                        <option value="">Chọn mùa giải</option>
                                        {seasons.map((season) => (
                                            <option key={season._id} value={season._id}>
                                                {season.season_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Regulations
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
                                token={token}
                                selectedSeasonId={selectedSeasonId}
                                seasons={seasons}
                                refreshKey={refreshKey}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegulationsPage;