import React, { useState } from 'react';
import Players from '../components/Players';
import PlayerForm from '../components/PlayerForm';

const PlayersPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [players, setPlayers] = useState([]); // Quản lý danh sách cầu thủ ở đây
    const [success, setSuccess] = useState('');
    const [error, setError] = useState(''); // Thêm state cho lỗi

    // Hàm để xử lý thành công và hiển thị thông báo
    const handleSuccess = (message) => {
        setSuccess(message);
        setTimeout(() => setSuccess(''), 4000); // Ẩn thông báo sau 4 giây
    };

    // Hàm xử lý khi form được submit thành công
    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingPlayer(null);
        // Không cần tải lại players ở đây vì Player.jsx sẽ tự quản lý
        // Có thể thêm logic tải lại nếu cần
        handleSuccess(editingPlayer ? 'Cập nhật cầu thủ thành công!' : 'Thêm cầu thủ và các bản ghi liên quan thành công!');
    };
    
    // Hàm xử lý khi click nút "Thêm cầu thủ"
    const handleAddPlayerClick = () => {
        setEditingPlayer(null); // Đảm bảo không có dữ liệu cũ
        setShowForm(true);
        setError(''); // Xóa lỗi cũ
        setSuccess(''); // Xóa thông báo thành công cũ
    };

    return (
        <div className="min-h-screen font-sans">
            <div className="container mx-auto p-4">
                {success && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md shadow-md" role="alert">
                        <p className="font-bold">Thành công</p>
                        <p>{success}</p>
                    </div>
                )}
                 {error && !showForm && ( // Chỉ hiển thị lỗi của trang chính khi không ở trong form
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
                        setPlayers={setPlayers} // Truyền hàm setPlayers xuống
                        token={token}
                        onSuccess={handleFormSuccess} // Sử dụng handleFormSuccess
                    />
                ) : (
                    <>
                        {token && (
                            <button
                                onClick={handleAddPlayerClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 mb-6"
                            >
                                Thêm cầu thủ
                            </button>
                        )}
                        <Players
                            setEditingPlayer={setEditingPlayer}
                            setShowForm={setShowForm}
                            setPlayers={setPlayers} // Truyền setPlayers
                            players={players}       // Truyền players
                            token={token}
                            setError={setError}     // Truyền hàm setError
                            handleSuccess={handleSuccess} // Truyền hàm handleSuccess
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayersPage;