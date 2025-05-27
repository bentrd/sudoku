import React from 'react'
import { useState } from 'react'
import AuthButton from './AuthButton'

const LoginForm = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    
    const Login = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            alert('Please fill in both fields.')
            return
        }
        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Login failed')
            }
            const data = await response.json()
            console.log('Login successful:', data)
            // Handle successful login (e.g., store token, redirect)
        } catch (error) {
            console.error('Login error:', error)
            alert(error.message || 'An error occurred during login')
        }
    }

    return (
        <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Login</h2>
            
            <form onSubmit={Login} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your password"
                        required
                    />
                </div>
                
                <div className="pt-4">
                    <AuthButton
                        text="Login"
                        color="#007bff"
                        type="submit"
                        onClick={Login}
                    />
                </div>
            </form>
        </div>
    )
}

export default LoginForm
