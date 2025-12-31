import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Icons } from '../components/Icons';
import { Button } from '../components/UI';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const verify = async () => {
        if (!token) {
            setStatus('error');
            setMsg('Token inválido ou inexistente.');
            return;
        }

        try {
            const success = await storageService.verifyUserEmail(token);
            if (success) {
                setStatus('success');
            } else {
                setStatus('error');
                setMsg('Token expirado ou inválido.');
            }
        } catch (e) {
            setStatus('error');
            setMsg('Erro ao processar verificação.');
        }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md w-full text-center">
            
            {status === 'verifying' && (
                <>
                    <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-900">A verificar o seu email...</h2>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmado!</h2>
                    <p className="text-gray-600 mb-6">
                        O seu endereço de email foi validado com sucesso.
                        A sua conta aguarda agora aprovação por parte da equipa EduTech PT.
                    </p>
                    <Button onClick={() => navigate('/login')} className="w-full">
                        Voltar ao Login
                    </Button>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Close className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro na Verificação</h2>
                    <p className="text-gray-600 mb-6">{msg}</p>
                    <Button variant="secondary" onClick={() => navigate('/login')} className="w-full">
                        Voltar
                    </Button>
                </>
            )}
        </div>
    </div>
  );
}