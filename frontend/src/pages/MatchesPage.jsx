import React, { useState, useCallback } from 'react';
import Matches from '../components/Matches';
import MatchForm from '../components/MatchForm';

const MatchesPage = ({ token }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [matches, setMatches] = useState([]);

  const memoizedSetMatches = useCallback((newMatches) => {
    console.log('New matches:', newMatches); // Debug giá trị matches
    setMatches(newMatches);
  }, []);

  const onPastMatchesFetched = useCallback((pastMatches) => {
    console.log('Past matches fetched:', pastMatches);
  }, []);

  console.log('Token in MatchesPage:', token); // Debug giá trị token

  return (
    <div className="container mx-auto p-4">
      {showForm ? (
        token ? (
          <MatchForm
            editingMatch={editingMatch}
            setEditingMatch={setEditingMatch}
            setShowForm={setShowForm}
            setMatches={memoizedSetMatches}
            token={token}
          />
        ) : (
          <p className="text-red-500">Vui lòng đăng nhập để thêm hoặc sửa trận đấu.</p>
        )
      ) : (
        <>
          {token && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700 transition disabled:bg-blue-300"
              disabled={showForm}
            >
              Thêm trận đấu
            </button>
          )}
          <Matches
            matches={matches}
            setMatches={memoizedSetMatches}
            setEditingMatch={setEditingMatch}
            setShowForm={setShowForm}
            token={token}
            onPastMatchesFetched={onPastMatchesFetched}
          />
        </>
      )}
    </div>
  );
};

export default MatchesPage;