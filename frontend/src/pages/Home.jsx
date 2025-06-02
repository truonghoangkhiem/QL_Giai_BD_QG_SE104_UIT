import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // Đảm bảo Link đã được import
import Rankings from '../components/Rankings';
import axios from 'axios';

const Home = () => {
    // ... (toàn bộ state và useEffects giữ nguyên như trước) ...
    const [upcomingMatches, setUpcomingMatches] = useState([]);
    const [pastMatches, setPastMatches] = useState([]);
    const [leagueName, setLeagueName] = useState('Bảng xếp hạng');
    const [seasonId, setSeasonId] = useState(null);
    const [error, setError] = useState(null);
    const [currentSeasons, setCurrentSeasons] = useState([]);
    const [pastSeasons, setPastSeasons] = useState([]);
    const [upcomingSeasons, setUpcomingSeasons] = useState([]);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const fetchSeasonsData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                const allSeasons = response.data.data || [];
                const currentDate = new Date();
                const active = [];
                const past = [];
                const upcoming = [];
                allSeasons.forEach((season) => {
                    const startDate = new Date(season.start_date);
                    const endDate = new Date(season.end_date);
                    if (startDate <= currentDate && endDate >= currentDate) {
                        active.push(season);
                    } else if (endDate < currentDate) {
                        past.push(season);
                    } else if (startDate > currentDate) {
                        upcoming.push(season);
                    }
                });
                active.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                past.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
                upcoming.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                setCurrentSeasons(active);
                setPastSeasons(past);
                setUpcomingSeasons(upcoming);
                if (active.length > 0) {
                    setSeasonId(active[0]._id);
                    setLeagueName(active[0].season_name || `Bảng xếp hạng ${active[0].season_name}`);
                } else if (past.length > 0) {
                    setSeasonId(past[0]._id);
                    setLeagueName(past[0].season_name || `Bảng xếp hạng ${past[0].season_name}`);
                } else if (upcoming.length > 0) {
                    setSeasonId(upcoming[0]._id);
                    setLeagueName(upcoming[0].season_name || `Bảng xếp hạng ${upcoming[0].season_name}`);
                } else {
                    // setError('Không tìm thấy mùa giải nào.'); // Có thể bỏ comment nếu muốn báo lỗi khi không có mùa nào
                    setLeagueName('Bảng xếp hạng');
                }
            } catch (err) {
                console.error('Lỗi khi lấy danh sách mùa giải:', err);
                setError('Không thể tải thông tin mùa giải. Vui lòng thử lại sau.');
                setLeagueName('Bảng xếp hạng');
            }
        };
        fetchSeasonsData();
    }, []);

    useEffect(() => {
        const fetchMatches = async () => {
            if (!seasonId) {
                setUpcomingMatches([]);
                setPastMatches([]);
                return;
            }
            try {
                const response = await axios.get(`http://localhost:5000/api/matches/seasons/${seasonId}`);
                const matchesData = response.data.data || response.data || [];
                const currentDate = new Date();
                const upcoming = matchesData
                    .filter((match) => new Date(match.date) > currentDate)
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .slice(0, 5);
                setUpcomingMatches(upcoming);
                const past = matchesData
                    .filter((match) => new Date(match.date) <= currentDate)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);
                setPastMatches(past);
            } catch (err) {
                console.error('Lỗi khi lấy danh sách trận đấu:', err);
                setUpcomingMatches([]);
                setPastMatches([]);
            }
        };
        fetchMatches();
    }, [seasonId]);

    const handleSeasonSelect = (season) => {
        setSeasonId(season._id);
        setLeagueName(season.season_name || `Bảng xếp hạng ${season.season_name}`);
        setUpcomingMatches([]);
        setPastMatches([]);
        setError(null);
    };

    const formatMatchDate = (date) => {
        const matchDate = new Date(date);
        if (isNaN(matchDate)) return 'Chưa xác định';
        return `${matchDate.toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        })} ${matchDate.toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit',
        })}`;
    };

    const handleScrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const handleScrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    const latestMatch = pastMatches[0];

    const renderSeasonList = (seasons, title) => (
        <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">{title}</h4>
            {seasons.length > 0 ? (
                <div className="max-h-[200px] overflow-y-auto pr-2">
                    {seasons.map((season) => (
                        <button
                            key={season._id}
                            onClick={() => handleSeasonSelect(season)}
                            className={`w-full text-left px-3 py-2 mb-2 rounded-md transition-all duration-200 text-sm ${seasonId === season._id
                                ? 'bg-blue-600 text-white font-medium shadow-md'
                                : 'bg-gray-200 text-gray-800 hover:bg-blue-100 hover:text-blue-700'
                                }`}
                        >
                            {season.season_name || 'Mùa giải không xác định'}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 text-sm">Không có mùa giải nào.</p>
            )}
        </div>
    );


    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center">
            {/* Div với background hình ảnh */}
            <div
                className="relative w-full h-[60vh] bg-local bg-[center_20%] bg-cover bg-no-repeat flex flex-col items-center justify-center brightness-110"
                style={{
                    backgroundImage: 'url(https://th.bing.com/th/id/R.d2649b0ebcf1319f2fa6ce793f3b0aae?rik=Qukp%2f0o0cFpoYQ&riu=http%3a%2f%2fwallpapercave.com%2fwp%2fwc1684133.jpg&ehk=%2biipn789lQz3i9sw1yfbGzxTMmxv2Z%2b4A2KyE8SXY74%3d&risl=&pid=ImgRaw&r=0)',
                }}
            >
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="relative z-10 p-8 rounded-lg text-center animate-fade-in">
                    <h1 className="text-4xl font-vietnam font-bold text-white drop-shadow-lg tracking-normal antialiased">
                        Chào mừng đến với Football League Management
                    </h1>
                    <p className="text-xl text-white drop-shadow-md font-light mt-2">
                        Quản lý đội bóng, trận đấu, cầu thủ, mùa giải, và hơn thế nữa!
                    </p>
                    {/* NÚT ĐĂNG NHẬP ĐƯỢC THÊM Ở ĐÂY */}
                    <div className="mt-8">
                        <Link
                            to="/login" // Thay đổi "/login" thành route đăng nhập của bạn
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg inline-block"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content with Sidebar */}
            <div className="mt-12 mb-12 w-full max-w-7xl flex flex-col md:flex-row gap-8 px-4">
                {/* Sidebar - Danh sách mùa giải */}
                <div className="w-full md:w-1/4 bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">Chọn Mùa Giải</h3>
                    {renderSeasonList(upcomingSeasons, 'Mùa giải sắp diễn ra')}
                    {renderSeasonList(currentSeasons, 'Mùa giải đang diễn ra')}
                    {renderSeasonList(pastSeasons, 'Mùa giải đã kết thúc')}
                    {/* Hiển thị lỗi nếu không có mùa giải nào để chọn */}
                    {upcomingSeasons.length === 0 && currentSeasons.length === 0 && pastSeasons.length === 0 && !error && (
                        <p className="text-gray-500 text-sm">Không có dữ liệu mùa giải nào.</p>
                    )}
                </div>

                {/* Nội dung chính */}
                <div className="w-full md:w-3/4 bg-white/95 rounded-2xl shadow-xl p-8 backdrop-blur-sm animate-slide-up">
                    {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-6 text-center">{error}</p>}

                    {/* Section trận đấu sắp diễn ra */}
                    <div className="mb-12"> {/* Added mb-12 for spacing consistent with other sections */}
                        <Link to="/matches">
                            <h3 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                                Các trận đấu sắp diễn ra
                            </h3>
                        </Link>
                        {seasonId && upcomingMatches.length > 0 ? (
                            <div className="relative flex items-center">
                                <button
                                    onClick={handleScrollLeft}
                                    className={`flex-shrink-0 w-6 h-full bg-gray-300 text-gray-700 hover:bg-gray-400 hover:scale-105 rounded-lg shadow-lg transition-all duration-200 z-10 flex items-center justify-center ${upcomingMatches.length <= 1 ? 'hidden' : ''}`} >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" > <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" ></path> </svg>
                                </button>
                                <div ref={scrollContainerRef} className="flex-1 flex gap-4 pb-4 overflow-x-hidden" style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', }} >
                                    {upcomingMatches.slice(0, 5).map((match) => (
                                        <div key={match._id} className="flex-shrink-0 w-72 bg-gray-50 rounded-lg border border-gray-200 border-l-4 shadow-md p-4 transition-all duration-300 hover:shadow-lg hover:border-red-500" >
                                            <div className="text-center mb-3"> <span className="text-sm text-gray-800 font-semibold"> {formatMatchDate(match.date)} </span> </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 w-1/3">
                                                    <img src={match.team1?.logo || 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain'} alt={`${match.team1?.team_name || 'Team 1'} logo`} className="w-10 h-10 object-contain rounded-full border border-gray-200 shadow-sm" onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain')} />
                                                    <span className="text-sm font-semibold text-gray-800 text-left flex-1"> {match.team1?.team_name || 'Team 1'} </span>
                                                </div>
                                                <div className="text-xl font-bold text-gray-700 bg-gray-100 px-4 py-1 rounded-md"> VS </div>
                                                <div className="flex items-center gap-2 w-1/3 justify-end">
                                                    <span className="text-sm font-semibold text-gray-800 text-right flex-1"> {match.team2?.team_name || 'Team 2'} </span>
                                                    <img src={match.team2?.logo || 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain'} alt={`${match.team2?.team_name || 'Team 2'} logo`} className="w-10 h-10 object-contain rounded-full border border-gray-200 shadow-sm" onError={(e) => (e.target.src = 'https://th.bing.com/th/id/OIP.iiLfIvv8F-PfjMrjObypGgHaHa?rs=1&pid=ImgDetMain')} />
                                                </div>
                                            </div>
                                            <div className="text-center"> <span className="text-sm text-gray-600 font-semibold"> 🏟 {match.stadium || 'Không xác định'} </span> </div>
                                        </div>
                                    ))}
                                </div>
                                <style> {` .overflow-x-hidden::-webkit-scrollbar { display: none; } `} </style>
                                <button onClick={handleScrollRight} className={`flex-shrink-0 w-6 h-full bg-gray-300 text-gray-700 hover:bg-gray-400 hover:scale-105 rounded-lg shadow-lg transition-all duration-200 z-10 flex items-center justify-center ${upcomingMatches.length <= 1 ? 'hidden' : ''}`} >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" > <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" ></path> </svg>
                                </button>
                            </div>
                        ) : (
                            seasonId && <p className="text-center text-gray-500 text-lg">Không có trận đấu nào sắp diễn ra trong mùa giải này.</p>
                        )}
                        {!seasonId && !error && <p className="text-center text-gray-500 text-lg">Vui lòng chọn một mùa giải để xem trận đấu.</p>}

                        {seasonId && (
                            <div className="mt-8 text-center">
                                <Link
                                    to="/matches"
                                    className="inline-block bg-red-600 text-white uppercase font-bold py-2 px-6 rounded-full hover:bg-red-700 transition-all duration-200"
                                >
                                    Xem tất cả trận đấu
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Section trận đấu đã kết thúc gần nhất */}
                    <div className="mb-12">
                        <Link to="/matches">
                            <h3 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200 ">
                                Trận đấu đã kết thúc
                            </h3>
                        </Link>
                        {seasonId && pastMatches.length > 0 && latestMatch ? (
                            <div className="bg-white shadow-md p-6 rounded-lg flex flex-col items-center transition-all duration-300 hover:shadow-lg ">
                                <div className="flex justify-between w-full mb-4 text-sm text-gray-600 font-medium">
                                    <span>{formatMatchDate(latestMatch.date)}</span>
                                    <span>🏟 {latestMatch.stadium || 'Không xác định'}</span>
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
                                        {latestMatch.score || 'VS'}
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
                                <div className="flex justify-between w-full mt-4 text-base text-gray-800 font-semibold">
                                    <span>{latestMatch.team1?.team_name || 'Team 1'}</span>
                                    <span>{latestMatch.team2?.team_name || 'Team 2'}</span>
                                </div>
                            </div>
                        ) : (
                            seasonId && <p className="text-center text-gray-500 text-lg">Không có trận đấu nào đã kết thúc trong mùa giải này.</p>
                        )}
                        {!seasonId && !error && <p className="text-center text-gray-500 text-lg">Vui lòng chọn một mùa giải để xem trận đấu.</p>}
                    </div>

                    {/* Section bảng xếp hạng */}
                    <div className="mb-12"> {/* Ensured mb-12 for consistent spacing */}
                        <h3 className="bg-gray-900 text-white text-3xl font-bold py-3 px-6 rounded-none border-l-8 border-red-600 mb-6 text-center tracking-wide hover:brightness-110 transition-all duration-200">
                            {leagueName}
                        </h3>
                        {seasonId ? (
                            <Rankings seasonId={seasonId} hideDropdown={true} />
                        ) : (
                            !error && <p className="text-center text-gray-500 text-lg">Vui lòng chọn một mùa giải để xem bảng xếp hạng.</p>
                        )}
                        {seasonId && (
                            <div className="mt-8 text-center">
                                <Link
                                    to="/rankings"
                                    className="inline-block bg-red-600 text-white uppercase font-bold py-2 px-6 rounded-full hover:bg-red-700 transition-all duration-200"
                                >
                                    Xem chi tiết bảng xếp hạng
                                </Link>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Home;