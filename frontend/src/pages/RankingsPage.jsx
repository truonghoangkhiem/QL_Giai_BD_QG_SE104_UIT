import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Rankings from '../components/Rankings';

const RankingsPage = ({ token }) => {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(() => localStorage.getItem('selectedSeasonId') || null);
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

                if (activeSeasons.length > 0 && !localStorage.getItem('selectedSeasonId') ) {
                    setSelectedSeasonId(activeSeasons[0]._id);
                } else 
                if (activeSeasons.length === 0) {
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

    const handleSetSelectedSeason = (id) => {
        if (id) {
            localStorage.setItem('selectedSeasonId', id);
        } else {
            localStorage.removeItem('selectedSeasonId');
        }
        setSelectedSeasonId(id);
    }

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
        <div className="min-h-screen bg-gray-300/85 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto ">
                {/* Tiêu đề */}
                <h1 className="text-3xl sm:text-4xl font-bold text-center tracking-tight mb-6 text-red-800  pt-10 px-5 py-16  shadow-xl  md:text-5xl lg:text-6xl" //text-3xl sm:text-4xl font-bold text-center
                    style={{
                        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(https://as2.ftcdn.net/v2/jpg/10/71/13/17/1000_F_1071131715_3c5mFvqcKnMC42oDNuLZkz2R902E7dC4.jpg)',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center', // hoặc 'center'
                    }}>
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
                    setSelectedSeasonId={handleSetSelectedSeason} // Truyền setSelectedSeasonId vào Rankings
                />
            </div>
        </div>
    );
};

export default RankingsPage;