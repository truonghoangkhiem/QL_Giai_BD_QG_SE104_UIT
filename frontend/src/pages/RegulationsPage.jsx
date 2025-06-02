import React, { useState, useEffect } from 'react'; // Thêm useEffect
import axios from 'axios'; // Thêm axios
import Regulations from '../components/Regulations';
import RegulationForm from '../components/RegulationForm';

const RegulationsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingRegulation, setEditingRegulation] = useState(null);
    // Bỏ regulations state ở đây vì Regulations component tự quản lý
    // const [regulations, setRegulations] = useState([]);

    // State cho seasons và selectedSeasonId sẽ được quản lý trong RegulationsPage
    // để truyền xuống cho cả Regulations (hiển thị) và RegulationForm (thêm/sửa)
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');

    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const seasonsRes = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(seasonsRes.data.data);
                if (seasonsRes.data.data.length > 0) {
                    setSelectedSeasonId(seasonsRes.data.data[0]._id); // Chọn mùa giải đầu tiên mặc định
                }
            } catch (err) {
                console.error('Không thể tải danh sách mùa giải', err);
                // Có thể thêm state error ở đây để hiển thị cho người dùng
            }
        };
        fetchSeasons();
    }, []);

    // Callback để refresh lại danh sách regulations khi form được submit thành công
    // Component Regulations sẽ tự fetch lại khi selectedSeasonId thay đổi (hoặc có thể thêm 1 state trigger)
    // Tuy nhiên, nếu RegulationForm thêm mới/sửa đổi, chúng ta cần 1 cách để Regulations biết và fetch lại.
    // Cách đơn giản là truyền một key thay đổi hoặc một callback.
    // Hiện tại, Regulations đã có useEffect theo dõi selectedSeasonId,
    // nên nếu không đổi mùa giải thì nó không fetch lại.
    // Chúng ta có thể thêm một state `refreshKey` để trigger việc fetch lại trong Regulations
    const [refreshKey, setRefreshKey] = useState(0);
    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingRegulation(null);
        setRefreshKey(prevKey => prevKey + 1); // Thay đổi key để trigger fetch lại trong Regulations
    };


    return (
        <div className="min-h-screen bg-gray-100 font-sans"
            style={{
                backgroundImage: 'url(https://i.pinimg.com/736x/cd/07/2b/cd072bdf8a259e2d064fbb291a4456e8.jpg)', // Background cho toàn trang
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'scroll', // Để background cố định khi cuộn
            }}>
            <div className="container mx-auto p-4 md:p-6">
                {showForm ? (
                    <RegulationForm
                        editingRegulation={editingRegulation}
                        setEditingRegulation={setEditingRegulation} // Giữ lại để form biết đang sửa gì
                        setShowForm={setShowForm} // Để đóng form
                        // setRegulations prop không còn cần thiết nếu Regulations tự fetch
                        token={token}
                        seasons={seasons} // Truyền danh sách mùa giải cho form
                        initialSelectedSeasonId={editingRegulation ? editingRegulation.season_id : selectedSeasonId} // Mùa giải cho quy định đang sửa hoặc mùa đang chọn
                        onSuccess={handleFormSuccess} // Callback khi form thành công
                    />
                ) : (
                    // Container chính cho phần hiển thị danh sách (giống SeasonsPage)
                    <div className="bg-white/90 rounded-lg shadow-xl overflow-hidden">
                        {/* Header Section - Tiêu đề và nút Thêm */}
                        <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-5 border-b border-gray-200"
                            style={{ // Có thể thêm background riêng cho header này nếu muốn
                                // backgroundImage: 'url(link_anh_nen_header_neu_co)',
                                // backgroundSize: 'cover',
                                // backgroundPosition: 'center',
                            }}
                        >
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0">
                                📜Quản lý Quy định Giải đấu
                            </h1>
                            {token && (
                                <button
                                    onClick={() => { setEditingRegulation(null); setShowForm(true); }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 w-full sm:w-auto"
                                >
                                    Thêm quy định
                                </button>
                            )}
                        </div>

                        {/* Phần chọn mùa giải và danh sách quy định */}
                        <div className="p-4 md:p-6">
                            {/* Phần chọn mùa giải giờ sẽ nằm ở đây, bên trong RegulationsPage */}
                            <div className="mb-6 flex justify-center sm:justify-start">
                                <div className="w-full sm:w-auto sm:max-w-xs md:max-w-sm">
                                    <label htmlFor="page-season-select" className="block text-sm font-medium text-gray-700 mb-1">
                                        Xem quy định cho mùa giải:
                                    </label>
                                    <select
                                        id="page-season-select"
                                        value={selectedSeasonId}
                                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    >
                                        <option value="">Chọn mùa giải</option>
                                        {seasons.map((season) => (
                                            <option key={season._id} value={season._id}>
                                                {season.season_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Regulations
                                // regulations và setRegulations được quản lý bên trong Regulations component dựa trên selectedSeasonId và refreshKey
                                setEditingRegulation={setEditingRegulation}
                                setShowForm={setShowForm}
                                token={token}
                                selectedSeasonId={selectedSeasonId} // Truyền mùa giải đã chọn xuống
                                seasons={seasons} // Truyền danh sách mùa giải xuống (để lấy tên mùa giải)
                                refreshKey={refreshKey} // Truyền key để trigger fetch lại
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegulationsPage;