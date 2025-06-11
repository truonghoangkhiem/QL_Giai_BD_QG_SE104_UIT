import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PlayerRanking from '../components/PlayerRanking';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const PlayerRankingPage = ({ token }) => {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(() => localStorage.getItem('selectedSeasonId') || null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
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
                const activeSeasons = response.data.data.filter((season) => season.status === true);
                setSeasons(activeSeasons);

                const storedSeasonId = localStorage.getItem('selectedSeasonId');
                const storedSeasonIsValid = storedSeasonId && activeSeasons.some(s => s._id === storedSeasonId);

                if (storedSeasonIsValid) {
                    setSelectedSeasonId(storedSeasonId);
                } else if (activeSeasons.length > 0) {
                    const defaultSeason = activeSeasons[0]._id;
                    setSelectedSeasonId(defaultSeason);
                    localStorage.setItem('selectedSeasonId', defaultSeason);
                } else {
                    setError('Không có mùa giải nào đang hoạt động.');
                }
            } catch (err) {
                 console.error('Lỗi khi lấy danh sách mùa giải:', {
                    message: err.message,
                    status: err.response?.status,
                    data: err.response?.data,
                });
                
                if (retryCount > 0 && err.response?.status !== 401) {
                    console.log('Thử lại API sau 2 giây...');
                    setTimeout(() => fetchSeasons(retryCount - 1), 2000);
                    return;
                }

                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu bị giới hạn do chưa đăng nhập. Vui lòng đăng nhập để xem đầy đủ.'
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
    

    // Lấy danh sách đội bóng và kết quả cầu thủ
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedSeasonId || !/^[0-9a-fA-F]{24}$/.test(selectedSeasonId)) {
                setPlayerResults([]);
                setTeams([]);
                return;
            }

            setLoading(true);
            setError(''); 
            setPlayerResults([]);
            setTeams([]);

            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                
                const teamsResponse = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeasonId}`, config);
                if (teamsResponse.data.status !== 'success' || !Array.isArray(teamsResponse.data.data)) {
                    throw new Error('Dữ liệu đội bóng không hợp lệ.');
                }
                setTeams(teamsResponse.data.data);

                // THAY ĐỔI: Sử dụng axios.get với params để gửi date qua query string
                const playerResultsResponse = await axios.get(
                    `${API_URL}/api/player_rankings/season/${selectedSeasonId}`,
                    { 
                        params: { date: selectedDate },
                        ...config 
                    }
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
                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu bị giới hạn do chưa đăng nhập. Vui lòng đăng nhập để xem đầy đủ.'
                        : 'Không có thông tin xếp hạng cầu thủ cho lựa chọn này.'
                );
            } finally {
                setLoading(false);
            }
        };

        if (selectedSeasonId) {
            fetchData();
        } else {
            setLoading(false); 
            setPlayerResults([]);
            setTeams([]);
        }
    }, [selectedSeasonId, selectedDate, token]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Không xác định';
        const date = new Date(dateString);
        return isNaN(date) ? 'Ngày không hợp lệ' : date.toLocaleDateString('vi-VN');
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleSeasonChange = (e) => {
        const seasonId = e.target.value;
        setSelectedSeasonId(seasonId);
        if (seasonId) {
            localStorage.setItem('selectedSeasonId', seasonId);
        } else {
            localStorage.removeItem('selectedSeasonId');
        }
    };

    const selectedSeasonName = seasons.find((season) => season._id === selectedSeasonId)?.season_name || '';

    if (loading && (!seasons.length && !selectedSeasonId)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 pl-4 md:pl-20">
            <div className="max-w-7xl mx-auto">
                <div
                    className="p-6 rounded-xl shadow-xl mb-8 bg-gray-700 pt-10 px-5 py-16"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://wallpaperbat.com/img/470248-create-five-wallpaper-of-your-favorites-soccer-players.jpg')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center 5%',
                    }}
                >
                    <h1
                        className="text-3xl sm:text-4xl font-bold text-center tracking-tight mb-6 text-white"
                        style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.7)' }}
                    >
                        Xếp Hạng Cầu Thủ {selectedSeasonName && `- ${selectedSeasonName}`}
                    </h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="flex flex-col">
                             <label htmlFor="season-select" className="text-sm font-medium text-gray-100 shrink-0 mb-1" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                                Mùa giải:
                            </label>
                            <select
                                id="season-select"
                                value={selectedSeasonId || ''}
                                onChange={handleSeasonChange}
                                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out shadow-sm hover:border-gray-400"
                            >
                                <option value="">Chọn mùa giải</option>
                                {seasons.map((season) => (
                                    <option key={season._id} value={season._id}>
                                        {`${season.season_name} (${formatDate(season.start_date)} - ${formatDate(season.end_date)})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex flex-col">
                            <label htmlFor="date-filter" className="text-sm font-medium text-gray-100 shrink-0 mb-1" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                                Xếp hạng tính đến ngày:
                            </label>
                            <input
                                type="date"
                                id="date-filter"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out shadow-sm hover:border-gray-400"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label htmlFor="player-search" className="text-sm font-medium text-gray-100 shrink-0 mb-1" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                                Tìm kiếm cầu thủ:
                            </label>
                            <div className="relative">
                               <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="player-search"
                                    type="text"
                                    placeholder="Nhập tên cầu thủ..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out shadow-sm hover:border-gray-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {error && !loading && (
                    <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg shadow-md mx-auto max-w-3xl text-center">
                        {error}
                    </div>
                )}

                {loading && selectedSeasonId ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
                    </div>
                ) : selectedSeasonId && playerResults.length === 0 && !error ? (
                    <div className="mb-6 p-4 bg-yellow-50 text-yellow-700 rounded-lg shadow-md mx-auto max-w-3xl text-center">
                        Không có dữ liệu xếp hạng cầu thủ cho mùa giải và ngày đã chọn.
                    </div>
                ) : selectedSeasonId ? (
                    <PlayerRanking
                        playerResults={playerResults}
                        teams={teams}
                        token={token}
                        searchTerm={searchTerm}
                    />
                ) : !selectedSeasonId && !loading && !error && seasons.length > 0 ? (
                    <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg shadow-md mx-auto max-w-3xl text-center">
                        Vui lòng chọn một mùa giải để xem xếp hạng cầu thủ.
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default PlayerRankingPage;