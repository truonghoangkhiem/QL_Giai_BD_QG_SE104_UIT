import React, { useState, useEffect } from 'react';
import Rankings from '../components/Rankings';
import PlayerRankings from '../components/PlayerRankings';

const RankingsPage = ({ token }) => {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [error, setError] = useState(null);

    // Tải danh sách mùa giải
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                console.log('Fetching seasons from API...');
                const response = await fetch('http://localhost:5000/api/seasons');
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const result = await response.json();
                console.log('API response:', result);
                if (!result.success || !Array.isArray(result.data)) {
                    throw new Error('Invalid data format from API');
                }
                const activeSeasons = result.data.filter(season => season.status === true);
                setSeasons(activeSeasons);
                if (activeSeasons.length > 0) {
                    setSelectedSeasonId(activeSeasons[0]._id);
                }
            } catch (err) {
                console.error('Fetch seasons failed:', err.message);
                setSeasons([
                    {
                        _id: '67ceaf8b444f610224ed67df',
                        season_name: 'V-League 2017',
                        start_date: '2025-01-10',
                        end_date: '2025-06-30',
                        status: true,
                    },
                    {
                        _id: '67ceaf8b444f610224ed67e0',
                        season_name: 'V-League 2018',
                        start_date: '2026-01-10',
                        end_date: '2026-06-30',
                        status: true,
                    },
                ]);
                setSelectedSeasonId('67ceaf8b444f610224ed67df');
                setError(`Không thể tải danh sách mùa giải từ API: ${err.message}. Hiển thị dữ liệu giả.`);
            }
        };
        fetchSeasons();
    }, []);

    // Hàm định dạng ngày
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Xếp hạng</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <div className="mb-4">
                <label htmlFor="season-select" className="mr-2 font-semibold">
                    Chọn mùa giải:
                </label>
                <select
                    id="season-select"
                    value={selectedSeasonId || ''}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="border p-2 rounded"
                >
                    {seasons.length > 0 ? (
                        seasons.map(season => (
                            <option key={season._id} value={season._id}>
                                {`${season.season_name} (${formatDate(season.start_date)} - ${formatDate(season.end_date)})`}
                            </option>
                        ))
                    ) : (
                        <option value="">Không có mùa giải</option>
                    )}
                </select>
            </div>
            <h3 className="text-xl font-semibold mb-2">Xếp hạng đội bóng</h3>
            <Rankings seasonId={selectedSeasonId} token={token} />
            <h3 className="text-xl font-semibold mt-8 mb-2">Xếp hạng cầu thủ</h3>
            <PlayerRankings seasonId={selectedSeasonId} token={token} />
        </div>
    );
};

export default RankingsPage;