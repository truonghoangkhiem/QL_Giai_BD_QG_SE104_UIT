import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Teams = ({ onEdit, token, selectedSeason, refreshKey, setPageError, setPageSuccess }) => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null); // ID của đội đang được xóa

    useEffect(() => {
        const fetchTeams = async () => {
            if (!selectedSeason) {
                setTeams([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            setPageError(''); // Xóa lỗi cũ khi tải lại
            try {
                const response = await axios.get(`http://localhost:5000/api/teams/seasons/${selectedSeason}`);
                setTeams(response.data.data || []);
            } catch (err) {
                setPageError(err.response?.data?.message || 'Không thể tải danh sách đội bóng.');
                setTeams([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, [selectedSeason, refreshKey, setPageError]); // Thêm refreshKey vào dependency array

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đội bóng này? Tất cả dữ liệu liên quan (cầu thủ, trận đấu, kết quả,...) của đội trong mùa giải này sẽ bị xóa vĩnh viễn và không thể khôi phục.')) {
            return;
        }

        setDeletingId(id); // Bắt đầu hiển thị vòng xoay
        setPageError('');
        try {
            await axios.delete(`http://localhost:5000/api/teams/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPageSuccess('Xóa đội bóng thành công. Dữ liệu mùa giải đang được tính toán lại.');
            // Tải lại danh sách đội bóng sau khi xóa
            setTeams(teams.filter((team) => team._id !== id));
        } catch (err) {
            setPageError(err.response?.data?.message || 'Không thể xóa đội bóng. Vui lòng thử lại.');
        } finally {
            setDeletingId(null); // Dừng hiển thị vòng xoay
        }
    };

    if (loading) return <p className="text-center text-gray-500 py-10">Đang tải danh sách đội bóng...</p>;
    
    return (
        <div className="p-4 rounded-lg">
            {teams.length === 0 ? (
                <p className="text-gray-500 text-center py-10">Không có đội bóng nào cho mùa giải đã chọn.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teams.map((team) => (
                        <div key={team._id} className="bg-gray-50 border rounded-lg shadow-md p-4 flex flex-col items-center justify-between transform transition-transform duration-200 hover:scale-105 hover:shadow-lg">
                            <div className="flex-grow flex flex-col items-center">
                                <img src={team.logo} alt={`${team.team_name} logo`} className="w-24 h-24 object-contain mb-4" onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.dSoxOf16Bt30Ntp4xXxg6gAAAA?rs=1&pid=ImgDetMain')} />
                                <h3 className="text-lg font-semibold text-center text-gray-800">{team.team_name}</h3>
                                <p className="text-sm text-gray-600 text-center">Sân: {team.stadium}</p>
                                <p className="text-sm text-gray-600 text-center">HLV: {team.coach}</p>
                            </div>
                            {token && onEdit && (
                                <div className="mt-4 pt-4 border-t w-full flex justify-center space-x-2">
                                    {deletingId === team._id ? (
                                        <div className="flex items-center justify-center h-8 w-full">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => onEdit(team)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors duration-200 text-xs font-semibold">Sửa</button>
                                            <button onClick={() => handleDelete(team._id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors duration-200 text-xs font-semibold">Xóa</button>
                                        </>
                                    )}
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