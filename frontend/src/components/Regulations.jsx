import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Bỏ props: regulations, setRegulations. Thêm props: selectedSeasonId, seasons, refreshKey
const Regulations = ({ setEditingRegulation, setShowForm, token, selectedSeasonId, seasons, refreshKey }) => {
    const [localRegulations, setLocalRegulations] = useState([]); // Đổi tên state để tránh nhầm lẫn
    // Bỏ state seasons và selectedSeasonId ở đây vì nhận từ props
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRegulation, setExpandedRegulation] = useState(null);

    // useEffect để fetch seasons không còn cần thiết ở đây

    useEffect(() => {
        const fetchRegulations = async () => {
            if (!selectedSeasonId) {
                setLocalRegulations([]); // Sử dụng state nội bộ
                setLoading(false);
                // Không set lỗi ở đây nếu chưa chọn mùa giải, để RegulationsPage xử lý thông báo
                return;
            }
            setLoading(true);
            setError(''); // Reset error mỗi khi fetch
            try {
                const regulationsRes = await axios.get(
                    `http://localhost:5000/api/regulations/season/${selectedSeasonId}`
                );
                // Tìm tên mùa giải từ props 'seasons'
                const season = seasons.find(s => s._id === selectedSeasonId);
                setLocalRegulations(regulationsRes.data.data.map(reg => ({ // Sử dụng state nội bộ
                    ...reg,
                    season_name: season ? season.season_name : 'Không rõ'
                })));
            } catch (err) {
                setLocalRegulations([]); // Đảm bảo regulations rỗng khi có lỗi
                setError(err.response?.data?.message || `Không tìm thấy quy định cho mùa giải`);
            } finally {
                setLoading(false);
            }
        };
        fetchRegulations();
    }, [selectedSeasonId, seasons, refreshKey]); // Thêm refreshKey vào dependencies

    const seasonMap = seasons.reduce((map, season) => { // Sử dụng prop 'seasons'
        map[season._id] = season.season_name;
        return map;
    }, {});

    const handleEdit = (reg) => {
        setEditingRegulation({ ...reg, season_name: seasonMap[reg.season_id] || reg.season_name });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa quy định này?')) {
            try {
                await axios.delete(`http://localhost:5000/api/regulations/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLocalRegulations((prev) => prev.filter((r) => r._id !== id)); // Sử dụng state nội bộ
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể xóa quy định');
            }
        }
    };

    const toggleExpand = (id) => {
        setExpandedRegulation(expandedRegulation === id ? null : id);
    };

    const ruleLabels = {
        minAge: 'Tuổi tối thiểu',
        maxAge: 'Tuổi tối đa',
        minPlayersPerTeam: 'Cầu thủ tối thiểu',
        maxPlayersPerTeam: 'Cầu thủ tối đa',
        maxForeignPlayers: 'Ngoại binh tối đa',
        goalTypes: 'Loại bàn thắng',
        // goalTimeLimit: 'Giới hạn thời gian ghi bàn', // Xem lại rule này, có thể là object
        winPoints: 'Điểm thắng',
        drawPoints: 'Điểm hòa',
        losePoints: 'Điểm thua',
        rankingCriteria: 'Tiêu chí xếp hạng',
        matchRounds: 'Số vòng đấu',
        homeTeamRule: 'Quy tắc đội nhà',
        // Các rule cụ thể hơn cho goalTimeLimit
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
                // Fallback cho các object khác không được xử lý đặc biệt
                displayValue = JSON.stringify(val);
            }

            return (
                <div key={key} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-800">{ruleLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>{' '}
                    {displayValue}
                </div>
            );
        });
    };


    if (loading) return <div className="p-6 text-center text-gray-500 text-lg animate-pulse">Đang tải quy định...</div>;
    // Không hiển thị error ở đây nếu selectedSeasonId rỗng, để RegulationsPage quyết định
    if (error && selectedSeasonId) return <div className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</div>;
    if (!selectedSeasonId && !loading) return <p className="text-center text-gray-500 italic py-6">Vui lòng chọn một mùa giải để xem quy định.</p>;


    return (
        // Bỏ max-w-4xl mx-auto p-6 vì RegulationsPage đã có container và padding
        <div className="">
            {/* Tiêu đề và phần chọn mùa giải đã được chuyển lên RegulationsPage.jsx */}

            {localRegulations.length === 0 && !loading && selectedSeasonId ? ( // Kiểm tra selectedSeasonId để hiển thị đúng thông báo
                <p className="text-center text-gray-500 italic text-lg py-6">
                    Không có quy định nào cho mùa giải {seasonMap[selectedSeasonId] || 'đã chọn'}.
                </p>
            ) : localRegulations.length > 0 && ( // Chỉ hiển thị bảng nếu có quy định
                <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden"> {/* Điều chỉnh shadow và border */}
                    <table className="w-full divide-y divide-gray-200 text-sm md:text-base"> {/* Điều chỉnh kích thước chữ */}
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-4 py-3 md:px-6 md:py-4 text-left font-semibold uppercase tracking-wider">Tên quy định</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {localRegulations.map((r) => (
                                <React.Fragment key={r._id}>
                                    <tr
                                        className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                        onClick={() => toggleExpand(r._id)}
                                    >
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
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
                                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-md shadow-sm text-xs md:text-sm transition-colors"
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md shadow-sm text-xs md:text-sm transition-colors"
                                                            >
                                                                Xóa
                                                            </button>
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