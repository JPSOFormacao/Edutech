import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { storageService } from '../services/storageService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { UserPrivacySettings } from '../types';

const PRESET_AVATARS = [
  'https://ui-avatars.com/api/?name=User&background=random',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?auto=format&fit=crop&q=80&w=150'
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  
  const [privacy, setPrivacy] = useState<UserPrivacySettings>({
    showEmail: false,
    showCourses: true,
    showBio: true
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      if (user.privacySettings) {
        setPrivacy(user.privacySettings);
      }
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);

    try {
      const updatedUser = {
        ...user,
        name,
        bio,
        avatarUrl: customAvatarUrl || avatarUrl,
        privacySettings: privacy
      };

      await storageService.saveUser(updatedUser);
      await refreshUser();
      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setCustomAvatarUrl(''); // Reset custom input if saved
    } catch (e) {
      setMsg({ type: 'error', text: 'Erro ao guardar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
         <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Icons.Users className="w-6 h-6" />
         </div>
         <h2 className="text-2xl font-bold text-gray-900">O Meu Perfil</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Esquerda: Avatar e Info Básica */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center">
                <div className="relative inline-block">
                    <img 
                        src={customAvatarUrl || avatarUrl || 'https://via.placeholder.com/150'} 
                        alt="Avatar" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 mx-auto mb-4 shadow-sm"
                    />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                <p className="text-indigo-600 text-sm font-medium mb-1">{user?.role}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Escolher Avatar</h4>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {PRESET_AVATARS.map((url, idx) => (
                        <button 
                            key={idx}
                            onClick={() => { setAvatarUrl(url); setCustomAvatarUrl(''); }}
                            className={`w-full aspect-square rounded-md overflow-hidden border-2 transition-all ${avatarUrl === url && !customAvatarUrl ? 'border-indigo-600 scale-105 ring-2 ring-indigo-200' : 'border-transparent hover:border-gray-300'}`}
                        >
                            <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
                <div className="pt-2 border-t">
                    <label className="text-xs text-gray-500 mb-1 block">Ou URL Personalizado:</label>
                    <input 
                        type="text" 
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        placeholder="https://exemplo.com/foto.jpg"
                        className="w-full text-xs border rounded p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>
        </div>

        {/* Direita: Dados e Privacidade */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Edit className="w-4 h-4 text-gray-500" /> 
                    Informações Pessoais
                </h4>
                
                <div className="space-y-4">
                    <Input 
                        label="Nome de Exibição"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Biografia Curta</label>
                        <textarea 
                            rows={3}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            placeholder="Fale um pouco sobre si..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Icons.Shield className="w-4 h-4 text-gray-500" /> 
                    Definições de Privacidade
                </h4>
                <p className="text-sm text-gray-500 mb-4">Escolha quais informações ficam visíveis para os seus colegas de turma na página "Comunidade".</p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span className="block text-sm font-medium text-gray-900">Mostrar Email</span>
                            <span className="block text-xs text-gray-500">Permitir que os colegas vejam o seu email de contacto.</span>
                        </div>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="toggle" id="toggle-email" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-indigo-600" 
                                checked={privacy.showEmail}
                                onChange={(e) => setPrivacy({...privacy, showEmail: e.target.checked})}
                            />
                            <label htmlFor="toggle-email" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${privacy.showEmail ? 'bg-indigo-600' : 'bg-gray-300'}`}></label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span className="block text-sm font-medium text-gray-900">Mostrar Biografia</span>
                            <span className="block text-xs text-gray-500">Exibir o texto "Sobre mim" no cartão da comunidade.</span>
                        </div>
                         <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="toggle" id="toggle-bio" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-indigo-600" 
                                checked={privacy.showBio}
                                onChange={(e) => setPrivacy({...privacy, showBio: e.target.checked})}
                            />
                            <label htmlFor="toggle-bio" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${privacy.showBio ? 'bg-indigo-600' : 'bg-gray-300'}`}></label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span className="block text-sm font-medium text-gray-900">Mostrar Cursos Inscritos</span>
                            <span className="block text-xs text-gray-500">Partilhar que cursos está a frequentar.</span>
                        </div>
                         <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="toggle" id="toggle-courses" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-indigo-600" 
                                checked={privacy.showCourses}
                                onChange={(e) => setPrivacy({...privacy, showCourses: e.target.checked})}
                            />
                            <label htmlFor="toggle-courses" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${privacy.showCourses ? 'bg-indigo-600' : 'bg-gray-300'}`}></label>
                        </div>
                    </div>
                </div>
            </div>

            {msg && (
                <div className={`p-4 rounded-md text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg.text}
                </div>
            )}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'A Guardar...' : 'Guardar Alterações'}
                </Button>
            </div>
        </div>
      </div>
      
      <style>{`
      .toggle-checkbox:checked {
        right: 0;
        border-color: #4f46e5;
      }
      .toggle-checkbox {
        right: auto;
        left: 0;
        transition: all 0.3s;
      }
      .toggle-label {
        width: 2.5rem;
      }
      `}</style>
    </div>
  );
}