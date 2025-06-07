import { useState } from 'react';
import LoginForm from '../components/authentication/LoginForm';
import SignupForm from '../components/authentication/SignupForm';

const AuthenticationPage = () => {
    const [isSignup, setIsSignup] = useState(false);
    return (
        <>
            {isSignup ? (
                <SignupForm
                    onSwitchToLogin={() => setIsSignup(false)}
                />
            ) : (
                <LoginForm
                    onSwitchToSignup={() => setIsSignup(true)}
                />
            )}
        </>
    );
};

export default AuthenticationPage;