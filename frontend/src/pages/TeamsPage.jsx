import React, { useState } from 'react';
import Teams from '../components/Teams';
import TeamForm from '../components/TeamForm';

const TeamsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teams, setTeams] = useState([]);

    return (
        <div className="bg-gray-100">
            <div className=" container mx-auto p-4">
                {showForm ? (
                    <TeamForm
                        editingTeam={editingTeam}
                        setEditingTeam={setEditingTeam}
                        setShowForm={setShowForm}
                        setTeams={setTeams}
                        token={token} // Truyền token để TeamForm kiểm tra quyền
                    />
                ) : (
                    <>
                        {token ? (
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-blue-600 text-white p-2 rounded mb-4"
                            >
                                Thêm đội bóng
                            </button>
                        ) : (
                            <p className="text-gray-500 mb-4"></p>
                        )}
                        <Teams
                            setEditingTeam={setEditingTeam}
                            setShowForm={setShowForm}
                            token={token} // Truyền token để Teams kiểm tra quyền
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TeamsPage;