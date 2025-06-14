
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X, Save, MessageCircle, Key, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InstagramPost, formatPostDate, truncateCaption } from '@/services/instagramPostsService';

export interface CommentAutoresponderConfig {
  name: string;
  keywords: string[];
  dmMessage: string;
  postId: string;
  postUrl: string;
  postCaption?: string;
}

interface CommentAutoresponderFormProps {
  selectedPost: InstagramPost;
  onBack: () => void;
  onSubmit: (config: CommentAutoresponderConfig) => void;
}

const CommentAutoresponderForm = ({ selectedPost, onBack, onSubmit }: CommentAutoresponderFormProps) => {
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  // Función para obtener información de la página usando Page Access Token
  const getPageInfo = async () => {
    const token = localStorage.getItem('hower-instagram-token');
    if (!token) {
      throw new Error('No hay token de Instagram disponible');
    }

    try {
      // Con un Page Access Token, primero verificamos qué página es
      // usando el token para obtener info de la página específica
      const response = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,instagram_business_account&access_token=${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error API:', errorData);
        throw new Error('Token de página inválido o expirado');
      }
      
      const pageData = await response.json();
      console.log('📄 Información de la página:', pageData);
      
      return {
        pageId: pageData.id,
        pageName: pageData.name || 'Página de Facebook',
        instagramAccountId: pageData.instagram_business_account?.id || null
      };
    } catch (error) {
      console.error('❌ Error obteniendo info de la página:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive"
      });
      return;
    }

    if (keywords.length === 0) {
      toast({
        title: "Error", 
        description: "Debes agregar al menos una palabra clave",
        variant: "destructive"
      });
      return;
    }

    if (!dmMessage.trim()) {
      toast({
        title: "Error",
        description: "El mensaje DM es requerido",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('💾 Guardando autoresponder de comentarios...');

      // Obtener información de la página usando el Page Access Token
      let userId = 'temp-user-id'; // Fallback por defecto
      
      try {
        const pageInfo = await getPageInfo();
        // Usar el ID de la página como identificador único
        userId = `page_${pageInfo.pageId}`;
        console.log('✅ Página identificada:', {
          userId,
          pageName: pageInfo.pageName,
          instagramAccountId: pageInfo.instagramAccountId
        });
      } catch (error) {
        console.log('⚠️ Error obteniendo info de la página - usando ID temporal:', error);
        // Usar token como identificador si no podemos obtener la info de la página
        const token = localStorage.getItem('hower-instagram-token');
        if (token) {
          // Usar los primeros caracteres del token como identificador único
          userId = `token_${token.substring(0, 20)}`;
        }
      }

      const { data, error } = await supabase
        .from('comment_autoresponders')
        .insert({
          user_id: userId,
          post_id: selectedPost.id,
          post_url: selectedPost.permalink,
          post_caption: selectedPost.caption,
          name: name.trim(),
          keywords: keywords,
          dm_message: dmMessage.trim(),
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error guardando:', error);
        throw error;
      }

      console.log('✅ Autoresponder guardado:', data);

      toast({
        title: "¡Autoresponder creado!",
        description: `Se configuró para detectar comentarios en el post seleccionado`,
      });

      // Llamar callback de éxito
      onSubmit({
        name: name.trim(),
        keywords,
        dmMessage: dmMessage.trim(),
        postId: selectedPost.id,
        postUrl: selectedPost.permalink,
        postCaption: selectedPost.caption
      });

    } catch (error) {
      console.error('❌ Error:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el autoresponder",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle className="text-purple-900">
              Configurar Autoresponder para Comentarios
            </CardTitle>
            <p className="text-sm text-purple-700 mt-1">
              Detectar palabras clave en comentarios y enviar DM automático
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Post Seleccionado */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Post Seleccionado
          </h3>
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={selectedPost.thumbnail_url || selectedPost.media_url} 
                alt="Post thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 mb-1">
                {formatPostDate(selectedPost.timestamp)}
              </p>
              <p className="text-sm text-gray-800 line-clamp-2">
                {truncateCaption(selectedPost.caption, 120)}
              </p>
              <a 
                href={selectedPost.permalink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-1"
              >
                Ver post <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre del Autoresponder */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nombre del Autoresponder
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Respuesta para lead magnet"
              className="mt-1"
              required
            />
          </div>

          {/* Palabras Clave */}
          <div>
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Palabras Clave para Detectar
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Cuando un comentario contenga alguna de estas palabras, se enviará el DM automáticamente
            </p>
            
            <div className="flex gap-2 mb-3">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe una palabra clave..."
                className="flex-1"
              />
              <Button type="button" onClick={addKeyword} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => removeKeyword(index)}
                  />
                </Badge>
              ))}
              {keywords.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No se han agregado palabras clave
                </p>
              )}
            </div>
          </div>

          {/* Mensaje DM */}
          <div>
            <Label htmlFor="dmMessage" className="text-sm font-medium text-gray-700">
              Mensaje DM Automático
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Este mensaje se enviará por DM cuando se detecte una palabra clave
            </p>
            <Textarea
              id="dmMessage"
              value={dmMessage}
              onChange={(e) => setDmMessage(e.target.value)}
              placeholder="¡Hola! Vi tu comentario y me gustaría enviarte más información..."
              rows={4}
              className="mt-1"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {dmMessage.length}/1000 caracteres
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || keywords.length === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Autoresponder
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CommentAutoresponderForm;
