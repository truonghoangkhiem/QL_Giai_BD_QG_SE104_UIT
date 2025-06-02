import React, { useState } from 'react';
import Seasons from '../components/Seasons'; // Component này sẽ hiển thị danh sách
import SeasonForm from '../components/SeasonForm'; // Component này là form

const SeasonsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingSeason, setEditingSeason] = useState(null);

    return (
        <div>
            {showForm ? (
                <SeasonForm
                    editingSeason={editingSeason}
                    setEditingSeason={setEditingSeason}
                    setShowForm={setShowForm}
                    token={token}
                />
            ) : (
                // -- NEW CONTAINER WRAPPER --
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                    {/* Phần tiêu đề và nút "Thêm mùa giải" */}
                    <div className="flex justify-between items-center px-7 py-7" // Bỏ mb-6 ở đây
                        style={{
                            backgroundImage: `url('https://i.pinimg.com/736x/4d/39/eb/4d39eb4cfbea4eaf05f6a98e9bf85dbc.jpg')`,
                            // Nếu muốn header này có bo góc trên thì thêm:
                            // borderTopLeftRadius: '0.5rem', // tương ứng rounded-lg
                            // borderTopRightRadius: '0.5rem',
                        }}>
                        <h1 className="text-3xl text-center font-heading font-bold text-white">Quản lý Mùa Giải</h1> {/* */}
                        {token && (
                            <button
                                onClick={() => { setEditingSeason(null); setShowForm(true); }}
                                className="bg-theme-red hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
                            >
                                Thêm mùa giải
                            </button>
                        )}
                    </div>

                    {/* Component Seasons sẽ hiển thị danh sách mùa giải bên trong container mới này */}
                    <div className="p-4 md:p-6"> {/* Thêm padding cho nội dung bảng nếu cần */}
                        <Seasons
                            setEditingSeason={setEditingSeason}
                            setShowForm={setShowForm}
                            token={token}
                        />
                    </div>
                </div>
                // -- END OF NEW CONTAINER WRAPPER --
            )}
        </div>
    );
};

export default SeasonsPage;