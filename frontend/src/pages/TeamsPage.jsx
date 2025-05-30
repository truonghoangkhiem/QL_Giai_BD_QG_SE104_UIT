import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Teams from '../components/Teams';
import TeamForm from '../components/TeamForm';

const TeamsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teams, setTeams] = useState([]); // This state seems unused if Teams component fetches its own data
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');

    // Lấy danh sách mùa giải khi component mount
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(response.data.data);
                // Chọn mùa giải đầu tiên làm mặc định (nếu có)
                if (response.data.data.length > 0) {
                    setSelectedSeason(response.data.data[0]._id);
                }
            } catch (err) {
                console.error('Không thể tải danh sách mùa giải', err);
            }
        };
        fetchSeasons();
    }, []);

    return (
        <div className="bg-white min-h-screen"> {/* Ensures the entire page has a white base if content is short */}
            <div className="container mx-auto p-4">
                {showForm ? (
                    <TeamForm
                        editingTeam={editingTeam}
                        setEditingTeam={setEditingTeam}
                        setShowForm={setShowForm}
                        // setTeams prop might need review based on actual data flow,
                        // typically a callback like onTeamAddedOrUpdated is used.
                        setTeams={setTeams}
                        token={token}
                        seasons={seasons}
                    />
                ) : (
                    <>
                        {/* Blue Header Section */}
                        <div className="bg-sky-500 text-black p-6 rounded-lg shadow-md mb-6">
                            <div className="flex justify-between items-center mb-4">
                                {token && (
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                                    >
                                        Thêm đội bóng
                                    </button>
                                )}
                                <div>
                                    <label htmlFor="seasonSelect" className="mr-2 font-semibold">Chọn mùa giải:</label>
                                    <select
                                        id="seasonSelect"
                                        value={selectedSeason}
                                        onChange={(e) => setSelectedSeason(e.target.value)}
                                        className="p-2 border rounded text-gray-900" // Text color for select options
                                    >
                                        {seasons.map((season) => (
                                            <option key={season._id} value={season._id}>
                                                {season.season_name || season._id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-left tracking-wide">
                                Danh sách đội bóng
                            </h2>
                        </div>

                        {/* Content Section (Teams list will have its own white background) */}
                        <Teams
                            setEditingTeam={setEditingTeam}
                            setShowForm={setShowForm}
                            token={token}
                            selectedSeason={selectedSeason}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TeamsPage;