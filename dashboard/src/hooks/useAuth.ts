import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return {
    isAuthenticated,
    user,
    logout,
  };
};
