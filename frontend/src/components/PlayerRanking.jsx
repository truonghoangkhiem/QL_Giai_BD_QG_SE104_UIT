import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlayerRanking = ({ playerResults, teams, selectedDate, token }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const playersPerPage = 10;
    const defaultAvatarUrl = 'https://via.placeholder.com/50';

    const API_URL = 'http://localhost:5000';

    // Lấy thông tin cầu thủ và đội bóng
    useEffect(() => {
        const fetchPlayerDetails = async () => {
            setLoading(true);
            setError('');

            try {
                const playerDetails = await Promise.all(
                    playerResults.map(async (result) => {
                        try {
                            // Lấy thông tin cầu thủ
                            const playerResponse = await axios.get(`${API_URL}/api/players/${result.player_id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            const player = playerResponse.data.data || {};

                            // Tìm đội bóng từ danh sách teams
                            const team = teams.find((t) => t._id === result.team_id) || {
                                team_name: 'Không xác định',
                                logo: defaultAvatarUrl,
                            };

                            // Kiểm tra và ánh xạ các trường từ playerResult
                            return {
                                _id: result._id,
                                player_id: result.player_id,
                                team_id: result.team_id,
                                playerName: player.name || 'Không xác định',
                                playerNumber: player.number || 'N/A',
                                teamName: team.team_name,
                                teamLogo: team.logo || defaultAvatarUrl,
                                matchesPlayed: Number(result.matchesPlayed || result.matchesplayed || 0),
                                goals: Number(result.goals || result.totalGoals || 0),
                                assists: Number(result.assists || 0),
                                yellowCards: Number(result.yellowCards || 0),
                                redCards: Number(result.redCards || 0),
                                date: result.date,
                            };
                        } catch (err) {
                            console.error(`Lỗi khi lấy thông tin cầu thủ ${result.player_id}:`, err);
                            return null;
                        }
                    })
                );

                // Lọc bỏ các kết quả null và sắp xếp theo số bàn thắng
                const validPlayers = playerDetails
                    .filter((p) => p !== null)
                    .sort((a, b) => b.goals - a.goals);

                setPlayers(validPlayers);
            } catch (err) {
                setError('Không thể tải dữ liệu cầu thủ: ' + (err.message || 'Lỗi không xác định'));
            } finally {
                setLoading(false);
            }
        };

        if (playerResults.length && teams.length && token) {
            fetchPlayerDetails();
        } else {
            setError('Không có dữ liệu cầu thủ hoặc đội bóng.');
            setLoading(false);
        }
    }, [playerResults, teams, token]);

    // Lọc theo ngày
    const filteredPlayers = selectedDate
        ? players.filter((player) => {
            const playerDate = new Date(player.date);
            const filterDate = new Date(selectedDate);
            return playerDate <= filterDate;
        })
        : players;

    // Phân trang
    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const paginatedPlayers = filteredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
    const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);

    // Xử lý lỗi hình ảnh
    const handleImageError = (e) => {
        e.target.src = defaultAvatarUrl;
    };

    // Điều hướng trang
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prev) => prev - 1);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg p-8">
            {error || filteredPlayers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                    {error || 'Không có thông tin xếp hạng cầu thủ.'}
                </p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto border-collapse">
                            <thead>
                                <tr className="bg-gray-400">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Hạng</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cầu thủ</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Đội</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Trận</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Bàn thắng</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Kiến tạo</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Thẻ vàng</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Thẻ đỏ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPlayers.map((player, index) => (
                                    <tr
                                        key={player._id}
                                        className="border-b border-gray-100 hover:bg-blue-50 transition duration-150"
                                    >
                                        <td className="px-6 py-4 text-gray-700">
                                            {(currentPage - 1) * playersPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img
                                                src={defaultAvatarUrl}
                                                alt={`${player.playerName} avatar`}
                                                className="w-8 h-8 rounded-full object-cover shadow-sm"
                                                onError={handleImageError}
                                            />
                                            <span className="font-medium text-gray-800">
                                                {player.playerName} (#{player.playerNumber})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-700">{player.teamName}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{player.matchesPlayed}</td>
                                        <td className="px-6 py-4 text-center text-red-600 font-semibold">{player.goals}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{player.assists}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{player.yellowCards}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{player.redCards}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-6">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium transition duration-200 ${currentPage === 1 ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-blue-100 hover:shadow-md'
                                }`}
                        >
                            Trang trước
                        </button>
                        <span className="text-gray-600 font-medium">
                            Trang {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages}
                            className={`px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium transition duration-200 ${currentPage >= totalPages ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-blue-100 hover:shadow-md'
                                }`}
                        >
                            Trang tiếp theo
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PlayerRanking;