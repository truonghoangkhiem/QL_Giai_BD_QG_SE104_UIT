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
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navbar token={token} setToken={setToken} />
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
    </BrowserRouter>
  );
};

export default App;