import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const Seasons = ({ seasons, handleEdit, handleDelete, token }) => {
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const onDeleteClick = async (id) => {
        setDeleteError(''); // Xóa lỗi trước đó
        setDeletingId(id);
        const success = await handleDelete(id);
        if (!success) {
            // Lỗi sẽ được hiển thị bởi component cha (SeasonsPage)
        }
        setDeletingId(null);
    };

    if (seasons.length === 0) {
        return <p className="text-center text-gray-500 py-10">Chưa có mùa giải nào được tạo.</p>;
    }

    return (
        <div className="overflow-x-auto">
            {deleteError && <p className="text-red-500 text-center mb-4">{deleteError}</p>}
            <table className="min-w-full">
                <thead className="bg-gray-200">
                    <tr>
                        <th className="py-3 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tên mùa giải</th>
                        <th className="py-3 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ngày bắt đầu</th>
                        <th className="py-3 px-6 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ngày kết thúc</th>
                        <th className="py-3 px-6 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Trạng thái</th>
                        <th className="py-3 px-6 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Hành động</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {seasons.map((season) => (
                        <tr key={season._id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">{season.season_name}</td>
                            <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">{new Date(season.start_date).toLocaleDateString('vi-VN')}</td>
                            <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600">{new Date(season.end_date).toLocaleDateString('vi-VN')}</td>
                            <td className="py-4 px-6 whitespace-nowrap text-sm text-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${season.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {season.status ? 'Đang kích hoạt' : 'Đã khóa'}
                                </span>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap text-center text-sm font-medium">
                                {deletingId === season._id ? (
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                                    </div>
                                ) : (
                                    token && (
                                        <div className="flex justify-center items-center space-x-2">
                                            <button
                                                onClick={() => handleEdit(season)}
                                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-md shadow-sm transition-colors duration-200 text-xs"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => onDeleteClick(season._id)}
                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md shadow-sm transition-colors duration-200 text-xs"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    )
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Seasons;