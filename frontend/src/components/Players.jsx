import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PlayerForm from './PlayerForm';

const Players = ({ setEditingPlayer, setShowForm, token, setPlayers, players }) => {
    const [playerResults, setPlayerResults] = useState({});
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('67ceaf87444f610224ed67de');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Ngày hôm nay: 2025-05-08
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_URL = 'http://localhost:5000';

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/seasons`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (seasonsData.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasonsData[0]._id);
                }
                console.log('Fetched seasons:', seasonsData);
            } catch (err) {
                setError('Không thể tải danh sách mùa giải.');
            }
        };

        fetchSeasons();
    }, [token]);

    useEffect(() => {
        if (!selectedSeason || !selectedDate) return;

        const fetchPlayersAndResults = async () => {
            setLoading(true);
            setError('');
            try {
                // Lấy danh sách cầu thủ
                const playersResponse = await axios.get(`${API_URL}/api/players`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const playersData = playersResponse.data.data || [];
                setPlayers(playersData);
                console.log('Fetched players:', playersData);

                // Lấy player_results
                let results = [];
                try {
                    const response = await axios.get(`${API_URL}/api/player_results/season/${selectedSeason}/${selectedDate}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    results = Array.isArray(response.data.data) ? response.data.data : [];
                    console.log('Fetched player_results:', results);
                } catch (err) {
                    const errorData = err.response ? err.response.data : { message: err.message || 'Lỗi không xác định' };
                    const errorMessage = typeof errorData.message === 'string' ? errorData.message : 'Không thể lấy kết quả thi đấu.';
                    setError(`Không có kết quả thi đấu cho ngày ${selectedDate}: ${errorMessage}`);
                    setPlayerResults({});
                    setFilteredPlayers([]);
                    setLoading(false);
                    return;
                }

                // Lọc player_results để chỉ giữ lại các bản ghi có date < selectedDate
                const selectedDateObj = new Date(selectedDate);
                selectedDateObj.setUTCHours(0, 0, 0, 0);
                const filteredResults = results.filter((result) => {
                    const resultDate = new Date(result.date);
                    return resultDate < selectedDateObj;
                });
                console.log('Filtered player_results (date < selectedDate):', filteredResults);

                // Ánh xạ player_results thành object với tên trường đúng
                const resultsMap = {};
                filteredResults.forEach((result) => {
                    resultsMap[result.player_id] = {
                        matchesPlayed: result.matchesplayed || 0,
                        goals: result.totalGoals || 0,
                        assists: result.assists || 0,
                        yellowCards: result.yellowCards || 0,
                        redCards: result.redCards || 0,
                    };
                });
                setPlayerResults(resultsMap);
                console.log('Mapped playerResults:', resultsMap);

                // Lọc cầu thủ dựa trên filtered player_results
                if (filteredResults.length > 0) {
                    const playerIdsWithResults = new Set(filteredResults.map(result => result.player_id));
                    const matchedPlayers = playersData.filter(player => playerIdsWithResults.has(player._id));
                    setFilteredPlayers(matchedPlayers);
                    // Kiểm tra xem có cầu thủ nào không có playerResults tương ứng không
                    matchedPlayers.forEach(player => {
                        if (!resultsMap[player._id]) {
                            console.warn(`No playerResults found for player with ID: ${player._id}`);
                        }
                    });
                } else {
                    setFilteredPlayers([]);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể tải dữ liệu cầu thủ.');
                setFilteredPlayers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayersAndResults();
    }, [selectedSeason, selectedDate, token, setPlayers]);

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error('Invalid date');
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return 'N/A';
        }
    };

    const handleEdit = (player) => {
        setEditingPlayer(player);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        setError('');
        try {
            await axios.delete(`${API_URL}/api/players/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPlayers(players.filter((player) => player._id !== id));
            setFilteredPlayers(filteredPlayers.filter((player) => player._id !== id));
            setPlayerResults((prev) => {
                const updatedResults = { ...prev };
                delete updatedResults[id];
                return updatedResults;
            });
            setSuccess('Xóa thành công!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Xóa thất bại.');
        }
    };

    if (loading) return <p className="text-center text-gray-500">Đang tải...</p>;

    return (
        <div className="container mx-auto px-4 py-6 bg-white min-h-screen text-gray-800">
            {success && <p className="text-center text-green-600 mb-4">{success}</p>}
            <h2 className="bg-gradient-to-r from-slate-600 to-slate-800 text-4xl font-extrabold text-white py-3 px-6 rounded-lg drop-shadow-md mb-4 text-center font-heading hover:brightness-110 transition-all duration-200">Danh sách cầu thủ</h2>

            <div className="mb-6 text-center space-y-4">
                <div>
                    <label htmlFor="season-select" className="mr-2 text-gray-600">Chọn mùa giải:</label>
                    <select
                        id="season-select"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-beige"
                    >
                        {seasons.length === 0 ? (
                            <option value="">Không có mùa giải</option>
                        ) : (
                            seasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {season.season_name} ({formatDate(season.start_date)} - {formatDate(season.end_date)})
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <div>
                    <label htmlFor="date-select" className="mr-2 text-gray-600">Chọn ngày:</label>
                    <input
                        type="date"
                        id="date-select"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-beige"
                    />
                </div>
            </div>

            {error && <p className="text-center text-red-500 mb-4">{error}</p>}

            {filteredPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlayers.map((player) => {
                        const results = playerResults[player._id] || {
                            matchesPlayed: 0,
                            goals: 0,
                            assists: 0,
                            yellowCards: 0,
                            redCards: 0,
                        };

                        return (
                            <div
                                key={player._id}
                                className="bg-gray-100 hover:bg-gray-200 transition-all duration-200 border border-gray-200 rounded-lg p-5 shadow-sm"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={`https://via.placeholder.com/50?text=${player.name[0]}`}
                                            alt={`${player.name}`}
                                            className="w-16 h-16 rounded-full object-cover mb-3"
                                            onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.2Kb4oZ95hq4HKWdUFHweAAAAAA?w=166&h=180&c=7&pcl=292827&r=0&o=5&dpr=1.3&pid=1.7')}
                                        />
                                        <h3 className="text-lg font-medium text-gray-800 text-center">{player.name}</h3>
                                        <p className="text-sm text-gray-500 text-center">#{player.number || 'N/A'}</p>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p>Vị trí: <span className="text-gray-800">{player.position || 'N/A'}</span></p>
                                        <p>Quốc tịch: <span className="text-gray-800">{player.nationality || 'N/A'}</span></p>
                                        <p>Ngày sinh: <span className="text-gray-800">{formatDate(player.dob)}</span></p>
                                        <p>Số trận: {results.matchesPlayed != null ? results.matchesPlayed : 'N/A'}</p>
                                        <p>Bàn thắng: {results.goals != null ? results.goals : 'N/A'}</p>
                                        <p>Kiến tạo: {results.assists != null ? results.assists : 'N/A'}</p>
                                        <p>Thẻ vàng: {results.yellowCards != null ? results.yellowCards : 'N/A'}</p>
                                        <p>Thẻ đỏ: {results.redCards != null ? results.redCards : 'N/A'}</p>
                                    </div>
                                </div>
                                {token && setEditingPlayer && setShowForm && (
                                    <div className="mt-4 flex space-x-2 justify-center">
                                        <button
                                            onClick={() => handleEdit(player)}
                                            className="px-3 py-1 rounded bg-beige text-white hover:opacity-90 text-sm"
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(player._id)}
                                            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-sm"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-center text-gray-500">Không có cầu thủ nào khớp với mùa giải và ngày đã chọn.</p>
            )}
        </div>
    );
};

export default Players;