import React, { useState } from 'react';
import Players from '../components/Players';
import PlayerForm from '../components/PlayerForm';

const PlayersPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [players, setPlayers] = useState([]);
    const [success, setSuccess] = useState('');

    const handleSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <div className="container mx-auto p-4">
                {success && <p className="text-green-500 text-center mb-4">{success}</p>}
                {showForm ? (
                    <PlayerForm
                        editingPlayer={editingPlayer}
                        setEditingPlayer={setEditingPlayer}
                        setShowForm={setShowForm}
                        setPlayers={setPlayers}
                        token={token}
                        onSuccess={handleSuccess}
                    />
                ) : (
                    <>
                        {token ? (
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-blue-600 text-white p-2 rounded mb-4"
                            >
                                Thêm cầu thủ
                            </button>
                        ) : (
                            <p className="text-gray-500 mb-4"></p>
                        )}
                        <Players
                            setEditingPlayer={setEditingPlayer}
                            setShowForm={setShowForm}
                            setPlayers={setPlayers}
                            players={players}
                            token={token}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayersPage;