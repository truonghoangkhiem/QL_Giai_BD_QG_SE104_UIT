import React, { useState, useEffect } from 'react';
import axios from 'axios';
// TeamForm import is not used in this component based on the provided code.
// import TeamForm from './TeamForm';

const Teams = ({ setEditingTeam, setShowForm, token, selectedSeason }) => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTeams = async () => {
            if (!selectedSeason) {
                setTeams([]);
                setError('Vui lòng chọn một mùa giải');
                setLoading(false);
                return;
            }
            try {
                setLoading(true); // Set loading to true when fetching starts for a new season
                const response = await axios.get(`http://localhost:5000/api/teams/seasons/${selectedSeason}`);
                setTeams(response.data.data || []);
                setError('');
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể tải danh sách đội bóng');
                setTeams([]);
                setLoading(false);
            }
        };
        fetchTeams();
    }, [selectedSeason]);

    const handleEdit = (team) => {
        setEditingTeam(team);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/teams/${id}`);
            setTeams(teams.filter((team) => team._id !== id));
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể xóa đội bóng');
        }
    };

    if (loading) return <p className="text-center text-gray-500 py-10">Đang tải...</p>;
    if (error && !teams.length) return <p className="text-red-500 text-center py-10">{error}</p>; // Show error more prominently if no teams

    return (
        // Changed background to white and removed container/mx-auto as parent handles it. Kept p-4 for internal padding.
        <div className="bg-white p-4 rounded-lg shadow-md">
            {/* The H2 title has been moved to TeamsPage.jsx */}

            {error && teams.length > 0 && <p className="text-red-500 text-center mb-4">{error}</p>} {/* Show error above list if teams are also shown */}

            {teams.length === 0 && !loading && !error ? ( // Added !loading and !error condition for clarity
                <p className="text-gray-500 text-center py-10">Không có đội bóng nào cho mùa giải đã chọn.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teams.map((team) => (
                        <div
                            key={team._id}
                            className="bg-gray-50 border rounded-lg shadow-md p-4 flex flex-col items-center transform transition-transform duration-200 hover:scale-105 hover:shadow-lg" // Slightly different bg for cards
                        >
                            <img
                                src={team.logo}
                                alt={`${team.team_name} logo`}
                                className="w-24 h-24 object-contain mb-4"
                                onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain')}
                            />
                            <h3 className="text-lg font-semibold text-center text-gray-800">{team.team_name}</h3>
                            <p className="text-gray-600 text-center">Sân: {team.stadium}</p>
                            <p className="text-gray-600 text-center">HLV: {team.coach}</p>
                            {token && setEditingTeam && setShowForm && (
                                <div className="mt-4 flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(team)}
                                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors duration-200"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(team._id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors duration-200"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Teams;