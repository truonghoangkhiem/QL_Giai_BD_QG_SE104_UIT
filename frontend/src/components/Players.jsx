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
    const defaultPlayerAvatar = 'https://th.bing.com/th/id/OIP.2Kb4oZ95hq4HKWdUFHweAAAAAA?w=166&h=180&c=7&pcl=292827&r=0&o=5&dpr=1.3&pid=1.7'; // Placeholder

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
        if (!selectedSeason) {
            setTeams([]);
            return;
        }
        const fetchTeams = async () => {
            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const response = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeason}`, config);
                setTeams(response.data.data || []);
            } catch (err) {
                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu đội bóng bị giới hạn do chưa đăng nhập. Vui lòng đăng nhập để xem đầy đủ.'
                        : `Không thể tải danh sách đội bóng cho mùa giải.`
                );
                setTeams([]);
            }
        };
        fetchTeams();
    }, [selectedSeason, token]);

    useEffect(() => {
        if (!selectedSeason || !selectedDate) {
            setLoading(false);
            setFilteredPlayers([]);
            setRawPlayerResultsData([]);
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
                    (t) => (t.season_id?._id || t.season_id) === selectedSeason
                );
                const teamIdsInCurrentSeason = new Set(teamsInCurrentSeason.map((t) => t._id));

                const seasonPlayers = allPlayersData.filter((player) => {
                    const playerTeamId = player.team_id?._id || player.team_id;
                    return teamIdsInCurrentSeason.has(playerTeamId);
                });
                setFilteredPlayers(seasonPlayers);

            } catch (err) {
                setError(
                    err.response?.status === 401
                        ? 'Dữ liệu cầu thủ bị giới hạn. Vui lòng đăng nhập để xem đầy đủ.'
                        : err.response?.data?.message || 'Không thể tải dữ liệu cầu thủ hoặc kết quả.'
                );
                setFilteredPlayers([]);
                setRawPlayerResultsData([]);
            } finally {
                setLoading(false);
            }
        };

        if (teams.length > 0 || !selectedSeason) {
            fetchPlayersAndResults();
        } else if (selectedSeason && teams.length === 0 && !loading) {
            setFilteredPlayers([]);
            setRawPlayerResultsData([]);
        }
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
            setSuccess('Xóa cầu thủ thành công!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa cầu thủ thất bại.');
        }
    };

    const groupPlayersByTeam = () => {
        const grouped = {};
        filteredPlayers.forEach((player) => {
            const playerTeamId = player.team_id?._id || player.team_id;
            const playerTeamObject = teams.find((t) => t._id === playerTeamId);

            if (playerTeamObject) {
                const teamId = playerTeamObject._id;
                if (!grouped[teamId]) {
                    grouped[teamId] = { team: playerTeamObject, players: [] };
                }
                grouped[teamId].players.push(player);
            } else {
                const unknownTeamId = `unknown-${playerTeamId || 'no-team'}`;
                if (!grouped[unknownTeamId]) {
                    grouped[unknownTeamId] = {
                        team: {
                            team_name: player.team_id?.team_name || 'Đội không xác định',
                            logo: player.team_id?.logo || 'https://via.placeholder.com/50',
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
    
    const handleImageError = (e) => {
        e.target.src = defaultPlayerAvatar;
        e.target.onerror = null; // Prevent infinite loop if default also fails
    };


    const renderFiltersAndTitle = (isInitialLoading = false) => (
        <div className="relative mb-8 shadow-lg rounded-lg overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center z-0"
                style={{
                    backgroundImage: `url('https://cdn.pixabay.com/photo/2023/04/01/22/10/goalkeeper-7893178_1280.jpg')`,
                    filter: 'brightness(1.3)', 
                }}
            ></div>
            <div className="absolute inset-0 bg-black opacity-60 z-10"></div>
            <div className="relative z-20 p-6">
                <h2 className="text-white text-3xl font-bold py-3 text-left mb-6" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                    Danh sách cầu thủ
                </h2>
                <div className="flex flex-col md:flex-row md:justify-start md:items-end gap-y-4 gap-x-6">
                    <div>
                        <label htmlFor="season-select" className="block text-sm font-medium text-gray-200 mb-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                            Chọn mùa giải:
                        </label>
                        <select
                            id="season-select"
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                            className="w-full md:w-auto border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">-- Chọn mùa giải --</option>
                            {seasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {season.season_name} ({formatDate(season.start_date)} - {formatDate(season.end_date)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date-select" className="block text-sm font-medium text-gray-200 mb-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                            Chọn ngày xem thống kê:
                        </label>
                        <input
                            type="date"
                            id="date-select"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full md:w-auto border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>
                {isInitialLoading && (
                    <p className="text-center text-gray-300 mt-4 text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>Vui lòng chọn mùa giải và ngày để xem danh sách cầu thủ.</p>
                )}
            </div>
        </div>
    );

    if (loading && (!selectedSeason || !selectedDate)) {
        return (
            <div className="container mx-auto px-4 py-6 min-h-screen text-gray-800">
                {renderFiltersAndTitle(true)}
            </div>
        );
    }

    if (loading) return (
        <div className="container mx-auto px-4 py-6 min-h-screen text-gray-800">
            {renderFiltersAndTitle()}
            <p className="text-center text-gray-500 py-10">Đang tải danh sách cầu thủ...</p>
        </div>
    );


    return (
        <div className="container mx-auto px-4 py-6 bg-gradient-to-t from-white to-gray-400 min-h-screen text-gray-800">
            {success && <p className="text-center text-green-600 mb-4 p-3 bg-green-100 rounded-md">{success}</p>}
            {error && !loading && <p className="text-center text-red-500 mb-4 p-3 bg-red-100 rounded-md">{error}</p>} 

            {renderFiltersAndTitle()}

            {!selectedSeason && !loading && (
                <p className="text-center text-gray-500 py-10">Vui lòng chọn một mùa giải để xem cầu thủ.</p>
            )}

            {selectedSeason && filteredPlayers.length > 0 ? (
                <div className="space-y-8">
                    {groupPlayersByTeam().map(({ team, players: teamPlayers }) => (
                        <div key={team._id} className="bg-gray-200 border border-gray-200 rounded-lg p-6 shadow-md">
                            <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                                <img
                                    src={team.logo || 'https://via.placeholder.com/50'}
                                    alt={`${team.team_name} logo`}
                                    className="w-12 h-12 rounded-full object-contain mr-4 border border-gray-200"
                                    onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain')}
                                />
                                <h3 className="text-2xl font-semibold text-gray-800">{team.team_name}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {teamPlayers.map((player) => {
                                    const playerTeamIdFromPlayerObject = player.team_id?._id || player.team_id;
                                    const results = rawPlayerResultsData.find(
                                        (pr) => pr.player_id === player._id && (pr.team_id?._id || pr.team_id) === playerTeamIdFromPlayerObject
                                    ) || { matchesPlayed: 0, totalGoals: 0, assists: 0, yellowCards: 0, redCards: 0 };

                                    return (
                                        <div
                                            key={player._id}
                                            className="bg-white hover:shadow-xl transition-shadow duration-300 ease-in-out border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col"
                                        >
                                            <div className="grid grid-cols-2 gap-4 items-start flex-grow"> 
                                                <div className="flex flex-col items-center text-center">
                                                    <img
                                                        src={player.avatar || defaultPlayerAvatar} // Use player.avatar or default
                                                        alt={`${player.name}`}
                                                        className="w-20 h-20 rounded-full object-cover mb-3 shadow-md"
                                                        onError={handleImageError} // Fallback if player.avatar fails
                                                    />
                                                    <h3 className="text-md font-semibold text-gray-800 w-full truncate" title={player.name}>
                                                        {player.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 w-full truncate">
                                                        #{player.number || 'N/A'} - {player.position || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-gray-600 space-y-1">
                                                    <p><strong>QT:</strong> {player.nationality || 'N/A'}</p>
                                                    <p><strong>NS:</strong> {formatDate(player.dob)}</p>
                                                    <p><strong>NB:</strong> {player.isForeigner ? 'Có' : 'Không'}</p>
                                                    <hr className="my-1" />
                                                    <p><strong>Trận:</strong> {results.matchesPlayed ?? '0'}</p>
                                                    <p><strong>BT:</strong> {results.totalGoals ?? '0'}</p>
                                                    <p><strong>KT:</strong> {results.assists ?? '0'}</p>
                                                    <p><strong>TV:</strong> {results.yellowCards ?? '0'}</p>
                                                    <p><strong>TĐ:</strong> {results.redCards ?? '0'}</p>
                                                </div>
                                            </div>
                                            {token && setEditingPlayer && setShowForm && (
                                                <div className="mt-4 flex space-x-2 justify-center pt-3 border-t border-gray-200">
                                                    <button
                                                        onClick={() => handleEdit(player)}
                                                        className="px-3 py-1.5 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-xs font-medium"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(player._id)}
                                                        className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-xs font-medium"
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
                selectedSeason && !loading && (
                    <p className="text-center text-gray-500 py-10">
                        Không có cầu thủ nào cho mùa giải và ngày đã chọn, hoặc chưa có kết quả nào được ghi nhận.
                    </p>
                )
            )}
        </div>
    );
};

export default Players;