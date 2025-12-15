import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isVerified, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Redirect based on role
      if (isVerified) {
        navigate('/teacher', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    }
  }, [isVerified, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Redirecting...</div>
    </div>
  );
}
