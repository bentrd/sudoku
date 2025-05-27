import React from 'react'
import LoginForm from '../components/authentication/LoginForm';

const Authentication = () => {
    const handleClick = (action) => {
        console.log(`${action} button clicked`);
        // show modal
    }

    return (
    <>
        <div>Authentication</div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '2rem' }}>
            <LoginForm />
        </div>
    </>
    )
}

export default Authentication