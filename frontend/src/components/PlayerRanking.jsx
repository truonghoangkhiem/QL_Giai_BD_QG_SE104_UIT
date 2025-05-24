import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlayerRanking = ({ playerResults, teams, selectedDate, token }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const playersPerPage = 10;
    const defaultAvatarUrl = 'https://ui-avatars.com/api/?name=Unknown&background=random&size=50';

    const API_URL = 'http://localhost:5000';

    useEffect(() => {
        const fetchPlayerDetails = async () => {
            setLoading(true);
            setError('');

            if (!playerResults || playerResults.length === 0) {
                setPlayers([]);
                setLoading(false);
                return;
            }

            try {
                const playerDetailsPromises = playerResults.map(async (result) => {
                    let player = { name: `Cầu thủ ${result.player_id.slice(-6)}`, number: 'N/A' };
                    try {
                        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                        const playerResponse = await axios.get(`${API_URL}/api/players/${result.player_id}`, config);
                        player = playerResponse.data.data || player;
                    } catch (err) {
                        console.error(`Lỗi khi lấy thông tin cầu thủ ${result.player_id}:`, err.response?.data || err.message);
                    }

                    const team = teams.find((t) => t._id === result.team_id) || {
                        team_name: 'Không xác định',
                        logo: defaultAvatarUrl,
                    };

                    return {
                        _id: result._id,
                        player_id: result.player_id,
                        team_id: result.team_id,
                        playerName: player.name,
                        playerNumber: player.number,
                        teamName: team.team_name,
                        teamLogo: team.logo || defaultAvatarUrl,
                        matchesPlayed: Number(result.matchesPlayed || 0),
                        goals: Number(result.totalGoals || 0),
                        assists: Number(result.assists || 0),
                        yellowCards: Number(result.yellowCards || 0),
                        redCards: Number(result.redCards || 0),
                        date: result.date,
                    };
                });

                const resolvedPlayerDetails = await Promise.all(playerDetailsPromises);
                const validPlayers = resolvedPlayerDetails
                    .filter((p) => p)
                    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName));

                setPlayers(validPlayers);
            } catch (err) {
                setError('Không thể tải dữ liệu xếp hạng cầu thủ: ' + (err.message || 'Lỗi không xác định'));
                setPlayers([]);
            } finally {
                setLoading(false);
            }
        };

        if (playerResults && teams) {
            fetchPlayerDetails();
        } else {
            setPlayers([]);
            setLoading(false);
        }
    }, [playerResults, teams, token]);

    const filteredPlayersByDate = selectedDate
        ? players.filter((player) => {
            const playerDate = new Date(player.date);
            const filterDate = new Date(selectedDate);
            filterDate.setUTCHours(0, 0, 0, 0);
            playerDate.setUTCHours(0, 0, 0, 0);
            return playerDate <= filterDate;
        })
        : players;

    const rankedAndSortedPlayers = filteredPlayersByDate.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        return a.playerName.localeCompare(b.playerName);
    });

    // Tách cầu thủ hạng 1
    const topPlayer = rankedAndSortedPlayers[0];
    // Loại bỏ cầu thủ hạng 1 khỏi danh sách bảng xếp hạng
    const remainingPlayers = rankedAndSortedPlayers.slice(1);

    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const paginatedPlayers = remainingPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
    const totalPages = Math.ceil(remainingPlayers.length / playersPerPage) || 1;

    const handleImageError = (e) => {
        e.target.src = defaultAvatarUrl;
    };

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
        <div className="bg-gradient-to-t from-white to-gray-500 rounded-2xl shadow-lg p-8">
            {error && <p className="text-red-500 text-center p-3 bg-red-100 rounded-md mb-4">{error}</p>}

            {/* Card cho cầu thủ hạng 1 */}
            {topPlayer ? (
                <div className="mb-8 p-6 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl shadow-xl border-2 ">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-shrink-0">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    topPlayer.playerName
                                )}&background=random&size=128`}
                                alt={`${topPlayer.playerName} avatar`}
                                className="w-32 h-32 rounded-full object-cover shadow-lg"
                                onError={handleImageError}
                            />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-bold mb-2">
                                {topPlayer.playerName} (#{topPlayer.playerNumber})
                            </h2>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                                <img
                                    src={topPlayer.teamLogo}
                                    alt={`${topPlayer.teamName} logo`}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={handleImageError}
                                />
                                <p className="text-lg">{topPlayer.teamName}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                                <p><span className="font-semibold">Số trận:</span> {topPlayer.matchesPlayed}</p>
                                <p><span className="font-semibold">Bàn thắng:</span> {topPlayer.goals}</p>
                                <p><span className="font-semibold">Kiến tạo:</span> {topPlayer.assists}</p>
                                <p><span className="font-semibold">Thẻ vàng:</span> {topPlayer.yellowCards}</p>
                                <p><span className="font-semibold">Thẻ đỏ:</span> {topPlayer.redCards}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-center text-gray-500 mb-8">Không có cầu thủ nào để hiển thị.</p>
            )}

            {/* Bảng xếp hạng cho các cầu thủ còn lại */}
            {remainingPlayers.length === 0 && !error && !loading ? (
                <p className="text-center text-gray-500 py-4">Không có thông tin xếp hạng cầu thủ cho lựa chọn hiện tại.</p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto border-collapse">
                            <thead>
                                <tr className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                                    <th className="px-6 py-4 text-left text-sm font-semibold ">Hạng</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold ">Cầu thủ</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold ">Đội</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold ">Trận</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold ">Bàn thắng</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold ">Kiến tạo</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold ">Thẻ vàng</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold ">Thẻ đỏ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPlayers.map((player, index) => (
                                    <tr
                                        key={player._id || player.player_id}
                                        className="border-b border-black hover:bg-red-400 transition duration-150"
                                    >
                                        <td className="px-6 py-4 text-gray-700">
                                            {(currentPage - 1) * playersPerPage + index + 2} {/* Bắt đầu từ hạng 2 */}
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    player.playerName
                                                )}&background=random&size=50`}
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
                    {totalPages > 1 && (
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
                    )}
                </>
            )}
        </div>
    );
};

export default PlayerRanking;