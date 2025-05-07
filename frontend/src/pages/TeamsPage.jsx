import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Teams from '../components/Teams';
import TeamForm from '../components/TeamForm';

const TeamsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teams, setTeams] = useState([]);
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
        <div className="bg-gray-100">
            <div className="container mx-auto p-4">
                {showForm ? (
                    <TeamForm
                        editingTeam={editingTeam}
                        setEditingTeam={setEditingTeam}
                        setShowForm={setShowForm}
                        setTeams={setTeams}
                        token={token}
                        seasons={seasons} // Truyền danh sách mùa giải
                    />
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            {token && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-blue-600 text-white p-2 rounded"
                                >
                                    Thêm đội bóng
                                </button>
                            )}
                            <div>
                                <label htmlFor="seasonSelect" className="mr-2">Chọn mùa giải:</label>
                                <select
                                    id="seasonSelect"
                                    value={selectedSeason}
                                    onChange={(e) => setSelectedSeason(e.target.value)}
                                    className="p-2 border rounded"
                                >
                                    {seasons.map((season) => (
                                        <option key={season._id} value={season._id}>
                                            {season.season_name || season._id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Teams
                            setEditingTeam={setEditingTeam}
                            setShowForm={setShowForm}
                            token={token}
                            selectedSeason={selectedSeason} // Truyền mùa giải được chọn
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TeamsPage;