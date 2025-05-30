import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Players = ({ setEditingPlayer, setShowForm, token, setPlayers, players }) => {
    const [rawPlayerResultsData, setRawPlayerResultsData] = useState([]);
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_URL = 'http://localhost:5000';

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const response = await axios.get(`${API_URL}/api/seasons`, config);
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (seasonsData.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasonsData[0]._id);
                }
            } catch (err) {
                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu mùa giải bị giới hạn do chưa đăng nhập. Vui lòng đăng nhập để xem đầy đủ.'
                        : 'Không thể tải danh sách mùa giải.'
                );
            }
        };
        fetchSeasons();
    }, [token]);

    useEffect(() => {
        if (!selectedSeason) return;
        const fetchTeams = async () => {
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeason}`, config);
                setTeams(response.data.data || []);
            } catch (err) {
                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu đội bóng bị giới hạn do chưa đăng nhập. Vui lòng đăng nhập để xem đầy đủ.'
                        : `Không thể tải danh sách đội bóng cho mùa giải ${selectedSeason}.`
                );
                setTeams([]);
            }
        };
        fetchTeams();
    }, [selectedSeason, token]);

    useEffect(() => {
        if (!selectedSeason || !selectedDate) {
            setLoading(false);
            if (selectedSeason && selectedDate) {
                setFilteredPlayers([]);
                setRawPlayerResultsData([]);
            }
            return;
        }

        const fetchPlayersAndResults = async () => {
            setLoading(true);
            setError('');
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const playersResponse = await axios.get(`${API_URL}/api/players`, config);
                const allPlayersData = playersResponse.data.data || [];
                setPlayers(allPlayersData);

                const playerResultsApiResponse = await axios.get(
                    `${API_URL}/api/player_results/season/${selectedSeason}/${selectedDate}`,
                    config
                );
                const resultsData = Array.isArray(playerResultsApiResponse.data.data)
                    ? playerResultsApiResponse.data.data
                    : [];
                setRawPlayerResultsData(resultsData);

                const teamsInCurrentSeason = teams.filter(
                    (t) => t.season_id === selectedSeason || t.season_id?._id === selectedSeason
                );
                const teamIdsInCurrentSeason = new Set(teamsInCurrentSeason.map((t) => t._id));

                const seasonPlayers = allPlayersData.filter((player) => {
                    const playerTeamId = typeof player.team_id === 'object' ? player.team_id._id : player.team_id;
                    return teamIdsInCurrentSeason.has(playerTeamId);
                });
                setFilteredPlayers(seasonPlayers);
            } catch (err) {
                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu cầu thủ bị giới hạn do chưa đăng nhập. Vui lòng đăng nhập để xem đầy đủ.'
                        : err.response?.data?.message || 'Không thể tải dữ liệu cầu thủ hoặc kết quả.'
                );
                setFilteredPlayers([]);
                setRawPlayerResultsData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayersAndResults();
    }, [selectedSeason, selectedDate, token, setPlayers, teams]);

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
        setSuccess('');
        if (!token) {
            setError('Yêu cầu đăng nhập để xóa cầu thủ.');
            return;
        }
        try {
            await axios.delete(`${API_URL}/api/players/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPlayers((prevPlayers) => prevPlayers.filter((player) => player._id !== id));
            setFilteredPlayers((prevFiltered) => prevFiltered.filter((player) => player._id !== id));
            setRawPlayerResultsData((prevResults) => prevResults.filter((pr) => pr.player_id !== id));
            setSuccess('Xóa cầu thủ thành công!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa cầu thủ thất bại.');
        }
    };

    const groupPlayersByTeam = () => {
        const grouped = {};
        filteredPlayers.forEach((player) => {
            const playerTeamObject = teams.find((t) => t._id === (player.team_id?._id || player.team_id));

            if (playerTeamObject) {
                const teamId = playerTeamObject._id;
                if (!grouped[teamId]) {
                    grouped[teamId] = { team: playerTeamObject, players: [] };
                }
                grouped[teamId].players.push(player);
            } else {
                const unknownTeamId = player.team_id?._id || player.team_id || 'unknown';
                if (!grouped[unknownTeamId]) {
                    grouped[unknownTeamId] = {
                        team: {
                            name: 'Đội không xác định',
                            logo: 'https://via.placeholder.com/50',
                            _id: unknownTeamId,
                        },
                        players: [],
                    };
                }
                grouped[unknownTeamId].players.push(player);
            }
        });
        return Object.values(grouped);
    };

    if (loading && (!selectedSeason || !selectedDate))
        return <p className="text-center text-gray-500">Vui lòng chọn mùa giải và ngày.</p>;
    if (loading) return <p className="text-center text-gray-500">Đang tải...</p>;

    return (
        <div className="container mx-auto px-4 py-6 bg-gradient-to-t from-white to-gray-400 min-h-screen text-gray-800">
            {success && <p className="text-center text-green-600 mb-4">{success}</p>}
            <h2 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                Danh sách cầu thủ
            </h2>

            <div className="mb-6 text-center space-y-4 md:space-y-0 md:flex md:justify-center md:space-x-4">
                <div>
                    <label htmlFor="season-select" className="mr-2 text-gray-600">
                        Chọn mùa giải:
                    </label>
                    <select
                        id="season-select"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="">-- Chọn mùa giải --</option>
                        {seasons.map((season) => (
                            <option key={season._id} value={season._id}>
                                {season.season_name} ({formatDate(season.start_date)} -{' '}
                                {formatDate(season.end_date)})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="date-select" className="mr-2 text-gray-600">
                        Chọn ngày xem thống kê:
                    </label>
                    <input
                        type="date"
                        id="date-select"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>

            {error && <p className="text-center text-red-500 mb-4">{error}</p>}

            {!selectedSeason && (
                <p className="text-center text-gray-500">Vui lòng chọn một mùa giải để xem cầu thủ.</p>
            )}

            {selectedSeason && filteredPlayers.length > 0 ? (
                <div className="space-y-8">
                    {groupPlayersByTeam().map(({ team, players: teamPlayers }) => (
                        <div key={team._id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center mb-4">
                                <img
                                    src={team.logo || 'https://via.placeholder.com/50'}
                                    alt={`${team.team_name} logo`}
                                    className="w-12 h-12 rounded-full object-cover mr-4"
                                    onError={(e) =>
                                    (e.target.src =
                                        'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain')
                                    }
                                />
                                <h3 className="text-2xl font-bold text-gray-800">{team.team_name}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {teamPlayers.map((player) => {
                                    const playerTeamIdFromPlayerObject =
                                        typeof player.team_id === 'object' ? player.team_id._id : player.team_id;
                                    const results =
                                        rawPlayerResultsData.find(
                                            (pr) =>
                                                pr.player_id === player._id &&
                                                pr.team_id === playerTeamIdFromPlayerObject
                                        ) || {
                                            matchesPlayed: 0,
                                            totalGoals: 0,
                                            assists: 0,
                                            yellowCards: 0,
                                            redCards: 0,
                                        };

                                    return (
                                        <div
                                            key={player._id}
                                            className="bg-gray-300 hover:bg-gray-200 transition-all duration-200 border border-gray-200 rounded-lg p-5 shadow-sm"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col items-center">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                            player.name
                                                        )}&background=random&size=64`}
                                                        alt={`${player.name}`}
                                                        className="w-16 h-16 rounded-full object-cover mb-3"
                                                        onError={(e) =>
                                                        (e.target.src =
                                                            'https://th.bing.com/th/id/OIP.2Kb4oZ95hq4HKWdUFHweAAAAAA?w=166&h=180&c=7&pcl=292827&r=0&o=5&dpr=1.3&pid=1.7')
                                                        }
                                                    />
                                                    <h3 className="text-lg font-medium text-gray-800 text-center">
                                                        {player.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 text-center">
                                                        #{player.number || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-1">
                                                    <p>
                                                        Vị trí:{' '}
                                                        <span className="text-gray-800">
                                                            {player.position || 'N/A'}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        Quốc tịch:{' '}
                                                        <span className="text-gray-800">
                                                            {player.nationality || 'N/A'}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        Ngày sinh:{' '}
                                                        <span className="text-gray-800">{formatDate(player.dob)}</span>
                                                    </p>
                                                    <p>
                                                        Ngoại binh:{' '}
                                                        <span className="text-gray-800">
                                                            {player.isForeigner ? 'Có' : 'Không'}
                                                        </span>
                                                    </p>
                                                    <p>
                                                        Số trận:{' '}
                                                        {results.matchesPlayed != null ? results.matchesPlayed : 'N/A'}
                                                    </p>
                                                    <p>
                                                        Bàn thắng:{' '}
                                                        {results.totalGoals != null ? results.totalGoals : 'N/A'}
                                                    </p>
                                                    <p>
                                                        Kiến tạo:{' '}
                                                        {results.assists != null ? results.assists : 'N/A'}
                                                    </p>
                                                    <p>
                                                        Thẻ vàng:{' '}
                                                        {results.yellowCards != null ? results.yellowCards : 'N/A'}
                                                    </p>
                                                    <p>
                                                        Thẻ đỏ:{' '}
                                                        {results.redCards != null ? results.redCards : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            {token && setEditingPlayer && setShowForm && (
                                                <div className="mt-4 flex space-x-2 justify-center">
                                                    <button
                                                        onClick={() => handleEdit(player)}
                                                        className="px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-sm"
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
                        </div>
                    ))}
                </div>
            ) : (
                selectedSeason &&
                !loading && (
                    <p className="text-center text-gray-500">
                        Không có cầu thủ nào cho mùa giải và ngày đã chọn, hoặc chưa có kết quả nào được ghi nhận.
                    </p>
                )
            )}
        </div>
    );
};

export default Players;