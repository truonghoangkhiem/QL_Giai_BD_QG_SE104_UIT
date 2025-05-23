import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PlayerRanking = ({ playerResults, teams, selectedDate, token }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const playersPerPage = 10;
    const defaultAvatarUrl = 'https://ui-avatars.com/api/?name=Unknown&background=random&size=50'; // Generic avatar

    const API_URL = 'http://localhost:5000';

    useEffect(() => {
        const fetchPlayerDetails = async () => {
            setLoading(true);
            setError('');

            if (!playerResults || playerResults.length === 0) {
                setPlayers([]);
                setLoading(false);
                // setError('Không có kết quả cầu thủ để hiển thị xếp hạng.'); // Optionally set an error or let the table show "no data"
                return;
            }

            try {
                const playerDetailsPromises = playerResults.map(async (result) => {
                    try {
                        const playerResponse = await axios.get(`${API_URL}/api/players/${result.player_id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        const player = playerResponse.data.data || {};
                        const team = teams.find((t) => t._id === result.team_id) || {
                            team_name: 'Không xác định',
                            logo: defaultAvatarUrl,
                        };

                        return {
                            _id: result._id, // Or player._id if more appropriate for key
                            player_id: result.player_id,
                            team_id: result.team_id,
                            playerName: player.name || 'Không xác định',
                            playerNumber: player.number || 'N/A',
                            teamName: team.team_name,
                            teamLogo: team.logo || defaultAvatarUrl,
                            matchesPlayed: Number(result.matchesPlayed || 0), // API sends matchesPlayed
                            goals: Number(result.totalGoals || 0), // API sends totalGoals
                            assists: Number(result.assists || 0),
                            yellowCards: Number(result.yellowCards || 0),
                            redCards: Number(result.redCards || 0),
                            date: result.date,
                        };
                    } catch (err) {
                        console.error(`Lỗi khi lấy thông tin cầu thủ ${result.player_id}:`, err.response?.data || err.message);
                        // Return a partial object or null to indicate failure for this specific player
                        return {
                            _id: result._id || result.player_id,
                            playerName: `Cầu thủ ID ${result.player_id} (Lỗi)`,
                            playerNumber: 'N/A',
                            teamName: 'N/A',
                            teamLogo: defaultAvatarUrl,
                            matchesPlayed: Number(result.matchesPlayed || 0),
                            goals: Number(result.totalGoals || 0),
                            assists: Number(result.assists || 0),
                            yellowCards: Number(result.yellowCards || 0),
                            redCards: Number(result.redCards || 0),
                            error: true, // Flag to indicate an error for this player
                        };
                    }
                });

                const resolvedPlayerDetails = await Promise.all(playerDetailsPromises);
                const validPlayers = resolvedPlayerDetails
                    .filter(p => p && !p.error) // Filter out nulls or errored entries
                    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName) ); // Sort by goals, then assists, then name

                setPlayers(validPlayers);
            } catch (err) {
                setError('Không thể tải đầy đủ dữ liệu chi tiết cầu thủ: ' + (err.message || 'Lỗi không xác định'));
                setPlayers([]); // Clear players on general error
            } finally {
                setLoading(false);
            }
        };

        if (playerResults && teams && token) { // Ensure all dependencies are present
            fetchPlayerDetails();
        } else {
            setPlayers([]); // Clear if dependencies are missing
            setLoading(false);
        }
    }, [playerResults, teams, token]);


    const filteredPlayersByDate = selectedDate
        ? players.filter((player) => {
            const playerDate = new Date(player.date);
            const filterDate = new Date(selectedDate);
            filterDate.setUTCHours(0,0,0,0); // Normalize filter date
            playerDate.setUTCHours(0,0,0,0); // Normalize player record date
            return playerDate <= filterDate; // Show stats up to and including the selected date
        })
        : players;
    
    // Re-sort after filtering by date, as the latest record for each player up to selectedDate matters.
    // The actual ranking should come from player_rankings API if it's separate.
    // This component currently sorts based on playerResults' stats.
     const rankedAndSortedPlayers = filteredPlayersByDate.sort((a, b) => {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
        return a.playerName.localeCompare(b.playerName);
    });


    const indexOfLastPlayer = currentPage * playersPerPage;
    const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
    const paginatedPlayers = rankedAndSortedPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
    const totalPages = Math.ceil(rankedAndSortedPlayers.length / playersPerPage) || 1;

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
        <div className="bg-white rounded-2xl shadow-lg p-8">
            {error && <p className="text-red-500 text-center p-3 bg-red-100 rounded-md mb-4">{error}</p>}
            {paginatedPlayers.length === 0 && !error && !loading ? (
                <p className="text-center text-gray-500 py-4">
                    Không có thông tin xếp hạng cầu thủ cho lựa chọn hiện tại.
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
                                        key={player._id || player.player_id}
                                        className="border-b border-gray-100 hover:bg-blue-50 transition duration-150"
                                    >
                                        <td className="px-6 py-4 text-gray-700">
                                            {(currentPage - 1) * playersPerPage + index + 1}
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=random&size=50`}
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