import React, { useState } from 'react';
import Players from '../components/Players';
import PlayerForm from '../components/PlayerForm';

const PlayersPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); // State để trigger làm mới danh sách
    const [success, setSuccess] = useState('');

    const handleSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
        setRefreshKey((prev) => prev + 1); // Trigger làm mới danh sách
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
                        token={token}
                        onSuccess={handleSuccess} // Truyền callback để thông báo thành công
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
                            key={refreshKey} // Sử dụng key để trigger re-render và làm mới dữ liệu
                            setEditingPlayer={setEditingPlayer}
                            setShowForm={setShowForm}
                            token={token}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayersPage;