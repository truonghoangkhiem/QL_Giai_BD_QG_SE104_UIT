import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Regulations = ({ regulations, setRegulations, setEditingRegulation, setShowForm, token }) => {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRegulation, setExpandedRegulation] = useState(null);

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const seasonsRes = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(seasonsRes.data.data);
                if (seasonsRes.data.data.length > 0) {
                    setSelectedSeasonId(seasonsRes.data.data[0]._id);
                } else {
                    setError('Chưa có mùa giải nào được tạo. Vui lòng tạo mùa giải trước.');
                }
            } catch (err) {
                setError('Không thể tải danh sách mùa giải');
            }
        };
        fetchSeasons();
    }, []);

    useEffect(() => {
        const fetchRegulations = async () => {
            if (!selectedSeasonId) {
                setRegulations([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const regulationsRes = await axios.get(
                    `http://localhost:5000/api/regulations/season/${selectedSeasonId}`
                );
                const season = seasons.find(s => s._id === selectedSeasonId);
                setRegulations(regulationsRes.data.data.map(reg => ({
                    ...reg,
                    season_name: season ? season.season_name : 'Không rõ'
                })));
                setError('');
            } catch (err) {
                setError(err.response?.data?.message || `Không tìm thấy quy định cho mùa giải`);
            } finally {
                setLoading(false);
            }
        };
        fetchRegulations();
    }, [selectedSeasonId, setRegulations, seasons]);

    const seasonMap = seasons.reduce((map, season) => {
        map[season._id] = season.season_name;
        return map;
    }, {});

    const handleEdit = (reg) => {
        setEditingRegulation({ ...reg, season_name: seasonMap[reg.season_id] || reg.season_name });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/regulations/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRegulations((prev) => prev.filter((r) => r._id !== id));
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể xóa quy định');
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
        goalTimeLimit: 'Giới hạn thời gian',
        minMinute: 'Phút tối thiểu',
        maxMinute: 'Phút tối đa',
        winPoints: 'Điểm thắng',
        drawPoints: 'Điểm hòa',
        losePoints: 'Điểm thua',
        rankingCriteria: 'Tiêu chí xếp hạng',
        matchRounds: 'Số vòng đấu',
        homeTeamRule: 'Quy tắc đội nhà',
    };

    const renderRules = (r) => {
        if (!r.rules || typeof r.rules !== 'object') return <p className="text-base text-gray-500">Không có</p>;

        const entries = Object.entries(r.rules);
        return entries.map(([key, val]) => (
            <div key={key} className="text-base text-gray-700 leading-relaxed">
                <span className="font-semibold">{ruleLabels[key] || key}:</span>{' '}
                {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : val}
            </div>
        ));
    };

    if (loading) return <div className="p-8 text-center text-blue-500 animate-pulse text-2xl">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500 text-2xl">{error}</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                📜 Danh sách Quy định
            </h1>
            <div className="mb-6 flex justify-center">
                <div className="w-full max-w-md">
                    <label htmlFor="season-select" className="block text-lg font-semibold text-gray-800 mb-2 text-center">
                        Chọn mùa giải
                    </label>
                    <select
                        id="season-select"
                        value={selectedSeasonId}
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                        <option value="">Chọn mùa giải</option>
                        {seasons.map((season) => (
                            <option key={season._id} value={season._id}>
                                {season.season_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {regulations.length === 0 ? (
                <p className="text-center text-gray-500 italic text-xl mt-6">
                    Không có quy định nào cho mùa giải {seasonMap[selectedSeasonId] || 'được chọn'}.
                </p>
            ) : (
                <div className="bg-white shadow-2xl rounded-xl border border-gray-200">
                    <table className="w-full divide-y divide-gray-300 text-lg">
                        <thead className="bg-[#F2F2F2] text-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left font-bold text-xl tracking-wider">Tên quy định</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {regulations.map((r) => (
                                <React.Fragment key={r._id}>
                                    <tr
                                        className="hover:bg-gray-100 transition-all cursor-pointer"
                                        onClick={() => toggleExpand(r._id)}
                                    >
                                        <td className="px-6 py-4 font-semibold text-gray-800 text-xl">{r.regulation_name}</td>
                                    </tr>
                                    {expandedRegulation === r._id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan="1" className="px-6 py-4">
                                                <div className="space-y-4">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-semibold text-gray-800 text-lg">Mùa giải:</span>
                                                        <span className="text-gray-600 text-lg">{r.season_name || 'Không rõ'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-800 text-lg">Chi tiết:</span>
                                                        <div className="mt-2 space-y-2">{renderRules(r)}</div>
                                                    </div>
                                                    {token && (
                                                        <div className="flex space-x-3">
                                                            <button
                                                                onClick={() => handleEdit(r)}
                                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-md text-lg transition"
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(r._id)}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md text-lg transition"
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