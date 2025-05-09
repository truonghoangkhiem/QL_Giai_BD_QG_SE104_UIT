import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RegulationForm = ({ editingRegulation, setEditingRegulation, setShowForm, setRegulations, token }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        season_name: '',
        regulation_name: '',
        rules: {
            minAge: '',
            maxAge: '',
            minPlayersPerTeam: '',
            maxPlayersPerTeam: '',
            maxForeignPlayers: '',
            matchRounds: '',
            homeTeamRule: '',
            goalTypes: '',
            goalTimeLimit: { minMinute: '', maxMinute: '' },
            winPoints: '',
            drawPoints: '',
            losePoints: '',
            rankingCriteria: [], // Mảng các object { criterion: string, priority: string } để quản lý giao diện
        },
    });
    const [seasons, setSeasons] = useState([]);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Danh sách tiêu chí cố định
    const rankingCriteriaOptions = ['points', 'goalDifference', 'goalsFor', 'headToHead'];

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(response.data.data);
                if (!editingRegulation && response.data.data.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        season_id: response.data.data[0]._id,
                        season_name: response.data.data[0].season_name,
                    }));
                }
            } catch (err) {
                setError('Không thể tải danh sách mùa giải');
            }
        };
        fetchSeasons();
    }, [editingRegulation]);

    useEffect(() => {
        if (editingRegulation) {
            const rules = editingRegulation.rules || {};
            setFormData({
                season_id: editingRegulation.season_id,
                season_name: editingRegulation.season_name,
                regulation_name: editingRegulation.regulation_name,
                rules: {
                    minAge: rules.minAge?.toString() || '',
                    maxAge: rules.maxAge?.toString() || '',
                    minPlayersPerTeam: rules.minPlayersPerTeam?.toString() || '',
                    maxPlayersPerTeam: rules.maxPlayersPerTeam?.toString() || '',
                    maxForeignPlayers: rules.maxForeignPlayers?.toString() || '',
                    matchRounds: rules.matchRounds?.toString() || '',
                    homeTeamRule: rules.homeTeamRule || '',
                    goalTypes: rules.goalTypes?.join(', ') || '',
                    goalTimeLimit: {
                        minMinute: rules.goalTimeLimit?.minMinute?.toString() || '',
                        maxMinute: rules.goalTimeLimit?.maxMinute?.toString() || '',
                    },
                    winPoints: rules.winPoints?.toString() || '',
                    drawPoints: rules.drawPoints?.toString() || '',
                    losePoints: rules.losePoints?.toString() || '',
                    // Chuyển mảng chuỗi thành mảng object với priority mặc định
                    rankingCriteria: rules.rankingCriteria?.map((criterion, index) => ({
                        criterion,
                        priority: (index + 1).toString(), // Gán priority theo thứ tự hiện tại
                    })) || [],
                },
            });
        }
    }, [editingRegulation]);

    const handleSeasonChange = (e) => {
        const selectedSeason = seasons.find((season) => season._id === e.target.value);
        if (selectedSeason) {
            setFormData({
                ...formData,
                season_id: selectedSeason._id,
                season_name: selectedSeason.season_name,
            });
        }
    };

    const handleInputChange = (e, field, subField = null) => {
        const value = e.target.value;
        if (subField) {
            setFormData({
                ...formData,
                rules: {
                    ...formData.rules,
                    [field]: {
                        ...formData.rules[field],
                        [subField]: value,
                    },
                },
            });
        } else {
            setFormData({
                ...formData,
                rules: {
                    ...formData.rules,
                    [field]: value,
                },
            });
        }
    };

    const handleRankingCriteriaChange = (criterion, checked, priority = '') => {
        let newCriteria = [...formData.rules.rankingCriteria];
        if (checked) {
            // Thêm tiêu chí mới nếu được chọn
            newCriteria.push({ criterion, priority });
        } else {
            // Xóa tiêu chí nếu bỏ chọn
            newCriteria = newCriteria.filter(item => item.criterion !== criterion);
        }
        setFormData({
            ...formData,
            rules: {
                ...formData.rules,
                rankingCriteria: newCriteria,
            },
        });
    };

    const handlePriorityChange = (criterion, priority) => {
        const newCriteria = formData.rules.rankingCriteria.map(item => {
            if (item.criterion === criterion) {
                return { ...item, priority };
            }
            return item;
        });
        setFormData({
            ...formData,
            rules: {
                ...formData.rules,
                rankingCriteria: newCriteria,
            },
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let rules = {};
            switch (formData.regulation_name) {
                case 'Age Regulation':
                    rules = {
                        minAge: parseInt(formData.rules.minAge, 10),
                        maxAge: parseInt(formData.rules.maxAge, 10),
                        minPlayersPerTeam: parseInt(formData.rules.minPlayersPerTeam, 10),
                        maxPlayersPerTeam: parseInt(formData.rules.maxPlayersPerTeam, 10),
                        maxForeignPlayers: parseInt(formData.rules.maxForeignPlayers, 10),
                    };
                    if (Object.values(rules).some(val => isNaN(val) || val < 0)) {
                        throw new Error('Vui lòng nhập số hợp lệ (lớn hơn hoặc bằng 0) cho tất cả các trường');
                    }
                    break;
                case 'Match Rules':
                    rules = {
                        matchRounds: parseInt(formData.rules.matchRounds, 10),
                        homeTeamRule: formData.rules.homeTeamRule,
                    };
                    if (isNaN(rules.matchRounds) || rules.matchRounds < 0) {
                        throw new Error('Số vòng đấu phải là số hợp lệ (lớn hơn hoặc bằng 0)');
                    }
                    if (!rules.homeTeamRule) {
                        throw new Error('Quy tắc đội nhà không được để trống');
                    }
                    break;
                case 'Goal Rules':
                    rules = {
                        goalTypes: formData.rules.goalTypes.split(',').map(item => item.trim()).filter(item => item),
                        goalTimeLimit: {
                            minMinute: parseInt(formData.rules.goalTimeLimit.minMinute, 10),
                            maxMinute: parseInt(formData.rules.goalTimeLimit.maxMinute, 10),
                        },
                    };
                    if (!rules.goalTypes.length) {
                        throw new Error('Loại bàn thắng không được để trống');
                    }
                    if (isNaN(rules.goalTimeLimit.minMinute) || isNaN(rules.goalTimeLimit.maxMinute) || 
                        rules.goalTimeLimit.minMinute < 0 || rules.goalTimeLimit.maxMinute < 0) {
                        throw new Error('Giới hạn thời gian phải là số hợp lệ (lớn hơn hoặc bằng 0)');
                    }
                    break;
                case 'Ranking Rules':
                    rules = {
                        winPoints: parseInt(formData.rules.winPoints, 10),
                        drawPoints: parseInt(formData.rules.drawPoints, 10),
                        losePoints: parseInt(formData.rules.losePoints, 10),
                        rankingCriteria: [],
                    };
                    if (formData.rules.winPoints === '' || isNaN(rules.winPoints) || rules.winPoints < 0) {
                        throw new Error('Điểm thắng phải là số hợp lệ (lớn hơn hoặc bằng 0)');
                    }
                    if (formData.rules.drawPoints === '' || isNaN(rules.drawPoints) || rules.drawPoints < 0) {
                        throw new Error('Điểm hòa phải là số hợp lệ (lớn hơn hoặc bằng 0)');
                    }
                    if (formData.rules.losePoints === '' || isNaN(rules.losePoints) || rules.losePoints < 0) {
                        throw new Error('Điểm thua phải là số hợp lệ (lớn hơn hoặc bằng 0)');
                    }
                    // Sắp xếp rankingCriteria theo priority và chỉ lấy mảng các chuỗi criterion
                    const sortedCriteria = formData.rules.rankingCriteria
                        .filter(item => item.priority) // Lọc các tiêu chí có priority
                        .map(item => ({
                            criterion: item.criterion,
                            priority: parseInt(item.priority, 10),
                        }))
                        .sort((a, b) => a.priority - b.priority) // Sắp xếp theo priority tăng dần
                        .map(item => item.criterion); // Chỉ lấy criterion
                    rules.rankingCriteria = sortedCriteria;
                    if (!rules.rankingCriteria.length) {
                        throw new Error('Phải chọn ít nhất một tiêu chí xếp hạng và nhập mức độ ưu tiên');
                    }
                    // Validate priority
                    const priorities = formData.rules.rankingCriteria
                        .filter(item => item.priority)
                        .map(item => parseInt(item.priority, 10));
                    if (priorities.some(p => isNaN(p) || p < 1)) {
                        throw new Error('Mức độ ưu tiên phải là số hợp lệ (lớn hơn hoặc bằng 1)');
                    }
                    // Kiểm tra trùng lặp priority
                    const uniquePriorities = new Set(priorities);
                    if (uniquePriorities.size !== priorities.length) {
                        throw new Error('Mức độ ưu tiên không được trùng lặp');
                    }
                    break;
                default:
                    throw new Error('Vui lòng chọn tên quy định hợp lệ');
            }

            const data = {
                season_id: formData.season_id,
                regulation_name: formData.regulation_name,
                rules,
            };
            const headers = { Authorization: `Bearer ${token}` };
            let response;
            if (editingRegulation) {
                response = await axios.put(
                    `http://localhost:5000/api/regulations/${editingRegulation._id}`,
                    data,
                    { headers }
                );
                setRegulations((prev) =>
                    prev.map((regulation) =>
                        regulation._id === editingRegulation._id
                            ? { ...response.data.data, season_name: formData.season_name }
                            : regulation
                    )
                );
                setSuccessMessage('Sửa quy định thành công');
            } else {
                response = await axios.post('http://localhost:5000/api/regulations/', data, { headers });
                setRegulations((prev) => [...prev, { ...response.data.data, season_name: formData.season_name }]);
                setSuccessMessage('Thêm quy định thành công');
            }
            setTimeout(() => {
                setShowForm(false);
                setEditingRegulation(null);
                setSuccessMessage('');
                setError('');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Không thể lưu quy định');
        }
    };

    const renderFields = () => {
        switch (formData.regulation_name) {
            case 'Age Regulation':
                return (
                    <>
                        <div>
                            <label htmlFor="minAge" className="block text-lg font-medium text-gray-700 mb-2">
                                Tuổi tối thiểu
                            </label>
                            <input
                                id="minAge"
                                type="number"
                                value={formData.rules.minAge}
                                onChange={(e) => handleInputChange(e, 'minAge')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập tuổi tối thiểu (ví dụ: 18)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="maxAge" className="block text-lg font-medium text-gray-700 mb-2">
                                Tuổi tối đa
                            </label>
                            <input
                                id="maxAge"
                                type="number"
                                value={formData.rules.maxAge}
                                onChange={(e) => handleInputChange(e, 'maxAge')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập tuổi tối đa (ví dụ: 40)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="minPlayersPerTeam" className="block text-lg font-medium text-gray-700 mb-2">
                                Cầu thủ tối thiểu mỗi đội
                            </label>
                            <input
                                id="minPlayersPerTeam"
                                type="number"
                                value={formData.rules.minPlayersPerTeam}
                                onChange={(e) => handleInputChange(e, 'minPlayersPerTeam')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập số cầu thủ tối thiểu (ví dụ: 11)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="maxPlayersPerTeam" className="block text-lg font-medium text-gray-700 mb-2">
                                Cầu thủ tối đa mỗi đội
                            </label>
                            <input
                                id="maxPlayersPerTeam"
                                type="number"
                                value={formData.rules.maxPlayersPerTeam}
                                onChange={(e) => handleInputChange(e, 'maxPlayersPerTeam')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập số cầu thủ tối đa (ví dụ: 25)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="maxForeignPlayers" className="block text-lg font-medium text-gray-700 mb-2">
                                Ngoại binh tối đa
                            </label>
                            <input
                                id="maxForeignPlayers"
                                type="number"
                                value={formData.rules.maxForeignPlayers}
                                onChange={(e) => handleInputChange(e, 'maxForeignPlayers')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập số ngoại binh tối đa (ví dụ: 3)"
                                required
                            />
                        </div>
                    </>
                );
            case 'Match Rules':
                return (
                    <>
                        <div>
                            <label htmlFor="matchRounds" className="block text-lg font-medium text-gray-700 mb-2">
                                Số vòng đấu
                            </label>
                            <input
                                id="matchRounds"
                                type="number"
                                value={formData.rules.matchRounds}
                                onChange={(e) => handleInputChange(e, 'matchRounds')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập số vòng đấu (ví dụ: 2)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="homeTeamRule" className="block text-lg font-medium text-gray-700 mb-2">
                                Quy tắc đội nhà
                            </label>
                            <input
                                id="homeTeamRule"
                                type="text"
                                value={formData.rules.homeTeamRule}
                                onChange={(e) => handleInputChange(e, 'homeTeamRule')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập quy tắc đội nhà (ví dụ: Đội nhà cung cấp bóng)"
                                required
                            />
                        </div>
                    </>
                );
            case 'Goal Rules':
                return (
                    <>
                        <div>
                            <label htmlFor="goalTypes" className="block text-lg font-medium text-gray-700 mb-2">
                                Loại bàn thắng
                            </label>
                            <input
                                id="goalTypes"
                                type="text"
                                value={formData.rules.goalTypes}
                                onChange={(e) => handleInputChange(e, 'goalTypes')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập các loại bàn thắng, cách nhau bởi dấu phẩy (ví dụ: normal, penalty)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="minMinute" className="block text-lg font-medium text-gray-700 mb-2">
                                Phút tối thiểu (Giới hạn thời gian ghi bàn)
                            </label>
                            <input
                                id="minMinute"
                                type="number"
                                value={formData.rules.goalTimeLimit.minMinute}
                                onChange={(e) => handleInputChange(e, 'goalTimeLimit', 'minMinute')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập phút tối thiểu (ví dụ: 1)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="maxMinute" className="block text-lg font-medium text-gray-700 mb-2">
                                Phút tối đa (Giới hạn thời gian ghi bàn)
                            </label>
                            <input
                                id="maxMinute"
                                type="number"
                                value={formData.rules.goalTimeLimit.maxMinute}
                                onChange={(e) => handleInputChange(e, 'goalTimeLimit', 'maxMinute')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập phút tối đa (ví dụ: 90)"
                                required
                            />
                        </div>
                    </>
                );
            case 'Ranking Rules':
                return (
                    <>
                        <div>
                            <label htmlFor="winPoints" className="block text-lg font-medium text-gray-700 mb-2">
                                Điểm thắng
                            </label>
                            <input
                                id="winPoints"
                                type="number"
                                value={formData.rules.winPoints}
                                onChange={(e) => handleInputChange(e, 'winPoints')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập điểm thắng (ví dụ: 3)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="drawPoints" className="block text-lg font-medium text-gray-700 mb-2">
                                Điểm hòa
                            </label>
                            <input
                                id="drawPoints"
                                type="number"
                                value={formData.rules.drawPoints}
                                onChange={(e) => handleInputChange(e, 'drawPoints')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập điểm hòa (ví dụ: 1)"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="losePoints" className="block text-lg font-medium text-gray-700 mb-2">
                                Điểm thua
                            </label>
                            <input
                                id="losePoints"
                                type="number"
                                value={formData.rules.losePoints}
                                onChange={(e) => handleInputChange(e, 'losePoints')}
                                className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                placeholder="Nhập điểm thua (ví dụ: 0)"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-lg font-medium text-gray-700 mb-2">
                                Tiêu chí xếp hạng
                            </label>
                            {rankingCriteriaOptions.map(criterion => (
                                <div key={criterion} className="flex items-center space-x-3 mb-2">
                                    <input
                                        type="checkbox"
                                        id={`criterion-${criterion}`}
                                        checked={formData.rules.rankingCriteria.some(item => item.criterion === criterion)}
                                        onChange={(e) => handleRankingCriteriaChange(criterion, e.target.checked, '')}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`criterion-${criterion}`} className="text-lg text-gray-700 flex-1">
                                        {criterion}
                                    </label>
                                    {formData.rules.rankingCriteria.some(item => item.criterion === criterion) && (
                                        <input
                                            type="number"
                                            value={formData.rules.rankingCriteria.find(item => item.criterion === criterion)?.priority || ''}
                                            onChange={(e) => handlePriorityChange(criterion, e.target.value)}
                                            className="w-24 p-2 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            placeholder="Ưu tiên"
                                            required
                                            min="1"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                {editingRegulation ? 'Sửa quy định' : 'Thêm quy định'}
            </h2>
            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
            {successMessage && <p className="text-green-500 mb-4 text-center">{successMessage}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="season-select" className="block text-lg font-medium text-gray-700 mb-2">
                        Mùa giải
                    </label>
                    <select
                        id="season-select"
                        value={formData.season_id}
                        onChange={handleSeasonChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                        required
                    >
                        {seasons.length === 0 ? (
                            <option value="">Không có mùa giải</option>
                        ) : (
                            seasons.map((season) => (
                                <option key={season._id} value={season._id}>
                                    {season.season_name}
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <div>
                    <label htmlFor="regulation-name" className="block text-lg font-medium text-gray-700 mb-2">
                        Tên quy định
                    </label>
                    <select
                        id="regulation-name"
                        value={formData.regulation_name}
                        onChange={(e) => setFormData({ ...formData, regulation_name: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 shadow-sm"
                        required
                    >
                        <option value="">Chọn tên quy định</option>
                        <option value="Age Regulation">Age Regulation</option>
                        <option value="Match Rules">Match Rules</option>
                        <option value="Goal Rules">Goal Rules</option>
                        <option value="Ranking Rules">Ranking Rules</option>
                    </select>
                </div>
                {formData.regulation_name && renderFields()}
                <div className="flex justify-center space-x-4">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition shadow-md"
                    >
                        Lưu
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false);
                            setEditingRegulation(null);
                            setError('');
                            setSuccessMessage('');
                        }}
                        className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition shadow-md"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegulationForm;