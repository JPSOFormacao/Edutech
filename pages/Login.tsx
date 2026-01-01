import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { Button, Input, formatCurrency, Modal } from '../components/UI';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Course, User, UserRole, UserStatus, Testimonial, TestimonialStatus } from '../types';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Enrollment State (Course Click)
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState<Course | null>(null);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Register State (New User)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState(''); // Nome Exibido
  const [regFullName, setRegFullName] = useState(''); // Nome Completo
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null); // Novo estado para erro de email
  const [generatedToken, setGeneratedToken] = useState<string | null>(null); // Guardar token para fallback

  // Public Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  React.useEffect(() => {
      // Fetch public data
      const loadPublicData = async () => {
          try {
              const [coursesData, testimonialsData] = await Promise.all([
                  storageService.getCourses(),
                  storageService.getTestimonials()
              ]);
              setCourses(coursesData);
              // Filtrar apenas aprovados
              setTestimonials(testimonialsData.filter(t => t.status === TestimonialStatus.APPROVED));
          } catch(e) {
              console.error("Failed to load data for landing page", e);
          } finally {
              setLoadingCourses(false);
          }
      };
      loadPublicData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (email && password) {
      try {
        await login(email.trim().toLowerCase(), password);
      } catch (err: any) {
        setError(err.message || "Erro ao fazer login");
        setLoading(false);
      }
    } else {
        setLoading(false);
    }
  };

  const openEnrollModal = (course: Course) => {
      setSelectedCourseForEnroll(course);
      setEnrollName('');
      setEnrollEmail('');
      setEnrollSuccess(false);
      setIsEnrollModalOpen(true);
  };

  const handleEnrollment = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedCourseForEnroll) return;
      
      setEnrollLoading(true);
      
      try {
          const allUsers = await storageService.getUsers();
          const cleanEmail = enrollEmail.trim().toLowerCase();
          
          let existingUser = allUsers.find(u => u.email === cleanEmail);
          
          if (existingUser) {
              alert("Já existe uma conta com este email. Por favor faça login para adicionar cursos.");
              setEnrollLoading(false);
              return;
          }

          const newUser: User = {
              id: Date.now().toString(),
              name: enrollName,
              email: cleanEmail,
              password: Math.random().toString(36).slice(-8), 
              role: UserRole.ALUNO,
              roleId: 'role_aluno',
              status: UserStatus.PENDING,
              allowedCourses: [selectedCourseForEnroll.id],
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}&mouth=smile`,
              mustChangePassword: true
          };

          await storageService.saveUser(newUser);
          setEnrollSuccess(true);
      } catch (err) {
          console.error(err);
          alert("Erro ao processar inscrição. Tente novamente.");
      } finally {
          setEnrollLoading(false);
      }
  };

  const openRegisterModal = () => {
      setRegName('');
      setRegFullName('');
      setRegEmail('');
      setRegPass('');
      setRegConfirmPass('');
      setRegisterSuccess(false);
      setEmailError(null);
      setGeneratedToken(null);
      setIsRegisterModalOpen(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (regPass !== regConfirmPass) {
          alert("As senhas não coincidem.");
          return;
      }
      if (regPass.length < 5) {
          alert("A senha deve ter pelo menos 5 caracteres.");
          return;
      }

      setRegisterLoading(true);
      setEmailError(null);
      setGeneratedToken(null);

      try {
          // 1. Criar utilizador
          // Retorna o token necessário para o link, mas NÃO enviamos o email automaticamente.
          const { token } = await storageService.register({
              name: regName,
              fullName: regFullName,
              email: regEmail,
              password: regPass
          });

          // Guardar token caso seja necessário debug, mas o processo agora é manual pelo admin
          setGeneratedToken(token);

          // Alteração: NÃO enviar email automaticamente aqui.
          // O Admin deverá fazer isso na página de gestão de utilizadores.
          
          setRegisterSuccess(true);
      } catch (e: any) {
          alert(e.message || "Erro ao criar conta.");
      } finally {
          setRegisterLoading(false);
      }
  };

  // Star Rating Component
  const StarRating = ({ rating }: { rating: number }) => (
      <div className="flex text-yellow-400">
          {[...Array(5)].map((_, i) => (
              <svg key={i} className={`w-5 h-5 ${i < rating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
          ))}
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                  <div className="flex items-center gap-2">
                     <div className="bg-indigo-600 p-2 rounded-lg">
                        <Icons.Student className="text-white w-6 h-6" />
                     </div>
                     <span className="text-xl font-bold tracking-tight text-gray-900">EduTech <span className="text-indigo-600">PT</span></span>
                  </div>
                  <div className="flex items-center gap-4">
                      <a href="#courses" className="text-sm font-medium text-gray-500 hover:text-gray-900 hidden sm:block">Cursos</a>
                      <button 
                        onClick={openRegisterModal}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-500 border border-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                      >
                          Criar Conta
                      </button>
                      <a href="#login" className="text-sm font-bold text-gray-700 hover:text-gray-900">Entrar</a>
                  </div>
              </div>
          </div>
      </nav>

      {/* Hero / Login Section */}
      <div id="login" className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 gap-12">
          
          {/* Left: Welcome Text */}
          <div className="lg:w-1/2 flex flex-col justify-center space-y-6">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  Evolua a sua carreira com as <span className="text-indigo-600">Novas Tecnologias</span>.
              </h1>
              <p className="text-lg text-gray-600">
                  Plataforma completa de gestão de formação. Aceda aos seus cursos, materiais didáticos e certificações num só lugar.
              </p>
              <div className="flex gap-4">
                  <div className="flex items-center text-sm text-gray-500">
                      <Icons.Check className="w-5 h-5 text-green-500 mr-2" /> Certificados Reconhecidos
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                      <Icons.Check className="w-5 h-5 text-green-500 mr-2" /> Acesso Vitalício
                  </div>
              </div>
              <div className="pt-4 lg:hidden">
                   <Button onClick={openRegisterModal} className="w-full sm:w-auto">Registar Agora</Button>
              </div>
          </div>

          {/* Right: Login Box */}
          <div className="lg:w-1/2 lg:pl-12">
            <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              
              <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Entrar na Plataforma</h2>
                  <p className="text-sm text-gray-500 mt-1">Insira as suas credenciais para continuar</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Icons.Close className="h-5 w-5 text-red-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
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
                  className="bg-gray-50"
                />

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 pr-10"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <Icons.EyeOff className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Icons.Eye className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>

                <div>
                  <Button type="submit" className="w-full flex justify-center py-3 text-base" disabled={loading}>
                    {loading ? (
                        <>
                           <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                           A verificar...
                        </>
                    ) : 'Entrar'}
                  </Button>
                  <p className="text-center text-sm text-gray-500 mt-4">
                      Ainda não tem conta? <button type="button" onClick={openRegisterModal} className="text-indigo-600 font-bold hover:underline">Registe-se aqui</button>
                  </p>
                </div>
              </form>
            </div>
          </div>
      </div>

      {/* Public Courses Grid */}
      <div id="courses" className="bg-gray-50 py-16 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                      Cursos em Destaque
                  </h2>
                  <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
                      Explore a nossa oferta formativa e dê o próximo passo na sua carreira tecnológica.
                  </p>
              </div>

              {loadingCourses ? (
                  <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
              ) : courses.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                      <p>Sem cursos disponíveis de momento.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {courses.map((course) => (
                          <div key={course.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group border border-gray-100">
                              <div className="h-48 w-full relative overflow-hidden">
                                <img 
                                    src={course.imageUrl} 
                                    alt={course.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                                <div className="absolute top-3 left-3">
                                    <span className="bg-indigo-600/90 backdrop-blur px-3 py-1 text-xs font-bold rounded-full text-white shadow-sm">
                                        {course.category}
                                    </span>
                                </div>
                              </div>
                              <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-3 mb-4">{course.description}</p>
                                
                                {/* Mostrar detalhes extra se existirem */}
                                <div className="mb-4 space-y-2">
                                    {course.certificationInfo && (
                                        <div className="flex items-center text-xs text-green-600 bg-green-50 p-1 rounded">
                                            <Icons.Check className="w-3 h-3 mr-1" />
                                            {course.certificationInfo}
                                        </div>
                                    )}
                                    {course.syllabus && (
                                        <div className="text-xs text-gray-500 line-clamp-2 italic">
                                            Inclui: {course.syllabus.replace(/\n/g, ', ')}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gray-100 pt-4 mt-auto">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                                            {course.duration}
                                        </div>
                                        <div className="text-lg font-bold text-indigo-600">
                                            {formatCurrency(course.price)}
                                        </div>
                                    </div>
                                    <Button onClick={() => openEnrollModal(course)} className="w-full">
                                        Inscrever-se Agora
                                    </Button>
                                </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
          <div className="bg-white py-16 border-t border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center mb-12">
                      <h2 className="text-3xl font-extrabold text-gray-900">
                          O que dizem os nossos alunos
                      </h2>
                      <p className="mt-4 text-xl text-gray-500">
                          Histórias reais de quem transformou a sua carreira com a EduTech PT.
                      </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {testimonials.map((t) => (
                          <div key={t.id} className="bg-gray-50 rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col relative">
                              <div className="absolute -top-4 left-6 bg-indigo-600 rounded-full p-2">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" /></svg>
                              </div>
                              <div className="mb-4 pt-4">
                                  <StarRating rating={t.rating} />
                              </div>
                              <p className="text-gray-600 mb-6 italic flex-1">
                                  "{t.content}"
                              </p>
                              <div className="flex items-center mt-auto border-t border-gray-200 pt-4">
                                  <img 
                                      src={t.userAvatar || 'https://via.placeholder.com/50'} 
                                      alt={t.userName} 
                                      className="w-10 h-10 rounded-full mr-3 object-cover"
                                  />
                                  <div>
                                      <h4 className="text-sm font-bold text-gray-900">{t.userName}</h4>
                                      <p className="text-xs text-indigo-600">{t.role}</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title={registerSuccess ? "Registo Efetuado" : "Criar Nova Conta"}
        footer={null}
      >
          {registerSuccess ? (
              <div className="text-center py-6">
                  {/* Ícone de sucesso simples */}
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                      <Icons.Check className="h-6 w-6 text-indigo-600" />
                  </div>
                  
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Conta Criada!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                      O seu registo foi efetuado com sucesso.
                  </p>
                  <p className="mt-2 text-sm text-gray-500 bg-yellow-50 p-3 rounded border border-yellow-100">
                      <strong>Atenção:</strong> A sua conta aguarda agora validação por parte de um Administrador.
                      Irá receber um email de verificação assim que o seu registo for analisado.
                  </p>

                  <div className="mt-6">
                      <Button onClick={() => setIsRegisterModalOpen(false)} className="w-full">Entendi</Button>
                  </div>
              </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
                <Input 
                    label="Nome de Exibição (Ex: João S.)"
                    required
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                />
                <Input 
                    label="Nome Completo"
                    required
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                />
                <Input 
                    label="Email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                />
                
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                        <input
                            type={showRegPass ? "text" : "password"}
                            required
                            value={regPass}
                            onChange={(e) => setRegPass(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                            placeholder="Mínimo 5 caracteres"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowRegPass(!showRegPass)}
                        >
                            {showRegPass ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                    <div className="relative">
                        <input
                            type={showRegConfirmPass ? "text" : "password"}
                            required
                            value={regConfirmPass}
                            onChange={(e) => setRegConfirmPass(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                        >
                            {showRegConfirmPass ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsRegisterModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={registerLoading}>
                        {registerLoading ? 'A Registar...' : 'Criar Conta'}
                    </Button>
                </div>
            </form>
          )}
      </Modal>

      {/* Enrollment Modal (Legacy) */}
      <Modal 
         isOpen={isEnrollModalOpen}
         onClose={() => setIsEnrollModalOpen(false)}
         title={enrollSuccess ? "Inscrição Pendente" : `Inscrever em: ${selectedCourseForEnroll?.title}`}
         footer={null}
      >
          {enrollSuccess ? (
              <div className="text-center py-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                      <Icons.Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Pedido Recebido!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                      A sua conta foi criada e a inscrição registada. <br/>
                      As credenciais de acesso serão enviadas para o seu email após aprovação pelo Administrador.
                  </p>
                  <div className="mt-6">
                      <Button onClick={() => setIsEnrollModalOpen(false)} className="w-full">Fechar</Button>
                  </div>
              </div>
          ) : (
              <form onSubmit={handleEnrollment} className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                      Preencha os seus dados para solicitar inscrição. A senha será enviada posteriormente.
                  </p>
                  
                  <Input 
                      label="Nome Completo"
                      required
                      value={enrollName}
                      onChange={e => setEnrollName(e.target.value)}
                  />
                   <Input 
                      label="Email"
                      type="email"
                      required
                      value={enrollEmail}
                      onChange={e => setEnrollEmail(e.target.value)}
                  />
                  
                  <div className="pt-4 flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={enrollLoading}>
                          {enrollLoading ? 'A Processar...' : 'Confirmar Inscrição'}
                      </Button>
                  </div>
              </form>
          )}
      </Modal>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
              &copy; {new Date().getFullYear()} EduTech PT. Todos os direitos reservados.
          </div>
      </footer>
    </div>
  );
}