import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Teams from '../components/Teams';
import TeamForm from '../components/TeamForm';

const TeamsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [refreshKey, setRefreshKey] = useState(0); // State để trigger tải lại
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');

    // Hàm hiển thị thông báo
    const showMessage = (setter, message) => {
        setter(message);
        setTimeout(() => setter(''), 4000); // Ẩn sau 4 giây
    };

    // Tải danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                const activeSeasons = response.data.data.filter(s => s.status === true);
                setSeasons(activeSeasons);
                if (activeSeasons.length > 0) {
                    setSelectedSeason(activeSeasons[0]._id);
                }
            } catch (err) {
                console.error('Không thể tải danh sách mùa giải', err);
                showMessage(setPageError, 'Không thể tải danh sách mùa giải.');
            }
        };
        fetchSeasons();
    }, []);

    // Xử lý khi form được submit thành công
    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingTeam(null);
        showMessage(setPageSuccess, editingTeam ? 'Cập nhật đội bóng thành công!' : 'Thêm đội bóng thành công!');
        setRefreshKey(prevKey => prevKey + 1); // Trigger tải lại danh sách trong Teams.jsx
    };

    // Xử lý khi click nút "Sửa"
    const handleEditClick = (team) => {
        setEditingTeam(team);
        setShowForm(true);
        setPageError('');
        setPageSuccess('');
    };

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-4">
                {pageSuccess && (
                     <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md shadow-md" role="alert">
                        <p>{pageSuccess}</p>
                    </div>
                )}
                {pageError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md shadow-md" role="alert">
                        <p>{pageError}</p>
                    </div>
                )}

                {showForm ? (
                    <TeamForm
                        editingTeam={editingTeam}
                        setEditingTeam={setEditingTeam}
                        setShowForm={setShowForm}
                        onSuccess={handleFormSuccess}
                        token={token}
                        seasons={seasons}
                    />
                ) : (
                    <div className="bg-white/90 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm">
                        <div className="text-white pt-5 px-5 py-10 rounded-t-lg shadow-md mb-6" style={{ backgroundImage: 'url(https://i.pinimg.com/736x/e7/b2/85/e7b2855a88a7e8ccd29a30a43333e6af.jpg)' }}>
                            <h2 className="text-3xl font-bold text-left tracking-wide mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                                Danh sách đội bóng
                            </h2>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="w-full sm:w-auto">
                                    <label htmlFor="seasonSelect" className="mr-2 font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
                                        Chọn mùa giải:
                                    </label>
                                    <select
                                        id="seasonSelect"
                                        value={selectedSeason}
                                        onChange={(e) => setSelectedSeason(e.target.value)}
                                        className="p-2 border rounded text-gray-900 w-full sm:w-auto"
                                    >
                                        {seasons.map((season) => (
                                            <option key={season._id} value={season._id}>
                                                {season.season_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {token && (
                                    <button
                                        onClick={() => { setEditingTeam(null); setShowForm(true); setPageError(''); setPageSuccess(''); }}
                                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 w-full sm:w-auto"
                                    >
                                        Thêm đội bóng
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 md:p-6">
                             <Teams
                                onEdit={handleEditClick}
                                token={token}
                                selectedSeason={selectedSeason}
                                refreshKey={refreshKey} // Prop để trigger tải lại
                                setPageError={setPageError}
                                setPageSuccess={showMessage.bind(null, setPageSuccess)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamsPage;