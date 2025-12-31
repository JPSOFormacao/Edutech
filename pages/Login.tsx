import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { Button, Input } from '../components/UI';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (email && password) {
      try {
        login(email, password);
      } catch (err: any) {
        setError(err.message || "Erro ao fazer login");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
                <Icons.Student className="text-white w-10 h-10" />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          EduTech PT
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Gestão de Formação em Novas Tecnologias
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            
            <Input 
              label="Endereço de Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@edutech.pt"
            />

            <Input 
              label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />

            <div>
              <Button type="submit" className="w-full flex justify-center">
                Entrar / Registar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}