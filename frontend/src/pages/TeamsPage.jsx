import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Teams from '../components/Teams';
import TeamForm from '../components/TeamForm';

const TeamsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teams, setTeams] = useState([]); // This state seems unused if Teams component fetches its own data
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');

    // Lấy danh sách mùa giải khi component mount
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/seasons');
                setSeasons(response.data.data);
                // Chọn mùa giải đầu tiên làm mặc định (nếu có)
                if (response.data.data.length > 0) {
                    setSelectedSeason(response.data.data[0]._id);
                }
            } catch (err) {
                console.error('Không thể tải danh sách mùa giải', err);
            }
        };
        fetchSeasons();
    }, []);

    return (
        <div
            className="min-h-screen" // Removed gradient, added min-h-screen to ensure it covers viewport
            style={{
                backgroundImage: `url('https://r4.wallpaperflare.com/wallpaper/398/874/541/champions-league-stadium-wallpaper-2221f2202d762e5b8a88b2c5204859f2.jpg')`,
                backgroundSize: 'cover',      // Ensures the image covers the container
                backgroundPosition: 'center',  // Centers the image in the container
                backgroundAttachment: 'fixed', // Makes the background image fixed during scroll
                backgroundRepeat: 'no-repeat'  // Prevents the image from repeating
            }}
        >
            <div className="container mx-auto p-4">
                {showForm ? (
                    <TeamForm
                        editingTeam={editingTeam}
                        setEditingTeam={setEditingTeam}
                        setShowForm={setShowForm}
                        setTeams={setTeams} // This prop might need to be reviewed if Teams component manages its own state via selectedSeason
                        token={token}
                        seasons={seasons} // Pass seasons to TeamForm for selection
                    />
                ) : (
                    <>
                        {/* Header Section with its own background */}
                        <div className="text-red-700 pt-5 px-5 py-20 rounded-lg shadow-md mb-6"
                            style={{
                                backgroundImage: 'url(https://i.pinimg.com/736x/e7/b2/85/e7b2855a88a7e8ccd29a30a43333e6af.jpg)',

                            }}>
                            <h2 className="text-3xl font-bold text-left tracking-wide mb-4" style={{ color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}> {/* Adjusted for readability */}
                                Danh sách đội bóng
                            </h2>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4"> {/* Added gap and responsive flex direction */}
                                {/* "Chọn mùa giải" is now first (left on sm screens and up) */}
                                <div className="w-full sm:w-auto"> {/* Responsive width for select container */}
                                    <label htmlFor="seasonSelect" className="mr-2 font-semibold" style={{ color: 'white', textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}> {/* Adjusted for readability */}
                                        Chọn mùa giải:
                                    </label>
                                    <select
                                        id="seasonSelect"
                                        value={selectedSeason}
                                        onChange={(e) => setSelectedSeason(e.target.value)}
                                        className="p-2 border rounded text-gray-900 w-full sm:w-auto" // Responsive width
                                    >
                                        {seasons.map((season) => (
                                            <option key={season._id} value={season._id}>
                                                {season.season_name || season._id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {/* "Thêm đội bóng" button is now second (right on sm screens and up) */}
                                {token && (
                                    <button
                                        onClick={() => { setEditingTeam(null); setShowForm(true); }} // Ensure form is clear for new entry
                                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 w-full sm:w-auto" // Responsive width
                                    >
                                        Thêm đội bóng
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content Section (Teams list) */}
                        {/* The Teams component will have its own background as previously styled */}
                        <Teams
                            setEditingTeam={setEditingTeam}
                            setShowForm={setShowForm}
                            token={token}
                            selectedSeason={selectedSeason}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TeamsPage;