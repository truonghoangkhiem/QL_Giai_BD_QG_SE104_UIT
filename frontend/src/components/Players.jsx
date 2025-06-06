import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Players = ({ setEditingPlayer, setShowForm, token, setPlayers, players, setError, handleSuccess }) => {
    const [filteredPlayers, setFilteredPlayers] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null); // State cho vòng xoay khi xóa

    const API_URL = 'http://localhost:5000';
    const defaultPlayerAvatar = 'https://th.bing.com/th/id/OIP.2Kb4oZ95hq4HKWdUFHweAAAAAA?w=166&h=180&c=7&pcl=292827&r=0&o=5&dpr=1.3&pid=1.7';

    // Tải danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/seasons`);
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (seasonsData.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasonsData[0]._id);
                }
            } catch (err) {
                setError('Không thể tải danh sách mùa giải.');
            }
        };
        fetchSeasons();
    }, []);

    // Tải danh sách cầu thủ khi mùa giải thay đổi
    useEffect(() => {
        if (!selectedSeason) {
            setLoading(false);
            setPlayers([]); // Cập nhật state cha
            return;
        }

        const fetchPlayersForSeason = async () => {
            setLoading(true);
            setError('');
            try {
                // Lấy tất cả các đội trong mùa giải đã chọn
                const teamsResponse = await axios.get(`${API_URL}/api/teams/seasons/${selectedSeason}`);
                const teamsInSeason = teamsResponse.data.data || [];
                const teamIds = new Set(teamsInSeason.map(t => t._id));

                // Lấy tất cả cầu thủ và lọc theo đội của mùa giải
                const allPlayersResponse = await axios.get(`${API_URL}/api/players`);
                const allPlayers = allPlayersResponse.data.data || [];
                
                const playersForSeason = allPlayers.filter(p => teamIds.has(p.team_id?._id || p.team_id));
                
                setPlayers(playersForSeason); // Cập nhật state cha
            } catch (err) {
                setError('Không thể tải danh sách cầu thủ cho mùa giải này.');
                setPlayers([]); // Cập nhật state cha
            } finally {
                setLoading(false);
            }
        };

        fetchPlayersForSeason();
    }, [selectedSeason, setPlayers, setError]);

    // Cập nhật filteredPlayers khi players ở component cha thay đổi
    useEffect(() => {
        setFilteredPlayers(players);
    }, [players]);


    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error('Invalid date');
            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return 'N/A';
        }
    };

    const handleEdit = (player) => {
        setEditingPlayer(player);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa cầu thủ này? Hành động này sẽ xóa mọi kết quả và xếp hạng liên quan của cầu thủ.')) {
            return;
        }

        setDeletingId(id); // Bắt đầu tải
        setError('');

        try {
            await axios.delete(`${API_URL}/api/players/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Cập nhật UI bằng cách gọi setPlayers từ props
            setPlayers((prevPlayers) => prevPlayers.filter((player) => player._id !== id));
            handleSuccess('Xóa cầu thủ thành công. Dữ liệu mùa giải có thể đang được tính toán lại.');
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa cầu thủ thất bại.');
        } finally {
            setDeletingId(null); // Dừng tải
        }
    };
    
    const handleImageError = (e) => {
        e.target.src = defaultPlayerAvatar;
        e.target.onerror = null;
    };

    const groupPlayersByTeam = () => {
        return filteredPlayers.reduce((acc, player) => {
            const teamId = player.team_id?._id || player.team_id || 'unknown';
            if (!acc[teamId]) {
                acc[teamId] = {
                    team: player.team_id || { team_name: 'Đội không xác định', logo: '' },
                    players: []
                };
            }
            acc[teamId].players.push(player);
            return acc;
        }, {});
    };

    const groupedPlayers = groupPlayersByTeam();

    const renderFiltersAndTitle = () => (
        <div className="relative mb-8 shadow-lg rounded-lg overflow-hidden">
             <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url('https://cdn.pixabay.com/photo/2023/04/01/22/10/goalkeeper-7893178_1280.jpg')`, filter: 'brightness(0.7)' }}></div>
            <div className="absolute inset-0 bg-black opacity-60 z-10"></div>
            <div className="relative z-20 p-6">
                <h2 className="text-white text-3xl font-bold py-3 text-left mb-4" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                    Danh sách cầu thủ
                </h2>
                <div className="flex items-end gap-4">
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
                            <option value="">-- Tất cả mùa giải --</option>
                            {seasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {season.season_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
             <div className="container mx-auto px-4 py-6 min-h-screen text-gray-800">
                {renderFiltersAndTitle()}
                <p className="text-center text-gray-500 py-10">Đang tải danh sách cầu thủ...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 text-gray-800">
            {renderFiltersAndTitle()}
            {Object.keys(groupedPlayers).length > 0 ? (
                <div className="space-y-8">
                    {Object.values(groupedPlayers).map(({ team, players }) => (
                        <div key={team._id} className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-md">
                            <div className="flex items-center mb-4 pb-3 border-b border-gray-300">
                                <img src={team.logo || ''} alt={`${team.team_name} logo`} className="w-12 h-12 rounded-full object-contain mr-4 border border-gray-200" onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain')} />
                                <h3 className="text-2xl font-semibold text-gray-800">{team.team_name}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {players.map((player) => (
                                    <div key={player._id} className="bg-white hover:shadow-xl transition-shadow duration-300 ease-in-out border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                                        <div className="flex-grow">
                                            <div className="flex flex-col items-center text-center">
                                                <img src={player.avatar || defaultPlayerAvatar} alt={`${player.name}`} className="w-24 h-24 rounded-full object-cover mb-3 shadow-md" onError={handleImageError} />
                                                <h4 className="text-md font-semibold text-gray-800 w-full truncate" title={player.name}>{player.name}</h4>
                                                <p className="text-sm text-gray-500">#{player.number || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{player.position || 'N/A'}</p>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1 mt-3 border-t pt-2">
                                                <p><strong>Quốc tịch:</strong> {player.nationality || 'N/A'}</p>
                                                <p><strong>Ngày sinh:</strong> {formatDate(player.dob)}</p>
                                                <p><strong>Ngoại binh:</strong> {player.isForeigner ? 'Có' : 'Không'}</p>
                                            </div>
                                        </div>
                                        {token && (
                                            <div className="mt-4 flex space-x-2 justify-center pt-3 border-t border-gray-200">
                                                {deletingId === player._id ? (
                                                    <div className="flex items-center justify-center h-8 w-full">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleEdit(player)} className="px-3 py-1.5 rounded bg-yellow-500 text-white hover:bg-yellow-600 text-xs font-medium">Sửa</button>
                                                        <button onClick={() => handleDelete(player._id)} className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-xs font-medium">Xóa</button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-10">Không có cầu thủ nào cho mùa giải đã chọn.</p>
            )}
        </div>
    );
};

export default Players;