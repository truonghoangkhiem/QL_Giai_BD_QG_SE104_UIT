import React, { useState } from 'react';
import axios from 'axios';

const Players = ({ setEditingPlayer, setShowForm, token, players, setError, handleSuccess, loading, setAllPlayers }) => {
    const [deletingId, setDeletingId] = useState(null);

    const API_URL = 'http://localhost:5000';
    const defaultPlayerAvatar = 'https://th.bing.com/th/id/OIP.2Kb4oZ95hq4HKWdUFHweAAAAAA?w=166&h=180&c=7&pcl=292827&r=0&o=5&dpr=1.3&pid=1.7';

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

        setDeletingId(id);
        setError('');

        try {
            await axios.delete(`${API_URL}/api/players/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Cập nhật UI bằng cách gọi setAllPlayers từ props
            setAllPlayers((prevPlayers) => prevPlayers.filter((player) => player._id !== id));
            handleSuccess('Xóa cầu thủ thành công. Dữ liệu mùa giải có thể đang được tính toán lại.');
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa cầu thủ thất bại.');
        } finally {
            setDeletingId(null);
        }
    };
    
    const handleImageError = (e) => {
        e.target.src = defaultPlayerAvatar;
        e.target.onerror = null;
    };

    const groupPlayersByTeam = () => {
        return players.reduce((acc, player) => {
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

    if (loading) {
        return <p className="text-center text-gray-500 py-10">Đang tải danh sách cầu thủ...</p>;
    }

    return (
        <div className="container mx-auto text-gray-800">
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
                <p className="text-center text-gray-500 py-10">Không tìm thấy cầu thủ nào phù hợp.</p>
            )}
        </div>
    );
};

export default Players;