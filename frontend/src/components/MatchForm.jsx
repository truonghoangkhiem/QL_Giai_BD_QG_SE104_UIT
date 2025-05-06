import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MatchForm = ({ editingMatch, setEditingMatch, setShowForm, setMatches, token }) => {
  const [formData, setFormData] = useState({
    season_id: '',
    team1: '',
    team2: '',
    date: '',
    stadium: '',
    score: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingMatch) {
      setFormData({
        season_id: editingMatch.season_id?._id || '',
        team1: editingMatch.team1?._id || '',
        team2: editingMatch.team2?._id || '',
        date: editingMatch.date ? new Date(editingMatch.date).toISOString().split('T')[0] : '',
        stadium: editingMatch.stadium || '',
        score: editingMatch.score || '',
      });
    }
  }, [editingMatch]);

  const validateScore = (score) => {
    const scoreRegex = /^[0-9]+-[0-9]+$/;
    return score === '' || scoreRegex.test(score);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!validateScore(formData.score)) {
      setError('Tỉ số phải có định dạng x-y (ví dụ: 0-0)');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        season_id: formData.season_id,
        team1: formData.team1,
        team2: formData.team2,
        date: new Date(formData.date).toISOString(),
        stadium: formData.stadium,
        score: formData.score || '0-0',
      };

      let response;
      if (editingMatch) {
        response = await axios.put(`http://localhost:5000/api/matches/${editingMatch._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatches((prev) =>
          prev.map((match) => (match._id === editingMatch._id ? response.data.data : match))
        );
      } else {
        response = await axios.post('http://localhost:5000/api/matches/single', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMatches((prev) => [...prev, response.data.data]);
      }

      setSuccess(editingMatch ? 'Cập nhật trận đấu thành công!' : 'Thêm trận đấu thành công!');
      setFormData({
        season_id: '',
        team1: '',
        team2: '',
        date: '',
        stadium: '',
        score: '',
      });
      setTimeout(() => {
        setShowForm(false);
        setEditingMatch(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu trận đấu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {editingMatch ? 'Sửa trận đấu' : 'Thêm trận đấu'}
      </h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Season ID</label>
          <input
            type="text"
            value={formData.season_id}
            onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
            placeholder="Nhập Season ID"
            className="w-full p-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Đội 1 - ID</label>
          <input
            type="text"
            value={formData.team1}
            onChange={(e) => setFormData({ ...formData, team1: e.target.value })}
            placeholder="Nhập Team 1 ID"
            className="w-full p-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Đội 2 - ID</label>
          <input
            type="text"
            value={formData.team2}
            onChange={(e) => setFormData({ ...formData, team2: e.target.value })}
            placeholder="Nhập Team 2 ID"
            className="w-full p-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ngày thi đấu</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sân vận động</label>
          <input
            type="text"
            value={formData.stadium}
            onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
            placeholder="Nhập tên sân vận động"
            className="w-full p-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tỉ số</label>
          <input
            type="text"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            placeholder="Tỉ số (ví dụ: 0-0)"
            className="w-full p-2 bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex space-x-3">
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition"
            disabled={loading}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchForm;