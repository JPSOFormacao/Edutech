import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { Button, Input } from '../components/UI';

export default function Login() {
  const [email, setEmail] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      login(email);
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
            <Input 
              label="Endereço de Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@edutech.pt"
            />

            <div>
              <Button type="submit" className="w-full flex justify-center">
                Entrar / Registar
              </Button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Acesso Demo
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setEmail('admin@edutech.pt')} className="text-xs border p-1 rounded hover:bg-slate-50">
                Admin
              </button>
              <button onClick={() => setEmail('jpsoliveira.formacao@hotmail.com')} className="text-xs border p-1 rounded hover:bg-slate-50 bg-indigo-50 border-indigo-200 text-indigo-800 font-medium truncate" title="jpsoliveira.formacao@hotmail.com">
                JPS Admin
              </button>
              <button onClick={() => setEmail('formador@edutech.pt')} className="text-xs border p-1 rounded hover:bg-slate-50">
                Formador
              </button>
              <button onClick={() => setEmail('aluno@edutech.pt')} className="text-xs border p-1 rounded hover:bg-slate-50">
                Aluno
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}