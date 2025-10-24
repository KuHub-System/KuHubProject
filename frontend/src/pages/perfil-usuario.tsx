import React from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Input, 
  Button, 
  Avatar,
  Divider,
  Tabs,
  Tab
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/auth-context';
import { cambiarPasswordService, actualizarFotoPerfilService } from '../services/auth-service';
import { ICambioPassword } from '../types/user.types';

/**
 * Página de perfil de usuario.
 * Permite al usuario ver y editar su información personal.
 * 
 * @returns {JSX.Element} La página de perfil de usuario.
 */
const PerfilUsuarioPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<string>("informacion");

  // Variantes para las animaciones con Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="container mx-auto px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Encabezado */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold mb-2">Perfil de Usuario</h1>
          <p className="text-default-500">
            Visualice y actualice su información personal.
          </p>
        </motion.div>

        {/* Tarjeta de perfil */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4">
              <Tabs 
                selectedKey={activeTab} 
                onSelectionChange={setActiveTab as any}
                aria-label="Opciones de perfil"
                color="primary"
                variant="underlined"
              >
                <Tab key="informacion" title="Información Personal" />
                <Tab key="seguridad" title="Seguridad" />
              </Tabs>
            </CardHeader>
            <CardBody className="px-4 py-6">
              {activeTab === "informacion" ? (
                <InformacionPersonal user={user} />
              ) : (
                <Seguridad />
              )}
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

/**
 * Componente que muestra la información personal del usuario.
 * 
 * @param {object} props - Propiedades del componente.
 * @param {IUser | null} props.user - Datos del usuario.
 * @returns {JSX.Element} El componente de información personal.
 */
const InformacionPersonal: React.FC<{ user: any }> = ({ user }) => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>(user?.fotoPerfil);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Maneja la selección de un archivo para la foto de perfil.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - Evento de cambio del input de archivo.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor, seleccione un archivo de imagen válido');
      return;
    }
    
    try {
      setIsLoading(true);
      const newAvatarUrl = await actualizarFotoPerfilService(file);
      setAvatarUrl(newAvatarUrl);
    } catch (error) {
      console.error('Error al actualizar la foto de perfil:', error);
      alert('Error al actualizar la foto de perfil');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Abre el diálogo de selección de archivo.
   */
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Foto de perfil */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <Avatar
            src={avatarUrl}
            name={user?.nombre || "Usuario"}
            className="w-24 h-24 text-large"
          />
          <Button
            isIconOnly
            size="sm"
            color="primary"
            className="absolute bottom-0 right-0"
            onPress={handleAvatarClick}
            isLoading={isLoading}
          >
            <Icon icon="lucide:camera" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <p className="mt-2 text-sm text-default-500">
          Haga clic en el ícono para cambiar su foto de perfil
        </p>
      </div>

      <Divider />

      {/* Información del usuario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-default-500 mb-1">Nombre</p>
          <p className="font-semibold">{user?.nombre || "No disponible"}</p>
        </div>
        <div>
          <p className="text-sm text-default-500 mb-1">Correo Electrónico</p>
          <p className="font-semibold">{user?.email || "No disponible"}</p>
        </div>
        <div>
          <p className="text-sm text-default-500 mb-1">Rol</p>
          <p className="font-semibold">{user?.rol || "No disponible"}</p>
        </div>
        <div>
          <p className="text-sm text-default-500 mb-1">Último Acceso</p>
          <p className="font-semibold">
            {user?.ultimoAcceso 
              ? new Date(user.ultimoAcceso).toLocaleString('es-CL') 
              : "No disponible"}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente que permite al usuario cambiar su contraseña.
 * 
 * @returns {JSX.Element} El componente de seguridad.
 */
const Seguridad: React.FC = () => {
  const [formData, setFormData] = React.useState<ICambioPassword>({
    passwordActual: '',
    passwordNueva: '',
    confirmarPassword: ''
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  /**
   * Actualiza el estado del formulario cuando cambia un campo.
   * 
   * @param {string} field - Campo del formulario.
   * @param {string} value - Nuevo valor.
   */
  const handleChange = (field: keyof ICambioPassword, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Resetear mensajes
    setError(null);
    setSuccess(false);
  };

  /**
   * Maneja el envío del formulario de cambio de contraseña.
   * 
   * @param {React.FormEvent} e - Evento del formulario.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.passwordActual || !formData.passwordNueva || !formData.confirmarPassword) {
      setError('Por favor, complete todos los campos');
      return;
    }
    
    if (formData.passwordNueva !== formData.confirmarPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    
    if (formData.passwordNueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await cambiarPasswordService(formData);
      
      setSuccess(true);
      setFormData({
        passwordActual: '',
        passwordNueva: '',
        confirmarPassword: ''
      });
    } catch (error: any) {
      setError(error.message || 'Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Cambiar Contraseña</h3>
        
        {error && (
          <div className="bg-danger-100 text-danger p-3 rounded-md mb-4 text-sm">
            <Icon icon="lucide:alert-circle" className="inline-block mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-success-100 text-success p-3 rounded-md mb-4 text-sm">
            <Icon icon="lucide:check-circle" className="inline-block mr-2" />
            Contraseña actualizada correctamente
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            label="Contraseña Actual"
            placeholder="Ingrese su contraseña actual"
            value={formData.passwordActual}
            onValueChange={(value) => handleChange('passwordActual', value)}
          />
          
          <Input
            type="password"
            label="Nueva Contraseña"
            placeholder="Ingrese su nueva contraseña"
            value={formData.passwordNueva}
            onValueChange={(value) => handleChange('passwordNueva', value)}
          />
          
          <Input
            type="password"
            label="Confirmar Nueva Contraseña"
            placeholder="Confirme su nueva contraseña"
            value={formData.confirmarPassword}
            onValueChange={(value) => handleChange('confirmarPassword', value)}
          />
          
          <div className="pt-2">
            <Button 
              type="submit" 
              color="primary"
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              Cambiar Contraseña
            </Button>
          </div>
        </form>
      </div>
      
      <Divider />
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Seguridad de la Cuenta</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Verificación en dos pasos</p>
              <p className="text-sm text-default-500">
                Añade una capa adicional de seguridad a tu cuenta
              </p>
            </div>
            <Button color="primary" variant="flat">
              Configurar
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sesiones Activas</p>
              <p className="text-sm text-default-500">
                Administra tus sesiones activas en diferentes dispositivos
              </p>
            </div>
            <Button color="primary" variant="flat">
              Ver Sesiones
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilUsuarioPage;
