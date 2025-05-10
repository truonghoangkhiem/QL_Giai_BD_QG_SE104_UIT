import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PlayerRanking from '../components/PlayerRanking';
import { useNavigate } from 'react-router-dom';

const PlayerRankingPage = ({ token }) => {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [teams, setTeams] = useState([]);
    const [playerResults, setPlayerResults] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const API_URL = 'http://localhost:5000';

    // Lấy danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async (retryCount = 1) => {
            setLoading(true);
            setError(null);

            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const response = await axios.get(`${API_URL}/api/seasons`, config);

                const isSuccess = response.data.success === true || response.data.status === 'success';
                if (!isSuccess || !Array.isArray(response.data.data)) {
                    throw new Error('Dữ liệu mùa giải không hợp lệ.');
                }

                const activeSeasons = response.data.data.filter((season) => season.status === true);
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

        if (token) {
            fetchSeasons();
        } else {
            navigate('/login');
        }
    }, [token, navigate]);

    // Lấy danh sách đội bóng và kết quả cầu thủ
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedSeasonId || !/^[0-9a-fA-F]{24}$/.test(selectedSeasonId)) {
                setError('Mùa giải không hợp lệ.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');
            setPlayerResults([]);
            setTeams([]);

            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // Lấy danh sách đội bóng
                const teamsResponse = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeasonId}`, config);
                if (teamsResponse.data.status !== 'success' || !Array.isArray(teamsResponse.data.data)) {
                    throw new Error('Dữ liệu đội bóng không hợp lệ.');
                }
                setTeams(teamsResponse.data.data);

                // Lấy kết quả cầu thủ
                const playerResultsResponse = await axios.get(
                    `${API_URL}/api/player_results/season/${selectedSeasonId}/${selectedDate}`,
                    config
                );
                if (playerResultsResponse.data.status !== 'success' || !Array.isArray(playerResultsResponse.data.data)) {
                    throw new Error('Dữ liệu kết quả cầu thủ không hợp lệ.');
                }
                setPlayerResults(playerResultsResponse.data.data);
            } catch (err) {
                console.error('Lỗi khi lấy dữ liệu:', {
                    message: err.message,
                    status: err.response?.status,
                    data: err.response?.data,
                });
                setError('Không có thông tin xếp hạng cầu thủ.');
            } finally {
                setLoading(false);
            }
        };

        if (selectedSeasonId && token) {
            fetchData();
        }
    }, [selectedSeasonId, selectedDate, token]);

    // Định dạng ngày
    const formatDate = (dateString) => {
        if (!dateString) return 'Không xác định';
        const date = new Date(dateString);
        return isNaN(date) ? 'Ngày không hợp lệ' : date.toLocaleDateString('vi-VN');
    };

    // Xử lý thay đổi bộ lọc
    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleSeasonChange = (e) => {
        setSelectedSeasonId(e.target.value);
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    // Tên mùa giải được chọn
    const selectedSeasonName = seasons.find((season) => season._id === selectedSeasonId)?.season_name || '';

    // Trạng thái loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 pl-20">
            <div className="max-w-7xl mx-auto">
                {/* Tiêu đề */}
                <h1 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                    Xếp Hạng Cầu Thủ {selectedSeasonName && `- ${selectedSeasonName}`}
                </h1>

                {/* Thông báo lỗi */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg shadow-lg mx-auto max-w-2xl">
                        {error}
                    </div>
                )}

                {/* Bộ lọc */}
                <div className="mb-8 flex flex-col sm:flex-row justify-center gap-4 bg-white p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-3">
                        <label htmlFor="season-select" className="text-sm font-medium text-gray-700">
                            Mùa giải:
                        </label>
                        <select
                            id="season-select"
                            value={selectedSeasonId || ''}
                            onChange={handleSeasonChange}
                            className="w-full sm:w-64 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition duration-200 hover:border-blue-400 hover:shadow-md"
                        >
                            <option value="">Chọn mùa giải</option>
                            {seasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {`${season.season_name} (${formatDate(season.start_date)} - ${formatDate(season.end_date)})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">
                            Ngày:
                        </label>
                        <input
                            type="date"
                            id="date-filter"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="w-full sm:w-48 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition duration-200 hover:border-blue-400 hover:shadow-md"
                        />
                    </div>
                </div>

                {/* Hiển thị component PlayerRanking */}
                <PlayerRanking
                    seasonId={selectedSeasonId}
                    token={token}
                    seasons={seasons}
                    teams={teams}
                    playerResults={playerResults}
                    selectedDate={selectedDate}
                    formatDate={formatDate}
                />
            </div>
        </div>
    );
};

export default PlayerRankingPage;