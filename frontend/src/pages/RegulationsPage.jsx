import React, { useState } from 'react';
import Regulations from '../components/Regulations';
import RegulationForm from '../components/RegulationForm';

const RegulationsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingRegulation, setEditingRegulation] = useState(null);
    const [regulations, setRegulations] = useState([]);

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <div className="container mx-auto p-4 bg-white">
                {showForm ? (
                    <RegulationForm
                        editingRegulation={editingRegulation}
                        setEditingRegulation={setEditingRegulation}
                        setShowForm={setShowForm}
                        setRegulations={setRegulations}
                        token={token} // Truyền token để RegulationForm kiểm tra quyền
                    />
                ) : (
                    <>
                        {token ? (
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-blue-600 text-white p-2 rounded mb-4"
                            >
                                Thêm quy định
                            </button>
                        ) : (
                            <p className="text-gray-500 mb-4"></p>
                        )}
                        <Regulations
                            setEditingRegulation={setEditingRegulation}
                            setShowForm={setShowForm}
                            token={token} // Truyền token để Regulations kiểm tra quyền
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default RegulationsPage;