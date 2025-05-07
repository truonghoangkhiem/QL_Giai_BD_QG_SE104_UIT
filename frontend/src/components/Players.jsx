import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PlayerForm from './PlayerForm';

const Players = ({ setEditingPlayer, setShowForm, token, setPlayers, players }) => {
    const [playerResults, setPlayerResults] = useState({});
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
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
                if (seasonsData.length > 0) {
                    setSelectedSeason(seasonsData[0]._id);
                }
            } catch (err) {
                setError('Không thể tải danh sách mùa giải.');
            }
        };

        fetchSeasons();
    }, [token]);

    useEffect(() => {
        if (!selectedSeason) return;

        const fetchPlayersAndResults = async () => {
            setLoading(true);
            setError('');
            try {
                const playersResponse = await axios.get(`${API_URL}/api/players`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const playersData = playersResponse.data.data || [];
                setPlayers(playersData);

                if (playersData.length > 0 && selectedSeason) {
                    const dateObj = new Date();
                    const date = dateObj.toISOString().split('T')[0];
                    const response = await axios.get(`${API_URL}/api/player_results/season/${selectedSeason}/${date}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const results = Array.isArray(response.data.data) ? response.data.data : [];

                    const resultsMap = {};
                    playersData.forEach((player) => {
                        const playerResult = results.find((result) => result.player_id === player._id);
                        resultsMap[player._id] = playerResult || {
                            matchesPlayed: 0,
                            goals: 0,
                            assists: 0,
                            yellowCards: 0,
                            redCards: 0,
                        };
                    });
                    setPlayerResults(resultsMap);

                    if (results.length === 0) {
                        setError('Không có kết quả thi đấu nào.');
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể tải dữ liệu.');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayersAndResults();
    }, [selectedSeason, token, setPlayers]);

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

            <div className="mb-6 text-center">
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

            {error && <p className="text-center text-red-500 mb-4">{error}</p>}

            {players.length > 0 && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {players.map((player) => {
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
                                        <p>Số trận: {results.matchesPlayed}</p>
                                        <p>Bàn thắng: {results.goals}</p>
                                        <p>Kiến tạo: {results.assists}</p>
                                        <p>Thẻ vàng: {results.yellowCards}</p>
                                        <p>Thẻ đỏ: {results.redCards}</p>
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
            )}
        </div>
    );
};

export default Players;