import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { storageService } from '../services/storageService';
import { Button, Input, Modal, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { UserPrivacySettings, Testimonial, TestimonialStatus, UserRole } from '../types';

// Avatares atualizados: Estilo Cartoon Sorridente + Animais/Criaturas
const PRESET_AVATARS = [
  // Humanos Sorridentes (Avataaars)
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&mouth=smile',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Misty&mouth=smile',
  
  // Criaturas/Animais Amigáveis (Big Ears & Bottts)
  'https://api.dicebear.com/7.x/big-ears/svg?seed=Bear',
  'https://api.dicebear.com/7.x/big-ears/svg?seed=Cat',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
  'https://api.dicebear.com/7.x/big-ears/svg?seed=Bunny'
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState(''); // Estado para o Nome Completo
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

  // Testimonial State
  const [userTestimonial, setUserTestimonial] = useState<Testimonial | null>(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [testimonialContent, setTestimonialContent] = useState('');
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialRole, setTestimonialRole] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setFullName(user.fullName || ''); // Carregar nome completo
      setBio(user.bio || '');
      setAvatarUrl(user.avatarUrl || '');
      if (user.privacySettings) {
        setPrivacy(user.privacySettings);
      }
      loadUserTestimonial();
    }
  }, [user]);

  const loadUserTestimonial = async () => {
      if(!user) return;
      const all = await storageService.getTestimonials();
      const mine = all.find(t => t.userId === user.id);
      if(mine) {
          setUserTestimonial(mine);
          setTestimonialContent(mine.content);
          setTestimonialRating(mine.rating);
          setTestimonialRole(mine.role);
      } else {
          setTestimonialRole("Aluno EduTech");
      }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);

    try {
      const updatedUser = {
        ...user, // IMPORTANTE: Manter todos os campos do utilizador (id, role, etc)
        name,
        fullName, // Guardar nome completo
        bio,
        avatarUrl: customAvatarUrl || avatarUrl,
        privacySettings: privacy
      };

      await storageService.saveUser(updatedUser);
      await refreshUser();
      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setCustomAvatarUrl(''); // Reset custom input if saved
    } catch (e: any) {
      console.error(e);
      let errorMessage = 'Erro ao guardar perfil.';
      if (e.message && e.message.includes('column') && e.message.includes('users')) {
          errorMessage = 'Erro de Sistema: Colunas em falta na base de dados. Por favor, execute o script SQL de atualização.';
      } else {
          errorMessage += ' ' + e.message;
      }
      setMsg({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveTestimonial = async () => {
      if(!user || !testimonialContent) return;
      setSaving(true);
      
      const newTestimonial: Testimonial = {
          id: userTestimonial?.id || 'tm_' + Date.now(),
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatarUrl || '',
          role: testimonialRole,
          content: testimonialContent,
          rating: testimonialRating,
          status: TestimonialStatus.PENDING, // Sempre pendente ao editar/criar
          createdAt: new Date().toISOString()
      };

      try {
          await storageService.saveTestimonial(newTestimonial);
          await loadUserTestimonial();
          setIsTestimonialModalOpen(false);
          alert("Testemunho submetido! Aguarda aprovação do Administrador.");
      } catch(e) {
          alert("Erro ao guardar testemunho.");
      } finally {
          setSaving(false);
      }
  };

  const ToggleSwitch = ({ checked, onChange, id }: { checked: boolean, onChange: (val: boolean) => void, id: string }) => (
      <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            id={id} 
            className="sr-only peer" 
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
             <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Icons.Users className="w-6 h-6" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">O Meu Perfil</h2>
         </div>
         {user?.role === UserRole.ALUNO && (
             <Button 
                variant="secondary" 
                onClick={() => setIsTestimonialModalOpen(true)}
                className="hidden sm:flex"
             >
                 {userTestimonial ? "Editar o meu Testemunho" : "Escrever Testemunho"}
             </Button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Esquerda: Avatar e Info Básica */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200 text-center">
                <div className="relative inline-block">
                    <img 
                        src={customAvatarUrl || avatarUrl || 'https://via.placeholder.com/150'} 
                        alt="Avatar" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 mx-auto mb-4 shadow-sm bg-gray-50"
                    />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{name}</h3>
                <p className="text-indigo-600 text-sm font-medium mb-1">{user?.role}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
            </div>

            {user?.role === UserRole.ALUNO && (
                <div className="sm:hidden mb-6">
                    <Button onClick={() => setIsTestimonialModalOpen(true)} className="w-full">
                        {userTestimonial ? "Gerir Testemunho" : "Escrever Testemunho"}
                    </Button>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Escolher Avatar</h4>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {PRESET_AVATARS.map((url, idx) => (
                        <button 
                            key={idx}
                            onClick={() => { setAvatarUrl(url); setCustomAvatarUrl(''); }}
                            className={`w-full aspect-square rounded-md overflow-hidden border-2 transition-all bg-gray-50 ${avatarUrl === url && !customAvatarUrl ? 'border-indigo-600 scale-105 ring-2 ring-indigo-200' : 'border-transparent hover:border-gray-300'}`}
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
                        placeholder="https://..."
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

                    <Input 
                        label="Nome Completo (Real)"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Insira o seu nome completo"
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
                        <ToggleSwitch 
                            id="toggle-email"
                            checked={privacy.showEmail} 
                            onChange={(checked) => setPrivacy({...privacy, showEmail: checked})}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span className="block text-sm font-medium text-gray-900">Mostrar Biografia</span>
                            <span className="block text-xs text-gray-500">Exibir o texto "Sobre mim" no cartão da comunidade.</span>
                        </div>
                        <ToggleSwitch 
                            id="toggle-bio"
                            checked={privacy.showBio} 
                            onChange={(checked) => setPrivacy({...privacy, showBio: checked})}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <span className="block text-sm font-medium text-gray-900">Mostrar Cursos Inscritos</span>
                            <span className="block text-xs text-gray-500">Partilhar que cursos está a frequentar.</span>
                        </div>
                        <ToggleSwitch 
                            id="toggle-courses"
                            checked={privacy.showCourses} 
                            onChange={(checked) => setPrivacy({...privacy, showCourses: checked})}
                        />
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

      {/* Testimonial Modal */}
      <Modal 
         isOpen={isTestimonialModalOpen}
         onClose={() => setIsTestimonialModalOpen(false)}
         title="O meu Testemunho"
         footer={
             <>
                <Button variant="ghost" onClick={() => setIsTestimonialModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveTestimonial} disabled={saving}>{saving ? 'A Submeter...' : 'Submeter para Aprovação'}</Button>
             </>
         }
      >
         <div className="space-y-4">
             {userTestimonial && (
                 <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4 flex items-center justify-between">
                     <span className="text-sm text-yellow-800 font-medium">Estado Atual:</span>
                     <Badge color={userTestimonial.status === TestimonialStatus.APPROVED ? 'success' : userTestimonial.status === TestimonialStatus.PENDING ? 'warning' : 'danger'}>
                         {userTestimonial.status}
                     </Badge>
                 </div>
             )}
             
             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Título / Função</label>
                 <input 
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    value={testimonialRole}
                    onChange={e => setTestimonialRole(e.target.value)}
                    placeholder="Ex: Aluno de Python"
                 />
             </div>
             
             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Classificação</label>
                 <div className="flex gap-2">
                     {[1,2,3,4,5].map(star => (
                         <button 
                            key={star} 
                            type="button"
                            onClick={() => setTestimonialRating(star)}
                            className={`text-2xl ${star <= testimonialRating ? 'text-yellow-400' : 'text-gray-300'}`}
                         >
                             ★
                         </button>
                     ))}
                 </div>
             </div>

             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">O seu Comentário</label>
                 <textarea 
                    rows={4}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    value={testimonialContent}
                    onChange={e => setTestimonialContent(e.target.value)}
                    placeholder="Partilhe a sua experiência com a EduTech PT..."
                 />
                 <p className="text-xs text-gray-500 mt-1">Ao submeter, o seu testemunho ficará pendente até aprovação do administrador.</p>
             </div>
         </div>
      </Modal>
    </div>
  );
}