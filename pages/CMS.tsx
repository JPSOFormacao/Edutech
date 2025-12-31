import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Page, Testimonial, TestimonialStatus } from '../types';
import { Button, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { useNavigate } from 'react-router-dom';

export default function CMS() {
  const [activeTab, setActiveTab] = useState<'pages' | 'testimonials'>('pages');
  
  // Pages State
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  
  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'pages') loadPages();
    else loadTestimonials();
  }, [activeTab]);

  // --- Pages Logic ---
  const loadPages = async () => {
    const data = await storageService.getPages();
    setPages(data);
  };

  const handleCreatePage = () => {
    setSelectedPage({
      slug: 'nova-pagina',
      title: 'Nova Página',
      content: '<h1>Título</h1><p>Conteúdo aqui...</p>',
      updatedAt: new Date().toISOString()
    });
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;
    await storageService.savePages([{ ...selectedPage, updatedAt: new Date().toISOString() }]);
    await loadPages();
    setSelectedPage(null);
  };

  const handleDeletePage = async (slug: string) => {
      if (confirm('Eliminar esta página?')) {
          await storageService.deletePage(slug);
          await loadPages();
          if (selectedPage?.slug === slug) setSelectedPage(null);
      }
  };

  // --- Testimonials Logic ---
  const loadTestimonials = async () => {
      const data = await storageService.getTestimonials();
      // Ordenar: PENDING primeiro, depois por data
      const sorted = data.sort((a, b) => {
          if (a.status === TestimonialStatus.PENDING && b.status !== TestimonialStatus.PENDING) return -1;
          if (a.status !== TestimonialStatus.PENDING && b.status === TestimonialStatus.PENDING) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTestimonials(sorted);
  };

  const updateTestimonialStatus = async (t: Testimonial, status: TestimonialStatus) => {
      await storageService.saveTestimonial({ ...t, status });
      await loadTestimonials();
  };

  const deleteTestimonial = async (id: string) => {
      if (confirm("Apagar este testemunho permanentemente?")) {
          await storageService.deleteTestimonial(id);
          await loadTestimonials();
      }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
       {/* Tab Navigation */}
       <div className="flex border-b border-gray-200 mb-4 bg-white px-6 pt-4 rounded-t-lg">
           <button 
             onClick={() => setActiveTab('pages')}
             className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
              <div className="flex items-center gap-2">
                  <Icons.FileText className="w-4 h-4" /> Gestão de Páginas
              </div>
           </button>
           <button 
             onClick={() => setActiveTab('testimonials')}
             className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'testimonials' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
              <div className="flex items-center gap-2">
                  <Icons.Users className="w-4 h-4" /> Gestão de Testemunhos
              </div>
           </button>
       </div>

      {activeTab === 'pages' && (
          <div className="flex flex-1 overflow-hidden">
            {/* List */}
            <div className="w-1/3 border-r pr-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="text-xl font-bold text-gray-900">Páginas</h2>
                    <Button size="sm" onClick={handleCreatePage}><Icons.Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 px-2">
                    {pages.map(page => (
                        <div 
                            key={page.slug} 
                            className={`p-3 rounded border cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedPage?.slug === page.slug ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                            onClick={() => setSelectedPage(page)}
                        >
                            <div>
                                <div className="font-medium text-gray-900">{page.title}</div>
                                <div className="text-xs text-gray-500">/p/{page.slug}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/p/${page.slug}`); }} className="text-gray-400 hover:text-indigo-600">
                                    <Icons.Link className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.slug); }} className="text-gray-400 hover:text-red-600">
                                    <Icons.Delete className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 pl-6 flex flex-col overflow-y-auto">
                {selectedPage ? (
                    <div className="h-full flex flex-col space-y-4 pr-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Título" 
                                value={selectedPage.title} 
                                onChange={e => setSelectedPage({...selectedPage, title: e.target.value})} 
                            />
                            <Input 
                                label="Slug (URL)" 
                                value={selectedPage.slug} 
                                onChange={e => setSelectedPage({...selectedPage, slug: e.target.value})} 
                            />
                        </div>
                        
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (HTML / Rich Text)</label>
                            <textarea 
                                className="flex-1 w-full border border-gray-300 rounded-md p-4 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[300px]"
                                value={selectedPage.content}
                                onChange={e => setSelectedPage({...selectedPage, content: e.target.value})}
                            />
                            <p className="text-xs text-gray-500 mt-1">Este campo aceita HTML básico para formatação.</p>
                        </div>

                        <div className="flex justify-end pt-2 pb-4">
                            <Button onClick={handleSavePage}>Guardar Alterações</Button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        Selecione uma página para editar
                    </div>
                )}
            </div>
          </div>
      )}

      {activeTab === 'testimonials' && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Aprovação de Testemunhos</h2>
                  <span className="text-sm text-gray-500">{testimonials.length} registos</span>
              </div>
              
              {testimonials.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">Não existem testemunhos.</p>
              ) : (
                  <div className="grid grid-cols-1 gap-4">
                      {testimonials.map(t => (
                          <div key={t.id} className={`bg-white border rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4 ${t.status === TestimonialStatus.PENDING ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
                                <div className="flex-shrink-0">
                                    <img src={t.userAvatar} alt="" className="w-12 h-12 rounded-full border border-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900">{t.userName}</h4>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">{t.role}</span>
                                        <Badge color={t.status === TestimonialStatus.APPROVED ? 'success' : t.status === TestimonialStatus.PENDING ? 'warning' : 'danger'}>
                                            {t.status}
                                        </Badge>
                                    </div>
                                    <div className="text-yellow-400 text-sm mb-1">
                                        {"★".repeat(t.rating)}{"☆".repeat(5-t.rating)}
                                    </div>
                                    <p className="text-gray-700 text-sm italic">"{t.content}"</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleDateString()} às {new Date(t.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <div className="flex md:flex-col gap-2">
                                    {t.status === TestimonialStatus.PENDING && (
                                        <>
                                            <Button size="sm" onClick={() => updateTestimonialStatus(t, TestimonialStatus.APPROVED)}>
                                                Aprovar
                                            </Button>
                                            <Button size="sm" variant="danger" onClick={() => updateTestimonialStatus(t, TestimonialStatus.REJECTED)}>
                                                Rejeitar
                                            </Button>
                                        </>
                                    )}
                                    {t.status !== TestimonialStatus.PENDING && (
                                        <Button size="sm" variant="ghost" onClick={() => updateTestimonialStatus(t, TestimonialStatus.PENDING)}>
                                            Reverter p/ Pendente
                                        </Button>
                                    )}
                                    <button 
                                        onClick={() => deleteTestimonial(t.id)} 
                                        className="text-red-500 hover:text-red-700 text-xs flex items-center justify-center py-1"
                                    >
                                        <Icons.Delete className="w-3 h-3 mr-1" /> Apagar
                                    </button>
                                </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
}