import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Players from '../components/Players';
import PlayerForm from '../components/PlayerForm';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const PlayersPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]); // Chứa tất cả cầu thủ của mùa giải
    const [filteredPlayers, setFilteredPlayers] = useState([]); // Chứa cầu thủ đã lọc để hiển thị
    const [searchTerm, setSearchTerm] = useState(''); // State cho ô tìm kiếm
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(() => localStorage.getItem('selectedSeasonId') || '');
    const [loading, setLoading] = useState(true);

    // Hàm để xử lý thành công và hiển thị thông báo
    const handleSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000);
    };

    // Hàm xử lý khi form được submit thành công
    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingPlayer(null);
        handleSuccess(editingPlayer ? 'Cập nhật cầu thủ thành công!' : 'Thêm cầu thủ và các bản ghi liên quan thành công!');
        // Tải lại dữ liệu sau khi submit thành công
        fetchPlayersForSeason(selectedSeason);
    };

    // Hàm xử lý khi click nút "Thêm cầu thủ"
    const handleAddPlayerClick = () => {
        setEditingPlayer(null);
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    // Tải danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                const seasonsData = response.data.data || [];
                setSeasons(seasonsData);
                if (seasonsData.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasonsData[0]._id);
                }
            } catch (err) {
                setError('Không thể tải danh sách mùa giải.');
            }
        };
        fetchSeasons();
    }, []);

    // Hàm tải danh sách cầu thủ cho một mùa giải cụ thể
    const fetchPlayersForSeason = async (seasonId) => {
        if (!seasonId) {
            setLoading(false);
            setAllPlayers([]);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const teamsResponse = await axios.get(`http://localhost:5000/api/teams/seasons/${seasonId}`);
            const teamsInSeason = teamsResponse.data.data || [];
            const teamIds = new Set(teamsInSeason.map(t => t._id));

            const allPlayersResponse = await axios.get(`http://localhost:5000/api/players`);
            const fetchedPlayers = allPlayersResponse.data.data || [];
            
            const playersForSeason = fetchedPlayers.filter(p => teamIds.has(p.team_id?._id || p.team_id));
            setAllPlayers(playersForSeason);
        } catch (err) {
            setError('Không thể tải danh sách cầu thủ cho mùa giải này.');
            setAllPlayers([]);
        } finally {
            setLoading(false);
        }
    };

    // Tải cầu thủ khi mùa giải thay đổi
    useEffect(() => {
        fetchPlayersForSeason(selectedSeason);
    }, [selectedSeason]);

    // Lọc cầu thủ khi searchTerm hoặc danh sách cầu thủ gốc thay đổi
    useEffect(() => {
        if (!searchTerm) {
            setFilteredPlayers(allPlayers);
        } else {
            const lowercasedFilter = searchTerm.toLowerCase();
            const filteredData = allPlayers.filter(player =>
                player.name.toLowerCase().includes(lowercasedFilter)
            );
            setFilteredPlayers(filteredData);
        }
    }, [searchTerm, allPlayers]);

    return (
        <div className="min-h-screen font-sans">
            <div className="container mx-auto p-4">
                {success && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md shadow-md" role="alert">
                        <p className="font-bold">Thành công</p>
                        <p>{success}</p>
                    </div>
                )}
                 {error && !showForm && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md shadow-md" role="alert">
                        <p className="font-bold">Lỗi</p>
                        <p>{error}</p>
                    </div>
                )}
                {showForm ? (
                    <PlayerForm
                        editingPlayer={editingPlayer}
                        setEditingPlayer={setEditingPlayer}
                        setShowForm={setShowForm}
                        token={token}
                        onSuccess={handleFormSuccess}
                    />
                ) : (
                    <>
                        <div className="relative mb-8 shadow-lg rounded-lg overflow-hidden">
                            <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url('https://cdn.pixabay.com/photo/2023/04/01/22/10/goalkeeper-7893178_1280.jpg')`, filter: 'brightness(0.7)' }}></div>
                            <div className="absolute inset-0 bg-black opacity-60 z-10"></div>
                            <div className="relative z-20 p-6">
                                <h2 className="text-white text-3xl font-bold py-3 text-left mb-4" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                                    Danh sách cầu thủ
                                </h2>
                                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                    {/* Season Filter */}
                                    <div>
                                        <label htmlFor="season-select" className="block text-sm font-medium text-gray-200 mb-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                                            Chọn mùa giải:
                                        </label>
                                        <select
                                            id="season-select"
                                            value={selectedSeason}
                                            onChange={(e) => setSelectedSeason(e.target.value)}
                                            className="w-full md:w-auto border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            <option value="">-- Chọn mùa giải --</option>
                                            {seasons.map((season) => (
                                                <option key={season._id} value={season._id}>
                                                    {season.season_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Search Input */}
                                    <div className="relative w-full md:w-1/3">
                                        <label htmlFor="player-search" className="block text-sm font-medium text-gray-200 mb-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                                            Tìm cầu thủ:
                                        </label>
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 mt-3" />
                                        <input
                                            id="player-search"
                                            type="text"
                                            placeholder="Nhập tên cầu thủ..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>

                                     {token && (
                                        <button
                                            onClick={handleAddPlayerClick}
                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                                        >
                                            Thêm cầu thủ
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Players
                            setEditingPlayer={setEditingPlayer}
                            setShowForm={setShowForm}
                            players={filteredPlayers} // Truyền danh sách đã lọc
                            token={token}
                            setError={setError}
                            handleSuccess={handleSuccess}
                            loading={loading} // Truyền trạng thái loading
                            setAllPlayers={setAllPlayers} // Truyền hàm để cập nhật lại danh sách gốc
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayersPage;