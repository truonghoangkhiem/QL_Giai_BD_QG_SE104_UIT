import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Home from './pages/Home';
import TeamsPage from './pages/TeamsPage';
import MatchesPage from './pages/MatchesPage';
import PlayersPage from './pages/PlayersPage';
import SeasonsPage from './pages/SeasonsPage';
import RegulationsPage from './pages/RegulationsPage';
import RankingsPage from './pages/RankingsPage';
import PlayerRankingPage from './pages/PlayerRankingPage';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    // Áp dụng class Tailwind cho màu nền và chiều cao tối thiểu ở đây
    // Bạn có thể thay 'bg-sky-100' bằng các gợi ý khác như:
    // 'bg-gray-100', 'bg-emerald-50', 'bg-stone-100'
    // hoặc gradient: 'bg-gradient-to-br from-sky-100 to-blue-200'
    <div className="min-h-screen bg-sky-100"> {/* Đã thêm div này */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navbar token={token} setToken={setToken} />
        {/* Thêm class 'ml-16 group-hover:ml-48' để nội dung không bị Navbar che khuất khi Navbar mở rộng */}
        <div className="transition-all duration-300 ease-in-out ml-16 group-hover:ml-0 lg:group-hover:ml-48">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login setToken={setToken} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/teams" element={<TeamsPage token={token} />} />
            <Route path="/matches" element={<MatchesPage token={token} />} />
            <Route path="/players" element={<PlayersPage token={token} />} />
            <Route path="/seasons" element={<SeasonsPage token={token} />} />
            <Route path="/regulations" element={<RegulationsPage token={token} />} />
            <Route path="/rankings" element={<RankingsPage token={token} />} />
            <Route path="/player-rankings" element={<PlayerRankingPage token={token} />} />
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
};

export default App;