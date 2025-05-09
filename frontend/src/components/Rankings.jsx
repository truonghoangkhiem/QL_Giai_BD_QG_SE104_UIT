import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const Rankings = ({ seasonId, token, seasons, formatDate, setSelectedSeasonId, hideDropdown = false }) => {
    const [teamResults, setTeamResults] = useState([]);
    const [teams, setTeams] = useState([]);
    const [regulation, setRegulation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const teamsPerPage = 10;

    const defaultLogoUrl = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain';

    // Xử lý lỗi hình ảnh
    const handleImageError = (e) => {
        e.target.src = defaultLogoUrl;
    };

    // Xử lý thay đổi ngày
    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        setCurrentPage(1);
    };

    // Xử lý thay đổi đội bóng
    const handleTeamChange = (e) => {
        setSelectedTeam(e.target.value);
        setCurrentPage(1);
    };

    // Xử lý thay đổi mùa giải
    const handleSeasonChange = (e) => {
        setSelectedSeasonId(e.target.value);
        setSelectedDate('');
        setSelectedTeam('');
        setCurrentPage(1);
    };

    // Lấy dữ liệu
    useEffect(() => {
        const fetchData = async () => {
            if (!seasonId || !/^[0-9a-fA-F]{24}$/.test(seasonId)) {
                setError('Mùa giải không hợp lệ.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');
            setTeamResults([]);
            setTeams([]);
            setRegulation(null);

            try {
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

                // Lấy danh sách đội bóng
                let teamsResponse;
                try {
                    teamsResponse = await axios.get(`http://localhost:5000/api/teams/seasons/${seasonId}`, config);
                } catch (err) {
                    if (err.response?.status === 401 && token) {
                        teamsResponse = await axios.get(`http://localhost:5000/api/teams/seasons/${seasonId}`);
                    } else {
                        throw new Error('Không thể lấy danh sách đội bóng: ' + (err.response?.data?.message || err.message));
                    }
                }

                if (teamsResponse.data.status !== 'success' || !Array.isArray(teamsResponse.data.data)) {
                    throw new Error('Dữ liệu đội bóng không hợp lệ.');
                }

                const teamsData = teamsResponse.data.data;
                setTeams(teamsData);

                // Lấy kết quả đội bóng
                const teamResultsResponse = await axios.get(`http://localhost:5000/api/team_results/season/${seasonId}`, config);
                if (teamResultsResponse.data.status !== 'success' || !Array.isArray(teamResultsResponse.data.data)) {
                    throw new Error('Dữ liệu kết quả đội bóng không hợp lệ.');
                }

                const allTeamResults = teamResultsResponse.data.data;
                console.log('teamResults:', allTeamResults);
                setTeamResults(allTeamResults);

                // Lấy ID quy định xếp hạng
                const regulationIdResponse = await axios.get(
                    `http://localhost:5000/api/regulations/${seasonId}/Ranking%20Rules`,
                    config
                );
                if (regulationIdResponse.data.status !== 'success' || !regulationIdResponse.data.data) {
                    throw new Error('Không tìm thấy quy định xếp hạng.');
                }

                const regulationId = regulationIdResponse.data.data;

                // Lấy chi tiết quy định xếp hạng
                const regulationResponse = await axios.get(
                    `http://localhost:5000/api/regulations/${regulationId}`,
                    config
                );
                if (regulationResponse.data.status !== 'success' || !regulationResponse.data.data) {
                    throw new Error('Không thể lấy chi tiết quy định xếp hạng.');
                }

                const regulationData = regulationResponse.data.data;
                if (
                    regulationData.regulation_name !== 'Ranking Rules' ||
                    !Array.isArray(regulationData.rules?.rankingCriteria)
                ) {
                    throw new Error('Quy định không hợp lệ hoặc thiếu tiêu chí xếp hạng.');
                }
                setRegulation(regulationData);
                setLoading(false);
            } catch (err) {
                console.error('Lỗi khi lấy dữ liệu:', {
                    message: err.message,
                    status: err.response?.status,
                    data: err.response?.data,
                });
                setError('Mùa giải không có thông tin.');
                setLoading(false);
            }
        };

        fetchData();
    }, [seasonId, token]);

    // Xử lý và sắp xếp dữ liệu
    const rankingCriteria = regulation?.rules?.rankingCriteria || ['points', 'goalsDifference', 'goalsForAway'];

    const enrichedResults = useMemo(() => {
        if (!teamResults.length || !teams.length) {
            return [];
        }

        let filteredResults = teamResults;
        if (selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            filteredResults = teamResults.filter(result => {
                const resultDate = new Date(result.date);
                return resultDate <= selectedDateObj;
            });
        }

        const latestResultsByTeam = teams
            .map(team => {
                const resultsForTeam = filteredResults
                    .filter(result =>
                        result && typeof result === 'object' && result.team_id && result.team_id.toString() === team._id
                    );
                if (resultsForTeam.length === 0) {
                    return null;
                }
                return resultsForTeam.sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    return dateB - dateA;
                })[0];
            })
            .filter(result => result !== null);

        // Chỉ lấy các đội có kết quả trong latestResultsByTeam
        const validTeamIds = new Set(
            latestResultsByTeam
                .filter(result => result && typeof result === 'object' && result.team_id)
                .map(result => result.team_id.toString())
        );
        let filteredTeams = teams.filter(team => validTeamIds.has(team._id));

        if (selectedTeam) {
            filteredTeams = filteredTeams.filter(team => team._id === selectedTeam);
        }

        if (!filteredTeams.length) {
            return [];
        }

        return filteredTeams
            .map(team => {
                const result = latestResultsByTeam.find(r => r.team_id.toString() === team._id);
                if (!result) {
                    console.warn(`Không tìm thấy kết quả cho đội: ${team.team_name} (${team._id})`);
                    return null;
                }

                let headToHeadPoints = {};
                if (result.headToHeadPoints instanceof Map) {
                    headToHeadPoints = Object.fromEntries(result.headToHeadPoints);
                } else if (typeof result.headToHeadPoints === 'object' && result.headToHeadPoints !== null) {
                    headToHeadPoints = result.headToHeadPoints;
                } else {
                    console.warn(`headToHeadPoints không hợp lệ cho team_id: ${result.team_id}`, result.headToHeadPoints);
                    headToHeadPoints = {};
                }

                // Kiểm tra các trường cần thiết
                if (typeof result.goalsForAway === 'undefined') {
                    console.warn(`goalsForAway không tồn tại cho team_id: ${result.team_id}`, result);
                }

                return {
                    teamId: result.team_id.toString(),
                    teamName: team.team_name || 'Đội không xác định',
                    logo: team.logo || defaultLogoUrl,
                    points: Number(result.points) || 0,
                    goalsDifference: Number(result.goalsDifference) || 0,
                    goalsForAway: Number(result.goalsForAway) || 0,
                    headToHeadPoints,
                    matchPlayed: Number(result.matchplayed) || 0,
                    wins: Number(result.wins) || 0,
                    draws: Number(result.draws) || 0,
                    losses: Number(result.losses) || 0,
                    goalsFor: Number(result.goalsFor) || 0,
                    goalsAgainst: Number(result.goalsAgainst) || 0,
                };
            })
            .filter(team => team !== null)
            .sort((a, b) => {
                for (const criterion of rankingCriteria) {
                    if (criterion === 'points') {
                        if (a.points !== b.points) return b.points - a.points;
                    } else if (criterion === 'goalsDifference') {
                        if (a.goalsDifference !== b.goalsDifference) return b.goalsDifference - a.goalsDifference;
                    } else if (criterion === 'goalsForAway') {
                        if (a.goalsForAway !== b.goalsForAway) return b.goalsForAway - a.goalsForAway;
                    } else if (criterion === 'headToHeadPoints') {
                        const pointsA = (a.headToHeadPoints && typeof a.headToHeadPoints === 'object' && b.teamId in a.headToHeadPoints)
                            ? Number(a.headToHeadPoints[b.teamId]) || 0
                            : 0;
                        const pointsB = (b.headToHeadPoints && typeof b.headToHeadPoints === 'object' && a.teamId in b.headToHeadPoints)
                            ? Number(b.headToHeadPoints[a.teamId]) || 0
                            : 0;
                        if (pointsA !== pointsB) return pointsB - pointsA;
                    }
                }
                return 0;
            })
            .map((result, index) => ({ ...result, rank: index + 1 }));
    }, [teamResults, teams, rankingCriteria, selectedDate, selectedTeam]);

    // Phân trang
    const indexOfLastTeam = currentPage * teamsPerPage;
    const indexOfFirstTeam = indexOfLastTeam - teamsPerPage;
    const paginatedResults = enrichedResults.slice(indexOfFirstTeam, indexOfLastTeam);
    const totalPages = Math.ceil(enrichedResults.length / teamsPerPage);

    // Điều hướng trang
    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    }, [currentPage, totalPages]);

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    // Trạng thái loading
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    // Đảm bảo seasons là mảng
    const safeSeasons = Array.isArray(seasons) ? seasons : [];

    // Hàm formatDate an toàn
    const safeFormatDate = (date) => {
        if (!date) return 'N/A';
        try {
            return formatDate(date);
        } catch (err) {
            console.error('Error formatting date:', err, date);
            return 'N/A';
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Bộ lọc - Ẩn nếu hideDropdown là true */}
            {!hideDropdown && (
                <div className="mb-8 flex flex-col sm:flex-row justify-center gap-4">
                    <div className="flex items-center gap-3">
                        <label htmlFor="season-select" className="text-sm font-medium text-gray-700">
                            Mùa giải:
                        </label>
                        <select
                            id="season-select"
                            value={seasonId || ''}
                            onChange={handleSeasonChange}
                            className="w-full sm:w-64 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition duration-200 hover:border-blue-400 hover:shadow-md"
                        >
                            <option value="">Chọn mùa giải</option>
                            {safeSeasons.map(season => (
                                <option key={season._id || `season-${Math.random()}`} value={season._id || ''}>
                                    {`${season.season_name || 'Không xác định'} (${safeFormatDate(season.start_date)} - ${safeFormatDate(season.end_date)})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">
                            Ngày:
                        </label>
                        <input
                            type="date"
                            id="date-filter"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="w-full sm:w-48 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition duration-200 hover:border-blue-400 hover:shadow-md"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <label htmlFor="team-filter" className="text-sm font-medium text-gray-700">
                            Đội bóng:
                        </label>
                        <select
                            id="team-filter"
                            value={selectedTeam}
                            onChange={handleTeamChange}
                            className="w-full sm:w-64 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition duration-200 hover:border-blue-400 hover:shadow-md"
                        >
                            <option value="">Tất cả đội bóng</option>
                            {teams.map(team => (
                                <option key={team._id} value={team._id}>
                                    {team.team_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Thông báo lỗi hoặc không có dữ liệu */}
            {(error || enrichedResults.length === 0) && (
                <p className="text-center text-gray-500 py-4">
                    {error || 'Mùa giải không có thông tin.'}
                </p>
            )}

            {/* Bảng xếp hạng */}
            {enrichedResults.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Hạng</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Đội</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Trận</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Thắng</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Hòa</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Thua</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Bàn thắng</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Bàn thua</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Hiệu số</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Điểm</th>
                                    {rankingCriteria.includes('goalsForAway') && (
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Bàn thắng sân khách</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedResults.map(team => (
                                    <tr key={team.rank} className="border-b border-gray-100 hover:bg-blue-50 transition duration-150">
                                        <td className="px-6 py-4 text-gray-700">{team.rank}</td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img
                                                src={team.logo}
                                                alt={`${team.teamName} logo`}
                                                className="w-8 h-8 rounded-full object-cover shadow-sm"
                                                onError={handleImageError}
                                            />
                                            <span className="font-medium text-gray-800">{team.teamName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.matchPlayed}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.wins}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.draws}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.losses}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.goalsFor}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.goalsAgainst}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.goalsDifference}</td>
                                        <td className="px-6 py-4 text-center text-gray-700">{team.points}</td>
                                        {rankingCriteria.includes('goalsForAway') && (
                                            <td className="px-6 py-4 text-center text-gray-700">{team.goalsForAway || 0}</td>
                                        )}
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

export default Rankings;