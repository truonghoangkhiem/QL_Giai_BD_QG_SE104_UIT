import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Regulations = ({ setEditingRegulation, setShowForm, token }) => {
    const [regulations, setRegulations] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedRegulation, setExpandedRegulation] = useState(null); // Track which regulation is expanded

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [regulationsRes, seasonsRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/regulations/'),
                    axios.get('http://localhost:5000/api/seasons'),
                ]);
                setRegulations(regulationsRes.data.data);
                setSeasons(seasonsRes.data.data);
            } catch (err) {
                setError('Không thể tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const seasonMap = seasons.reduce((map, season) => {
        map[season._id] = season.season_name;
        return map;
    }, {});

    const handleEdit = (reg) => {
        setEditingRegulation(reg);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/regulations/${id}`);
            setRegulations((prev) => prev.filter((r) => r._id !== id));
        } catch {
            setError('Không thể xóa quy định');
        }
    };

    const toggleExpand = (id) => {
        setExpandedRegulation(expandedRegulation === id ? null : id); // Toggle the expanded state
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
            <div key={key} className="text-base text-gray-700">
                <span className="font-semibold">{ruleLabels[key] || key}:</span>{' '}
                {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : val}
            </div>
        ));
    };

    if (loading) return <div className="p-8 text-center text-blue-500 animate-pulse text-2xl">Đang tải dữ liệu...</div>;
    if (error) return <div className="p-8 text-center text-red-500 text-2xl">{error}</div>;

    return (
        <div className="max-w-7xl mx-auto p-8">
            <h1 className="bg-gradient-to-r from-slate-600 to-slate-800 text-4xl font-extrabold text-white py-3 px-6 rounded-lg drop-shadow-md mb-4 text-center font-heading hover:brightness-110 transition-all duration-200">
                📜 Danh sách Quy định
            </h1>
            {regulations.length === 0 ? (
                <p className="text-center text-gray-500 italic text-xl">Không có quy định nào được tạo.</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow-2xl rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-300 text-lg">
                        <thead className="bg-[#F2F2F2] text-gray-800">
                            <tr>
                                <th className="px-8 py-5 text-left font-bold text-xl tracking-wider">Tên quy định</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {regulations.map((r) => (
                                <React.Fragment key={r._id}>
                                    <tr
                                        className="hover:bg-gray-100 transition-all cursor-pointer"
                                        onClick={() => toggleExpand(r._id)}
                                    >
                                        <td className="px-8 py-5 font-semibold text-gray-800 text-xl">{r.regulation_name}</td>
                                    </tr>
                                    {expandedRegulation === r._id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan="1" className="px-8 py-5">
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="font-semibold text-gray-800 text-lg">Mùa giải: </span>
                                                        <span className="text-gray-600 text-lg">{seasonMap[r.season_id] || 'Không rõ'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-800 text-lg">Chi tiết: </span>
                                                        <div className="mt-2">{renderRules(r)}</div>
                                                    </div>
                                                    {token && (
                                                        <div className="space-x-3">
                                                            <button
                                                                onClick={() => handleEdit(r)}
                                                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-md text-lg"
                                                            >
                                                                Sửa
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(r._id)}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md text-lg"
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