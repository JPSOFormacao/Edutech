import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  if (!token) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-lg shadow text-center max-w-md w-full">
                  <Icons.Close className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Link Inválido</h2>
                  <p className="text-gray-600 mb-4">O link de redefinição não é válido ou expirou.</p>
                  <Button onClick={() => navigate('/login')}>Voltar ao Login</Button>
              </div>
          </div>
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (password !== confirmPassword) {
          setStatus({ type: 'error', msg: 'As passwords não coincidem.' });
          return;
      }
      if (password.length < 5) {
          setStatus({ type: 'error', msg: 'A password deve ter pelo menos 5 caracteres.' });
          return;
      }

      setLoading(true);
      setStatus(null);

      try {
          await storageService.resetPasswordWithToken(token, password.trim());
          setStatus({ type: 'success', msg: 'Senha alterada com sucesso! A redirecionar...' });
          setTimeout(() => navigate('/login'), 2000);
      } catch (e: any) {
          setStatus({ type: 'error', msg: e.message || 'Erro ao redefinir a senha.' });
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md w-full">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                <Icons.Settings className="h-6 w-6 text-indigo-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Redefinir Password</h2>
            <p className="text-gray-600 text-center mb-6 text-sm">
                Defina uma nova senha para a sua conta.
            </p>

            {status && (
                <div className={`p-3 rounded mb-4 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {status.msg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Password</label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'A Alterar...' : 'Alterar Password'}
                </Button>
                
                <div className="text-center mt-4">
                     <button type="button" onClick={() => navigate('/login')} className="text-sm text-gray-500 hover:text-gray-700">
                         Voltar ao Login
                     </button>
                </div>
            </form>
        </div>
    </div>
  );
}