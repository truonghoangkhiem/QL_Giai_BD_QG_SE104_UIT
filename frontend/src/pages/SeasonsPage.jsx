import React, { useState } from 'react';
import Seasons from '../components/Seasons'; // Component này sẽ hiển thị danh sách
import SeasonForm from '../components/SeasonForm'; // Component này là form

const SeasonsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingSeason, setEditingSeason] = useState(null);
    // State 'seasons' được quản lý bên trong component Seasons, không cần ở đây trừ khi SeasonsPage cũng cần trực tiếp dùng nó.
    // Nếu Seasons component tự fetch và quản lý list của nó, thì SeasonsPage chỉ cần quản lý việc hiển thị form.

    return (
        // Bỏ padding ở đây vì đã có ở App.jsx <main>
        <div>
            {showForm ? (
                <SeasonForm
                    editingSeason={editingSeason}
                    setEditingSeason={setEditingSeason}
                    setShowForm={setShowForm}
                    // setSeasons prop có thể không cần nếu Seasons component tự fetch lại list sau khi form submit
                    token={token}
                />
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-heading font-bold text-gray-800">Quản lý Mùa Giải</h1>
                        {token && (
                            <button
                                onClick={() => { setEditingSeason(null); setShowForm(true); }} // Reset editingSeason khi thêm mới
                                className="bg-theme-red hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                            >
                                Thêm mùa giải
                            </button>
                        )}
                    </div>
                    {/* Component Seasons sẽ chịu trách nhiệm fetch và hiển thị danh sách mùa giải */}
                    <Seasons
                        setEditingSeason={setEditingSeason}
                        setShowForm={setShowForm}
                        token={token}
                    />
                </>
            )}
        </div>
    );
};

export default SeasonsPage;