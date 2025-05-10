import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TeamForm from './TeamForm';

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
                const response = await axios.get(`http://localhost:5000/api/teams/seasons/${selectedSeason}`);
                setTeams(response.data.data || []); // Đảm bảo luôn là mảng
                setError(''); // Xóa lỗi nếu thành công
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

    if (loading) return <p className="text-center text-gray-500">Đang tải...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;

    return (
        <div className="bg-white container mx-auto p-4">
            <h2 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                Danh sách đội bóng
            </h2>
            {teams.length === 0 && !error ? (
                <p className="text-gray-500 text-center">Không có đội bóng nào.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teams.map((team) => (
                        <div
                            key={team._id}
                            className="bg-white border rounded-lg shadow-md p-4 flex flex-col items-center transform transition-transform duration-200 hover:scale-105 hover:shadow-lg"
                        >
                            <img
                                src={team.logo}
                                alt={`${team.team_name} logo`}
                                className="w-24 h-24 object-contain mb-4"
                                onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain')}
                            />
                            <h3 className="text-lg font-semibold text-center">{team.team_name}</h3>
                            <p className="text-gray-600 text-center">Sân: {team.stadium}</p>
                            <p className="text-gray-600 text-center">HLV: {team.coach}</p>
                            {token && setEditingTeam && setShowForm && (
                                <div className="mt-4 flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(team)}
                                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(team._id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
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