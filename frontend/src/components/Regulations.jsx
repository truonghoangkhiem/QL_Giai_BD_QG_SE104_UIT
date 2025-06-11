import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Regulations = ({ onEdit, onDelete, token, selectedSeasonId, seasons, refreshKey }) => {
    const [localRegulations, setLocalRegulations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRegulation, setExpandedRegulation] = useState(null);
    const [deletingId, setDeletingId] = useState(null); // State cho vòng xoay tải khi xóa

    useEffect(() => {
        const fetchRegulations = async () => {
            if (!selectedSeasonId) {
                setLocalRegulations([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            setError('');
            try {
                const regulationsRes = await axios.get(`http://localhost:5000/api/regulations/season/${selectedSeasonId}`);
                const season = seasons.find(s => s._id === selectedSeasonId);
                setLocalRegulations(regulationsRes.data.data.map(reg => ({
                    ...reg,
                    season_name: season ? season.season_name : 'Không rõ'
                })));
            } catch (err) {
                setLocalRegulations([]);
                setError(err.response?.data?.message || `Không tìm thấy quy định cho mùa giải`);
            } finally {
                setLoading(false);
            }
        };
        fetchRegulations();
    }, [selectedSeasonId, seasons, refreshKey]);

    const seasonMap = seasons.reduce((map, season) => {
        map[season._id] = season.season_name;
        return map;
    }, {});

    const handleDeleteClick = async (e, id) => {
        e.stopPropagation(); // Ngăn việc đóng/mở hàng
        setDeletingId(id);
        await onDelete(id); // Gọi hàm xóa bất đồng bộ từ props
        setDeletingId(null);
    };

    const toggleExpand = (id) => {
        setExpandedRegulation(expandedRegulation === id ? null : id);
    };

    const ruleLabels = {
        minAge: 'Tuổi tối thiểu',
        maxAge: 'Tuổi tối đa',
        minPlayersPerTeam: 'Cầu thủ tối thiểu/đội',
        maxPlayersPerTeam: 'Cầu thủ tối đa/đội',
        maxForeignPlayers: 'Ngoại binh tối đa',
        goalTypes: 'Loại bàn thắng',
        winPoints: 'Điểm thắng',
        drawPoints: 'Điểm hòa',
        losePoints: 'Điểm thua',
        rankingCriteria: 'Tiêu chí xếp hạng',
        matchRounds: 'Số vòng đấu',
        homeTeamRule: 'Quy tắc đội nhà',
        'goalTimeLimit.minMinute': 'Phút tối thiểu (TGGB)',
        'goalTimeLimit.maxMinute': 'Phút tối đa (TGGB)',
    };

    const renderRules = (r) => {
        if (!r.rules || typeof r.rules !== 'object') return <p className="text-sm text-gray-500">Không có chi tiết.</p>;
        return Object.entries(r.rules).map(([key, val]) => {
            let displayValue = val;
            if (key === 'goalTimeLimit' && typeof val === 'object' && val !== null) {
                displayValue = `Từ phút ${val.minMinute || '?'} đến phút ${val.maxMinute || '?'}`;
            } else if (Array.isArray(val)) {
                displayValue = val.join(', ');
            } else if (typeof val === 'object' && val !== null) {
                displayValue = JSON.stringify(val);
            }
            return (
                <div key={key} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-800">{ruleLabels[key] || key}:</span>{' '}
                    {String(displayValue)}
                </div>
            );
        });
    };

    if (loading) return <div className="p-6 text-center text-gray-500 text-lg animate-pulse">Đang tải quy định...</div>;
    if (error && selectedSeasonId) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</div>;
    if (!selectedSeasonId && !loading) return <p className="text-center text-gray-500 italic py-6">Vui lòng chọn một mùa giải để xem quy định.</p>;

    return (
        <div className="">
            {localRegulations.length === 0 && !loading && selectedSeasonId ? (
                <p className="text-center text-gray-500 italic text-lg py-6">
                    Không có quy định nào cho mùa giải {seasonMap[selectedSeasonId] || 'đã chọn'}.
                </p>
            ) : localRegulations.length > 0 && (
                <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full divide-y divide-gray-200 text-sm md:text-base">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-4 py-3 md:px-6 md:py-4 text-left font-semibold uppercase tracking-wider">Tên quy định</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {localRegulations.map((r) => (
                                <React.Fragment key={r._id}>
                                    <tr className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => toggleExpand(r._id)}>
                                        <td className="px-4 py-3 md:px-6 md:py-4 font-semibold text-gray-800">{r.regulation_name}</td>
                                    </tr>
                                    {expandedRegulation === r._id && (
                                        <tr className="bg-gray-50 border-l-4 border-blue-500">
                                            <td colSpan="1" className="px-4 py-3 md:px-6 md:py-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-semibold text-gray-700">Mùa giải:</span>
                                                        <span className="text-gray-600">{r.season_name || 'Không rõ'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-700">Chi tiết quy định:</span>
                                                        <div className="mt-1 space-y-1 pl-2 border-l-2 border-gray-200 ml-1">{renderRules(r)}</div>
                                                    </div>
                                                    {token && (
                                                        <div className="flex space-x-2 pt-2">
                                                            {deletingId === r._id ? (
                                                                <div className="flex items-center justify-center h-8 w-20">
                                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                                                                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-md shadow-sm text-xs md:text-sm transition-colors"
                                                                    >
                                                                        Sửa
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleDeleteClick(e, r._id)}
                                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md shadow-sm text-xs md:text-sm transition-colors"
                                                                    >
                                                                        Xóa
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Regulations;