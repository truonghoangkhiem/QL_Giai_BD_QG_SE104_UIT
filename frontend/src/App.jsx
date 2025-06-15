import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar'; // Đã có sẵn
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
    <div className="min-h-screen bg-gradient-to-t from-gray-800 to-blue-900 font-sans"
      style={{
        backgroundImage: 'url(https://i.pinimg.com/736x/bd/77/38/bd7738994332b34885361675350610cf.jpg)',
      }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navbar token={token} setToken={setToken} />
        <div className="ml-16"> 
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
};

export default App;