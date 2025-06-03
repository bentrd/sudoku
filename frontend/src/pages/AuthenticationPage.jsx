import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../components/authentication/useAuth';
import LoginForm from '../components/authentication/LoginForm';
import SignupForm from '../components/authentication/SignupForm';

const AuthenticationPage = () => {
    const [isSignup, setIsSignup] = useState(false);
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    // After login, redirect back to where the user came from (default '/')
    const from = location.state?.from?.pathname || '/';

    const handleLogin = async ({ username, password }) => {
        const success = await login({ username, password });
        if (success) {
            navigate(from, { replace: true });
        } else {
            alert('Invalid credentials');
        }
    };

    const handleSignup = async ({ username, email, password }) => {
        const success = await signup({ username, email, password });
        if (success) {
            // After successful sign-up, switch to login screen
            setIsSignup(false);
            alert('Signup successful! Please log in.');
        } else {
            alert('Signup failed');
        }
    };

    return (
        <div className="flex flex-row items-center justify-center min-h-screen min-w-screen">
            {isSignup ? (
                <SignupForm
                    onSwitchToLogin={() => setIsSignup(false)}
                    onSignup={handleSignup}
                />
            ) : (
                <LoginForm
                    onSwitchToSignup={() => setIsSignup(true)}
                    onLogin={handleLogin}
                />
            )}
        </div>
    );
};

export default AuthenticationPage;