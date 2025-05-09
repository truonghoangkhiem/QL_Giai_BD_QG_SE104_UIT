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
            rankingCriteria: [
                { criterion: 'points', priority: '' },
                { criterion: 'goalDifference', priority: '' },
                { criterion: 'goalsFor', priority: '' },
                { criterion: 'headToHead', priority: '' },
            ],
        },
    });
    const [seasons, setSeasons] = useState([]);
    const [existingRegulations, setExistingRegulations] = useState([]);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const rankingCriteriaOptions = ['points', 'goalDifference', 'goalsFor', 'headToHead'];

    useEffect(() => {
        const fetchSeasonsAndRegulations = async () => {
            try {
                const [seasonsResponse, regulationsResponse] = await Promise.all([
                    axios.get('http://localhost:5000/api/seasons'),
                    axios.get('http://localhost:5000/api/regulations'),
                ]);
                setSeasons(seasonsResponse.data.data);
                setExistingRegulations(regulationsResponse.data.data);
                if (!editingRegulation && seasonsResponse.data.data.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        season_id: seasonsResponse.data.data[0]._id,
                        season_name: seasonsResponse.data.data[0].season_name,
                    }));
                }
            } catch (err) {
                setError('Không thể tải dữ liệu mùa giải hoặc quy định');
            }
        };
        fetchSeasonsAndRegulations();
    }, [editingRegulation]);

    useEffect(() => {
        if (editingRegulation) {
            const rules = editingRegulation.rules || {};
            const rankingCriteria = rankingCriteriaOptions.map((criterion) => {
                const priority = rules.rankingCriteria?.indexOf(criterion) + 1;
                return {
                    criterion,
                    priority: priority > 0 ? priority.toString() : '',
                };
            });
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
                    rankingCriteria,
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

    const handlePriorityChange = (criterion, priority) => {
        const newCriteria = formData.rules.rankingCriteria.map((item) => {
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
        setError('');
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
                    if (Object.values(rules).some((val) => isNaN(val) || val <= 0)) {
                        throw new Error('Vui lòng nhập số hợp lệ (lớn hơn 0) cho tất cả các trường');
                    }
                    if (rules.minAge >= rules.maxAge) {
                        throw new Error('Tuổi tối thiểu phải nhỏ hơn tuổi tối đa');
                    }
                    if (rules.minPlayersPerTeam > rules.maxPlayersPerTeam) {
                        throw new Error('Số cầu thủ tối thiểu phải nhỏ hơn hoặc bằng số cầu thủ tối đa');
                    }
                    break;
                case 'Match Rules':
                    rules = {
                        matchRounds: parseInt(formData.rules.matchRounds, 10),
                        homeTeamRule: formData.rules.homeTeamRule,
                    };
                    if (isNaN(rules.matchRounds) || rules.matchRounds <= 0) {
                        throw new Error('Số vòng đấu phải là số hợp lệ (lớn hơn 0)');
                    }
                    if (!rules.homeTeamRule) {
                        throw new Error('Quy tắc đội nhà không được để trống');
                    }
                    break;
                case 'Goal Rules':
                    rules = {
                        goalTypes: formData.rules.goalTypes.split(',').map((item) => item.trim()).filter((item) => item),
                        goalTimeLimit: {
                            minMinute: parseInt(formData.rules.goalTimeLimit.minMinute, 10),
                            maxMinute: parseInt(formData.rules.goalTimeLimit.maxMinute, 10),
                        },
                    };
                    if (!rules.goalTypes.length) {
                        throw new Error('Loại bàn thắng không được để trống');
                    }
                    if (
                        isNaN(rules.goalTimeLimit.minMinute) ||
                        isNaN(rules.goalTimeLimit.maxMinute) ||
                        rules.goalTimeLimit.minMinute <= 0 ||
                        rules.goalTimeLimit.maxMinute <= 0
                    ) {
                        throw new Error('Giới hạn thời gian phải là số hợp lệ (lớn hơn 0)');
                    }
                    break;
                case 'Ranking Rules':
                    rules = {
                        winPoints: parseInt(formData.rules.winPoints, 10),
                        drawPoints: parseInt(formData.rules.drawPoints, 10),
                        losePoints: parseInt(formData.rules.losePoints, 10),
                        rankingCriteria: [],
                    };
                    if (isNaN(rules.winPoints) || rules.winPoints <= 0) {
                        throw new Error('Điểm thắng phải là số hợp lệ (lớn hơn 0)');
                    }
                    if (isNaN(rules.drawPoints) || rules.drawPoints <= 0) {
                        throw new Error('Điểm hòa phải là số hợp lệ (lớn hơn 0)');
                    }
                    if (isNaN(rules.losePoints) || rules.losePoints < 0) {
                        throw new Error('Điểm thua phải là số hợp lệ (lớn hơn hoặc bằng 0)');
                    }
                    if (rules.winPoints <= rules.drawPoints || rules.drawPoints <= rules.losePoints) {
                        throw new Error('Điểm thắng phải lớn hơn điểm hòa, điểm hòa phải lớn hơn điểm thua');
                    }
                    const sortedCriteria = formData.rules.rankingCriteria
                        .filter((item) => item.priority)
                        .map((item) => ({
                            criterion: item.criterion,
                            priority: parseInt(item.priority, 10),
                        }))
                        .sort((a, b) => a.priority - b.priority)
                        .map((item) => item.criterion);
                    rules.rankingCriteria = sortedCriteria;
                    if (rules.rankingCriteria.length !== 4) {
                        throw new Error('Phải chọn mức độ ưu tiên cho tất cả bốn tiêu chí xếp hạng');
                    }
                    const priorities = formData.rules.rankingCriteria
                        .filter((item) => item.priority)
                        .map((item) => parseInt(item.priority, 10));
                    if (priorities.some((p) => isNaN(p) || p < 1 || p > 4)) {
                        throw new Error('Mức độ ưu tiên phải là số từ 1 đến 4');
                    }
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
            console.log('Data sent to backend:', data);
            const headers = { Authorization: `Bearer ${token}` };
            let response;
            if (editingRegulation) {
                response = await axios.put(
                    `http://localhost:5000/api/regulations/${editingRegulation._id}`,
                    { rules },
                    { headers }
                );
                setRegulations((prev) =>
                    prev.map((regulation) =>
                        regulation._id === editingRegulation._id
                            ? { ...regulation, rules: response.data.data?.rules || rules }
                            : regulation
                    )
                );
                setSuccessMessage('Sửa quy định thành công');
            } else {
                response = await axios.post('http://localhost:5000/api/regulations/', data, { headers });
                setRegulations((prev) => [
                    ...prev,
                    { ...response.data.data, season_name: formData.season_name },
                ]);
                setSuccessMessage('Thêm quy định thành công');
            }
            setTimeout(() => {
                setShowForm(false);
                setEditingRegulation(null);
                setSuccessMessage('');
                setError('');
            }, 3000);
        } catch (err) {
            console.error('Error details:', err.response?.data);
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formData.rules.minAge}
                                onChange={(e) => handleInputChange(e, 'minAge')}
                                onKeyDown={(e) => {
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                                    if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formData.rules.maxAge}
                                onChange={(e) => handleInputChange(e, 'maxAge')}
                                onKeyDown={(e) => {
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                                    if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                min="1"
                                value={formData.rules.minPlayersPerTeam}
                                onChange={(e) => handleInputChange(e, 'minPlayersPerTeam')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                min="1"
                                value={formData.rules.maxPlayersPerTeam}
                                onChange={(e) => handleInputChange(e, 'maxPlayersPerTeam')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                min="1"
                                value={formData.rules.maxForeignPlayers}
                                onChange={(e) => handleInputChange(e, 'maxForeignPlayers')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                min="1"
                                value={formData.rules.matchRounds}
                                onChange={(e) => handleInputChange(e, 'matchRounds')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                min="1"
                                value={formData.rules.goalTimeLimit.minMinute}
                                onChange={(e) => handleInputChange(e, 'goalTimeLimit', 'minMinute')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                min="1"
                                value={formData.rules.goalTimeLimit.maxMinute}
                                onChange={(e) => handleInputChange(e, 'goalTimeLimit', 'maxMinute')}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formData.rules.winPoints}
                                onChange={(e) => handleInputChange(e, 'winPoints')}
                                onKeyDown={(e) => {
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                                    if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formData.rules.drawPoints}
                                onChange={(e) => handleInputChange(e, 'drawPoints')}
                                onKeyDown={(e) => {
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                                    if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formData.rules.losePoints}
                                onChange={(e) => handleInputChange(e, 'losePoints')}
                                onKeyDown={(e) => {
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                                    if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                placeholder="Nhập điểm thua (ví dụ: 0)"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-lg font-medium text-gray-700 mb-2">
                                Tiêu chí xếp hạng
                            </label>
                            {formData.rules.rankingCriteria.map((item) => (
                                <div key={item.criterion} className="flex items-center space-x-3 mb-4">
                                    <label className="text-lg text-gray-700 flex-1">{item.criterion}</label>
                                    <select
                                        value={item.priority}
                                        onChange={(e) => handlePriorityChange(item.criterion, e.target.value)}
                                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                        required
                                    >
                                        <option value="">Chọn</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                    </select>
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
        <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                {editingRegulation ? 'Sửa quy định' : 'Thêm quy định'}
            </h2>
            {error && (
                <p className="text-red-500 mb-4 text-center font-medium">{error}</p>
            )}
            {successMessage && (
                <p className="text-green-500 mb-4 text-center font-medium">{successMessage}</p>
            )}
            {!editingRegulation && existingRegulations.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Quy định hiện có</h3>
                    <ul className="list-disc pl-5 text-gray-600">
                        {existingRegulations
                            .filter((reg) => reg.season_id === formData.season_id)
                            .map((reg) => (
                                <li key={reg._id} className="text-base">{reg.regulation_name}</li>
                            ))}
                    </ul>
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="season-select" className="block text-lg font-medium text-gray-700 mb-2">
                        Mùa giải
                    </label>
                    <select
                        id="season-select"
                        value={formData.season_id}
                        onChange={handleSeasonChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-shadow shadow-md"
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
                        className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-shadow shadow-md"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegulationForm;