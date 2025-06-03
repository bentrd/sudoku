import React, { useState } from 'react'
import LoginForm from '../components/authentication/LoginForm';
import SignupForm from '../components/authentication/SignupForm';

const AuthenticationPage = () => {
    const [isSignup, setIsSignup] = useState(false);
    return (
        <div className="flex flex-row items-center justify-center min-h-screen">
            {isSignup ? (
                <SignupForm onSwitchToLogin={() => setIsSignup(false)} />
            ) : (
                <LoginForm onSwitchToSignup={() => setIsSignup(true)} />
            )}
        </div>
    );
}

export default AuthenticationPage