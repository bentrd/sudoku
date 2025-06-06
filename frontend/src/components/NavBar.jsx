// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from './authentication/useAuth';

const NavBar = () => {
    const { user, logout } = useAuth();
    const [activeLink, setActiveLink] = React.useState('/');
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await logout();
        navigate('/');
    };

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const activeLinkStyle = 'text-blue-600 font-semibold';

    const ProfilePill = ({ setIsMenuOpen, isMenuOpen, handleSignOut }) => {
        return (<div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <span className="text-gray-700 font-medium">{user.username}</span>
                <svg className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isMenuOpen && <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setIsMenuOpen(false)}>
                    Profile
                </Link>
                <Link to="/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors" onClick={() => setIsMenuOpen(false)}>
                    Settings
                </Link>
                <button onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                }} className="block w-full text-left px-4 py-2 text-white bg-red-400 hover:bg-red-500 transition-colors">
                    Sign Out
                </button>
            </div>}
        </div>);
    }

    return (
        <nav className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8 shadow-sm">
            <div className="flex items-center">
                {/* Left: Title (takes equal flex space) */}
                <div className="flex-1">
                    <Link to="/" className="text-2xl font-bold text-gray-800 hover:text-gray-900">
                        Sudoku Battle
                    </Link>
                </div>

                {/* Center: navigation links (fixed width) */}
                <div className="flex-none flex justify-center space-x-8">
                    <Link to="/" className={`text-gray-600 hover:text-gray-800 font-medium ${activeLink === '/' ? activeLinkStyle : ''}`} onClick={() => setActiveLink('/')}>
                        Home
                    </Link>
                    {user && (
                        <>
                            <Link to="/db" className={`text-gray-600 hover:text-gray-800 font-medium ${activeLink === '/db' ? activeLinkStyle : ''}`} onClick={() => setActiveLink('/db')}>
                                Puzzles
                            </Link>
                            <Link to="/solver" className={`text-gray-600 hover:text-gray-800 font-medium ${activeLink === '/solver' ? activeLinkStyle : ''}`} onClick={() => setActiveLink('/solver')}>
                                Solver
                            </Link>
                            <Link to="/versus" className={`text-gray-600 hover:text-gray-800 font-medium ${activeLink === '/versus' ? activeLinkStyle : ''}`} onClick={() => setActiveLink('/versus')}>
                                Versus
                            </Link>
                        </>
                    )}
                </div>

                {/* Right: auth status (takes equal flex space, aligns right) */}
                <div className="flex-1 flex justify-end">
                    {!user ? (
                        <Link
                            to="/auth"
                            className="px-4 py-2 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                        >
                            Login/Signup
                        </Link>
                    ) : (
                        <ProfilePill setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} handleSignOut={handleSignOut} />
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavBar;