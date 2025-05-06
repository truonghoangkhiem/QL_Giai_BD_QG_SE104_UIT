import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Matches from '../components/Matches';
import Rankings from '../components/Rankings';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import axios from 'axios';

const Home = () => {
    const [pastMatches, setPastMatches] = useState([]);
    const [leagueName, setLeagueName] = useState('Bảng xếp hạng mùa giải hiện tại');
    const seasonId = '67ceaf8b444f610224ed67df'; // Giả định seasonId

    const handlePastMatchesFetched = (matches) => {
        setPastMatches(matches);
    };

    // Lấy tên giải đấu từ seasonId
    useEffect(() => {
        const fetchLeagueName = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/seasons/${seasonId}`);
                const seasonData = response.data.data;
                setLeagueName(seasonData.leagueName || seasonData.name || 'Bảng xếp hạng mùa giải hiện tại');
            } catch (err) {
                console.error('Không thể tải tên giải đấu, sử dụng giá trị mặc định');
                setLeagueName('Bảng xếp hạng mùa giải hiện tại');
            }
        };

        fetchLeagueName();
    }, [seasonId]);

    const latestMatch = pastMatches[0];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center">
            {/* Div với background hình ảnh */}
            <div
                className="relative w-full h-[60vh] bg-local bg-center bg-cover bg-no-repeat flex flex-col items-center justify-center"
                style={{
                    backgroundImage: 'url(https://cdn.bettingexpert.com/assets/football-banner.webp)',
                }}
            >
                {/* Overlay mờ */}
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="relative z-10 p-8 rounded-lg text-center animate-fade-in">
                    <h1 className="text-4xl font-vietnam font-bold text-white drop-shadow-lg tracking-normal antialiased">
                        Chào mừng đến với Football League Management
                    </h1>
                    <p className="text-xl text-white drop-shadow-md font-light">
                        Quản lý đội bóng, trận đấu, cầu thủ, mùa giải, và hơn thế nữa!
                    </p>
                </div>
            </div>

            {/* Combined Container for Latest Match, Rankings, and Upcoming Matches */}
            <div className="mt-12 mb-12 w-full bg-white/95 rounded-2xl shadow-xl p-8 backdrop-blur-sm animate-slide-up">
                {/* Section trận đấu gần nhất */}
                <div className="mb-8">
                    <Link to="/matches">
                        <h3 className="bg-gradient-to-r from-slate-600 to-slate-800 text-4xl font-extrabold text-white py-3 px-6 rounded-lg drop-shadow-md mb-4 text-center font-heading hover:brightness-110 transition-all duration-200">
                            Kết quả trận đấu gần nhất
                        </h3>
                    </Link>
                    {pastMatches.length > 0 && latestMatch ? (
                        <div className="bg-white shadow-md p-8 flex flex-col items-center transition-all duration-300 hover:shadow-lg">
                            <div className="flex justify-between w-full mb-4">
                                <div className="text-sm text-gray-600 font-medium">
                                    {new Date(latestMatch.date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </div>
                                <div className="text-sm text-gray-600 font-medium">
                                    🏟 {latestMatch.stadium || 'Không xác định'}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <img
                                    src={
                                        latestMatch.team1?.logo ||
                                        'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain'
                                    }
                                    alt={`${latestMatch.team1?.team_name || 'Team 1'} logo`}
                                    className="w-16 h-16 object-contain rounded-full border-2 border-gray-200 shadow-sm"
                                    onError={(e) =>
                                    (e.target.src =
                                        'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain')
                                    }
                                />
                                <div className="text-4xl font-extrabold text-blue-700 bg-blue-50 px-6 py-2 rounded-lg shadow-inner">
                                    {latestMatch.score || 'N/A'}
                                </div>
                                <img
                                    src={
                                        latestMatch.team2?.logo ||
                                        'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain'
                                    }
                                    alt={`${latestMatch.team2?.team_name || 'Team 2'} logo`}
                                    className="w-16 h-16 object-contain rounded-full border-2 border-gray-200 shadow-sm"
                                    onError={(e) =>
                                    (e.target.src =
                                        'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain')
                                    }
                                />
                            </div>
                            <div className="flex justify-between w-full mt-4">
                                <div className="text-base text-gray-800 font-semibold text-left">
                                    {latestMatch.team1?.team_name || 'Team 1'}
                                </div>
                                <div className="text-base text-gray-800 font-semibold text-right">
                                    {latestMatch.team2?.team_name || 'Team 2'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 text-lg">Không có trận đấu nào đã diễn ra.</p>
                    )}
                </div>

                {/* Section bảng xếp hạng */}
                <div className="mb-8 flex flex-col">
                    <Link to="/rankings">
                        <h3 className="bg-gradient-to-r from-slate-600 to-slate-800 text-4xl font-extrabold text-white py-3 px-6 rounded-lg drop-shadow-md mb-4 text-center font-heading hover:brightness-110 transition-all duration-200">
                            {leagueName}
                        </h3>
                    </Link>
                    <Rankings seasonId={seasonId} />
                </div>

                {/* Section trận đấu sắp diễn ra */}
                <div>
                    <Matches
                        type="upcoming"
                        onPastMatchesFetched={handlePastMatchesFetched}
                        seasonId={seasonId}
                        limit={10}
                    />
                    <div className="mt-8 text-center">
                        <Link
                            to="/matches"
                            className="inline-block bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                        >
                            Xem tất cả trận đấu
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;