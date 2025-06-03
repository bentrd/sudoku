// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from './authentication/useAuth';

const NavBar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await logout();
        navigate('/');
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left: links */}
                    <div className="flex space-x-6 items-center">
                        <Link
                            to="/"
                            className="text-gray-700 hover:text-gray-900 font-medium"
                        >
                            Home
                        </Link>
                        <Link
                            to="/db"
                            className="text-gray-700 hover:text-gray-900 font-medium"
                        >
                            Puzzles
                        </Link>
                        <Link
                            to="/solver"
                            className="text-gray-700 hover:text-gray-900 font-medium"
                        >
                            Solver
                        </Link>
                    </div>

                    {/* Right: auth status */}
                    <div className="flex items-center space-x-4">
                        {!user ? (
                            <>
                                <Link
                                    to="/auth"
                                    className="px-3 py-1 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm"
                                >
                                    Login/Signup
                                </Link>
                                
                            </>
                        ) : (
                            <>
                                <span className="text-gray-700 font-medium">
                                    Welcome, {user.username}
                                </span>
                                <button
                                    onClick={handleSignOut}
                                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;