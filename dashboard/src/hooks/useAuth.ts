import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/constants';

export const useAuth = () => {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate(ROUTES.LOGIN);
  };

  return {
    isAuthenticated,
    user,
    logout,
  };
};
