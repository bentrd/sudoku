// frontend/src/components/authentication/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from './useAuth';

const LoginForm = ({ onSwitchToSignup }) => {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [statusMsg, setStatusMsg] = useState(null); // { type: 'error'|'success', text: string }
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const fromPath = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMsg(null);

        const success = await login({ username: emailOrUsername, password });
        if (success) {
            setStatusMsg({ type: 'success', text: 'Login successful! Redirecting…' });
            // brief delay so user sees success banner
            setTimeout(() => {
                navigate(fromPath, { replace: true });
            }, 800);
        } else {
            setStatusMsg({ type: 'error', text: 'Invalid credentials. Please try again.' });
        }
    };

    return (
        <div className="min-w-screen h-[calc(100vh-4rem)] flex px-4">
            <div className="bg-white rounded-xl m-auto shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">
                    Welcome Back
                </h2>

                {statusMsg && (
                    <div
                        className={`mb-6 px-4 py-2 text-center rounded ${statusMsg.type === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {statusMsg.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label
                            htmlFor="emailOrUsername"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Email or Username
                        </label>
                        <input
                            id="emailOrUsername"
                            type="text"
                            value={emailOrUsername}
                            onChange={(e) => setEmailOrUsername(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                    >
                        Login
                    </button>
                </form>

                <hr className="my-6 border-gray-300" />

                <p className="text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                        type="button"
                        onClick={onSwitchToSignup}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginForm;