import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import AuthButton from './AuthButton';

const LoginForm = ({ onSwitchToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    // Determine where to redirect after login
    const fromPath = location.state?.from?.pathname || '/';

    const Login = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/api/sudoku/login', {
                username: email,
                password,
            });
            const { accessToken } = response.data;
            if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                // Redirect back to originally requested page or home
                navigate(fromPath, { replace: true });
            } else {
                alert('Login failed: no token returned');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert(err.response?.data?.message || 'Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen min-w-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-8">Welcome Back</h2>

                <form onSubmit={Login} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email or Username
                        </label>
                        <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember_me"
                                name="remember_me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-600">
                                Remember me
                            </label>
                        </div>
                        <div className="text-sm">
                            <a href="#" className="font-medium text-blue-600 hover:text-blue-500 ml-4">
                                Forgot your password?
                            </a>
                        </div>
                    </div>
                    <AuthButton
                        text="Login"
                        type="submit"
                        color='bg-blue-600 hover:bg-blue-700'
                        onClick={Login}
                        className="w-full"
                    />
                </form>
                {/* Separator and signup prompt */}
                <hr className="my-6 border-gray-300" />
                <p className="text-center text-sm text-gray-600">
                    Don’t have an account?{' '}
                    <button
                        type="button"
                        onClick={onSwitchToSignup}
                        className="text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    )
}

export default LoginForm;