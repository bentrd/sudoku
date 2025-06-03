// frontend/src/components/authentication/useAuth.jsx
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};

export default useAuth;