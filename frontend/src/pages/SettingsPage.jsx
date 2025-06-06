// frontend/src/pages/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import useAuth from '../components/authentication/useAuth';
import axios from 'axios';

const SettingsPage = () => {
    const { user, loading, accessToken } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [statusMsg, setStatusMsg] = useState(null);

    // When auth finishes loading, populate form fields with current user data
    useEffect(() => {
        if (!loading && user) {
            setFormData((f) => ({
                ...f,
                username: user.username || '',
                email: user.email || '',
            }));
        }
    }, [loading, user]);

    const tabs = [
        { id: 'profile', label: 'Profile' },
        // { id: 'preferences', label: 'Preferences' },
        { id: 'security', label: 'Security' },
        // You can add more tabs here as needed
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((f) => ({ ...f, [name]: value }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setStatusMsg(null);

        try {
            // Example API call to update profile; adjust URL as needed
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/auth/update-profile`,
                {
                    username: formData.username,
                    email: formData.email,
                },
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            setStatusMsg({ type: 'success', text: 'Profile updated!' });
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setStatusMsg(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        try {
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/auth/change-password`,
                {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                },
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            setStatusMsg({ type: 'success', text: 'Password changed!' });
            setFormData((f) => ({
                ...f,
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }));
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <span className="text-gray-500">Loading settings…</span>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <span className="text-red-500">You must be logged in to view settings.</span>
            </div>
        );
    }

    return (
        <div className="min-w-screen min-h-screen flex">
            {/* Left‐hand tab menu */}
            <aside className="w-64 border-r border-gray-200">
                <nav className="mt-8">
                    <ul>
                        {tabs.map((tab) => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setStatusMsg(null);
                                    }}
                                    className={`w-full px-6 py-3 text-left hover:bg-gray-50 focus:outline-none ${activeTab === tab.id
                                            ? 'bg-gray-100 border-l-4 border-blue-500 font-semibold'
                                            : 'text-gray-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {/* Right‐hand content area */}
            <main className="flex-1 p-8">
                {activeTab === 'profile' && (
                    <section className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                        <h2 className="text-2xl font-bold mb-4">Profile Settings</h2>
                        {statusMsg && (
                            <div
                                className={`mb-4 px-4 py-2 rounded-full ${statusMsg.type === 'success'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                            >
                                {statusMsg.text}
                            </div>
                        )}
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    id="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {activeTab === 'security' && (
                    <section className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                        <h2 className="text-2xl font-bold mb-4">Change Password</h2>
                        {statusMsg && (
                            <div
                                className={`mb-4 px-4 py-2 rounded-full ${statusMsg.type === 'success'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                            >
                                {statusMsg.text}
                            </div>
                        )}
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    id="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    id="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    id="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-full py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition"
                                >
                                    Change Password
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {activeTab === 'preferences' && (
                    <section className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
                        <h2 className="text-2xl font-bold mb-4">Preferences</h2>
                        <p className="text-gray-600">(Add your preference settings here.)</p>
                        {/* Example preference item */}
                        <div className="mt-4">
                            <label className="flex items-center">
                                <input type="checkbox" className="h-4 w-4 text-blue-600" />{' '}
                                <span className="ml-2 text-gray-700">Enable email notifications</span>
                            </label>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default SettingsPage;