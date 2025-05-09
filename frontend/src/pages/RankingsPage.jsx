import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Rankings from '../components/Rankings';

const RankingsPage = ({ token }) => {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Lấy danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async (retryCount = 1) => {
            setLoading(true);
            setError(null);

            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const response = await axios.get('http://localhost:5000/api/seasons', config);

                const isSuccess = response.data.success === true || response.data.status === 'success';
                if (!isSuccess || !Array.isArray(response.data.data)) {
                    throw new Error('Dữ liệu mùa giải không hợp lệ.');
                }

                const activeSeasons = response.data.data.filter(season => season.status === true);
                setSeasons(activeSeasons);

                if (activeSeasons.length > 0) {
                    setSelectedSeasonId(activeSeasons[0]._id);
                } else {
                    setError('Không có mùa giải nào đang hoạt động.');
                }
            } catch (err) {
                console.error('Lỗi khi lấy danh sách mùa giải:', {
                    message: err.message,
                    status: err.response?.status,
                    data: err.response?.data,
                });

                if (retryCount > 0) {
                    console.log('Thử lại API sau 2 giây...');
                    setTimeout(() => fetchSeasons(retryCount - 1), 2000);
                    return;
                }

                setError(
                    err.response?.status === 401
                        ? 'Không có quyền truy cập. Vui lòng đăng nhập lại.'
                        : err.response?.status === 404
                            ? 'Không tìm thấy API mùa giải.'
                            : err.response?.status === 500
                                ? 'Lỗi server. Vui lòng thử lại sau.'
                                : `Không thể tải danh sách mùa giải: ${err.message}`
                );
            } finally {
                setLoading(false);
            }
        };

        fetchSeasons();
    }, [token]);

    // Định dạng ngày
    const formatDate = (dateString) => {
        if (!dateString) return 'Không xác định';
        const date = new Date(dateString);
        return isNaN(date) ? 'Ngày không hợp lệ' : date.toLocaleDateString('vi-VN');
    };

    // Lấy tên mùa giải được chọn
    const selectedSeasonName = seasons.find(season => season._id === selectedSeasonId)?.season_name || '';

    // Trạng thái loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto ">
                {/* Tiêu đề */}
                <h1 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                    Bảng Xếp Hạng {selectedSeasonName && `- ${selectedSeasonName}`}
                </h1>

                {/* Thông báo lỗi */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg shadow-lg mx-auto max-w-2xl">
                        {error}
                    </div>
                )}

                {/* Hiển thị component Rankings */}
                <Rankings
                    seasonId={selectedSeasonId}
                    token={token}
                    seasons={seasons}
                    formatDate={formatDate}
                    setSelectedSeasonId={setSelectedSeasonId} // Truyền setSelectedSeasonId vào Rankings
                />
            </div>
        </div>
    );
};

export default RankingsPage;