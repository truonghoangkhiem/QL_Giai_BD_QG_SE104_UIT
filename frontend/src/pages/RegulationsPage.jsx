import React, { useState } from 'react';
import Regulations from '../components/Regulations';
import RegulationForm from '../components/RegulationForm';

const RegulationsPage = ({ token }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingRegulation, setEditingRegulation] = useState(null);
    const [regulations, setRegulations] = useState([]);

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <div className="container mx-auto p-6 bg-white">
                {showForm ? (
                    <RegulationForm
                        editingRegulation={editingRegulation}
                        setEditingRegulation={setEditingRegulation}
                        setShowForm={setShowForm}
                        setRegulations={setRegulations}
                        token={token}
                    />
                ) : (
                    <div className="flex flex-col items-center">
                        <Regulations
                            regulations={regulations}
                            setRegulations={setRegulations}
                            setEditingRegulation={setEditingRegulation}
                            setShowForm={setShowForm}
                            token={token}
                        />
                        {token && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md text-lg mt-6"
                            >
                                Thêm quy định
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegulationsPage;