import React, { useState } from 'react';
import Seasons from '../components/Seasons';
import SeasonForm from '../components/SeasonForm';

const SeasonsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingSeason, setEditingSeason] = useState(null);
    const [seasons, setSeasons] = useState([]);

    return (
        <div className="container mx-auto p-4">
            {showForm ? (
                <SeasonForm
                    editingSeason={editingSeason}
                    setEditingSeason={setEditingSeason}
                    setShowForm={setShowForm}
                    setSeasons={setSeasons}
                    token={token} // Truyền token để SeasonForm kiểm tra quyền
                />
            ) : (
                <>
                    {token ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-blue-600 text-white p-2 rounded mb-4"
                        >
                            Thêm mùa giải
                        </button>
                    ) : (
                        <p className="text-gray-500 mb-4"></p>
                    )}
                    <Seasons
                        setEditingSeason={setEditingSeason}
                        setShowForm={setShowForm}
                        token={token} // Truyền token để Seasons kiểm tra quyền
                    />
                </>
            )}
        </div>
    );
};

export default SeasonsPage;