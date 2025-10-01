import React from 'react';
import { useHistory } from 'react-router-dom';
import { Card, CardBody, Input, Button, Checkbox, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { motion } from 'framer-motion';

/**
 * CONFIGURACIÓN DE USUARIOS DEMO
 * Estos usuarios coinciden EXACTAMENTE con los creados en storage-service.ts
 * 
 * ESTRUCTURA:
 * - key: Identificador único del botón
 * - nombre: Nombre del rol mostrado en UI
 * - email: Email REAL del usuario en el sistema
 * - password: Contraseña REAL del usuario en el sistema
 * - icono: Icono visual del botón
 * - descripcion: Texto descriptivo corto
 */
interface DemoUser {
  key: string;
  nombre: string;
  email: string;
  password: string;
  icono: string;
  descripcion: string;
}

const DEMO_USERS: DemoUser[] = [
  { 
    key: 'admin',
    nombre: 'Admin', 
    email: 'admin@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:shield',
    descripcion: 'Acceso total al sistema'
  },
  { 
    key: 'coadmin',
    nombre: 'Co-Admin', 
    email: 'coadmin@kuhub.cl',
    password: 'coadmin123',
    icono: 'lucide:shield-check',
    descripcion: 'Casi todos los permisos'
  },
  { 
    key: 'gestor',
    nombre: 'Gestor de Pedidos', 
    email: 'gestor@kuhub.cl',
    password: 'gestor123',
    icono: 'lucide:shopping-cart',
    descripcion: 'Gestión de pedidos'
  },
  { 
    key: 'profesor',
    nombre: 'Profesor', 
    email: 'profesor@kuhub.cl',
    password: 'profesor123',
    icono: 'lucide:book',
    descripcion: 'Solicitudes y consultas'
  },
  { 
    key: 'bodega',
    nombre: 'Bodega', 
    email: 'bodega@kuhub.cl',
    password: 'bodega123',
    icono: 'lucide:package',
    descripcion: 'Control de inventario'
  },
  { 
    key: 'asistente',
    nombre: 'Asistente', 
    email: 'asistente@kuhub.cl',
    password: 'asistente123',
    icono: 'lucide:warehouse',
    descripcion: 'Bodega en tránsito'
  }
];

/**
 * COMPONENTE: Página de Login
 * 
 * FLUJO DE AUTENTICACIÓN:
 * 1. Usuario selecciona un demo O ingresa credenciales manualmente
 * 2. Al hacer submit, llama a login(email, password) del AuthContext
 * 3. AuthContext llama a loginService() que valida contra localStorage
 * 4. Si es exitoso, guarda token y user en localStorage
 * 5. Redirige al dashboard
 * 
 * CARACTERÍSTICAS:
 * - Validación de campos requeridos
 * - Manejo de errores visuales
 * - Loading state durante autenticación
 * - Botones demo pre-configurados
 * - Indicador visual del demo seleccionado
 */
const LoginPage: React.FC = () => {
  // ESTADOS DEL FORMULARIO
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [recordar, setRecordar] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = React.useState<string | null>(null);
  
  // CONTEXTO DE AUTENTICACIÓN
  const { login } = useAuth();
  const history = useHistory();

  /**
   * MANEJADOR: Submit del formulario
   * 
   * PROCESO:
   * 1. Prevenir comportamiento default del form
   * 2. Validar que los campos no estén vacíos
   * 3. Activar loading state
   * 4. Llamar a la función login() del contexto
   * 5. Si exitoso → Redirigir al dashboard
   * 6. Si falla → Mostrar error
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica de campos
    if (!email || !password) {
      setError('Por favor, complete todos los campos');
      return;
    }
    
    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingrese un email válido');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔐 Intentando login con:', email);
      
      // Llamar al servicio de autenticación
      const success = await login(email, password);
      
      if (success) {
        console.log('✅ Login exitoso, redirigiendo...');
        // Redirigir al dashboard
        history.push('/');
      } else {
        // Login falló (credenciales incorrectas)
        setError('Email o contraseña incorrectos');
        console.log('❌ Credenciales inválidas');
      }
    } catch (err) {
      // Error en el proceso de login
      setError('Error al iniciar sesión. Intente nuevamente.');
      console.error('❌ Error de inicio de sesión:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * MANEJADOR: Selección de usuario demo
   * 
   * PROCESO:
   * 1. Buscar el usuario demo en el array DEMO_USERS
   * 2. Autocompletar email y password en los inputs
   * 3. Marcar visualmente cual demo está seleccionado
   * 4. Limpiar cualquier error previo
   * 
   * @param userKey - Identificador del usuario demo seleccionado
   */
  const handleDemoSelect = (userKey: string) => {
    const demoUser = DEMO_USERS.find(user => user.key === userKey);
    
    if (demoUser) {
      console.log('👤 Demo seleccionado:', demoUser.nombre);
      setEmail(demoUser.email);
      setPassword(demoUser.password);
      setSelectedDemo(userKey);
      setError(null);
    }
  };

  /**
   * MANEJADOR: Limpiar selección de demo
   * Se activa cuando el usuario empieza a escribir manualmente
   */
  const handleManualInput = () => {
    setSelectedDemo(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="shadow-lg">
        <CardBody className="p-8">
          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-default-500">
              Ingrese sus credenciales para acceder
            </p>
          </div>

          {/* ALERTA DE ERROR */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-danger-50 border border-danger-200 text-danger-700 p-3 rounded-lg mb-4 flex items-start gap-2"
            >
              <Icon icon="lucide:alert-circle" className="text-xl flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* INDICADOR DE DEMO SELECCIONADO */}
          {selectedDemo && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-primary-50 border border-primary-200 text-primary-700 p-3 rounded-lg mb-4 flex items-start gap-2"
            >
              <Icon icon="lucide:info" className="text-xl flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Cuenta demo:</strong>{' '}
                {DEMO_USERS.find(u => u.key === selectedDemo)?.nombre}
              </div>
            </motion.div>
          )}

          {/* FORMULARIO DE LOGIN */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* INPUT EMAIL */}
            <Input
              label="Correo Electrónico"
              type="email"
              value={email}
              onValueChange={(value) => {
                setEmail(value);
                handleManualInput();
              }}
              placeholder="correo@ejemplo.com"
              startContent={
                <Icon icon="lucide:mail" className="text-default-400 text-xl" />
              }
              isRequired
              isDisabled={isLoading}
              variant="bordered"
              classNames={{
                input: "text-sm",
                label: "text-sm font-medium"
              }}
            />

            {/* INPUT PASSWORD */}
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onValueChange={(value) => {
                setPassword(value);
                handleManualInput();
              }}
              placeholder="••••••••"
              startContent={
                <Icon icon="lucide:lock" className="text-default-400 text-xl" />
              }
              isRequired
              isDisabled={isLoading}
              variant="bordered"
              classNames={{
                input: "text-sm",
                label: "text-sm font-medium"
              }}
            />

            {/* OPCIONES ADICIONALES */}
            <div className="flex items-center justify-between">
              <Checkbox 
                isSelected={recordar} 
                onValueChange={setRecordar}
                isDisabled={isLoading}
                size="sm"
              >
                <span className="text-sm text-default-600">Recordar sesión</span>
              </Checkbox>
              <Button 
                variant="light" 
                size="sm" 
                className="text-primary text-sm font-medium"
                isDisabled={isLoading}
              >
                ¿Olvidó su contraseña?
              </Button>
            </div>

            {/* BOTÓN DE SUBMIT */}
            <Button
              type="submit"
              color="primary"
              className="w-full font-semibold"
              size="lg"
              isLoading={isLoading}
              isDisabled={isLoading}
              startContent={!isLoading && <Icon icon="lucide:log-in" className="text-xl" />}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <Divider className="my-6" />

          {/* SECCIÓN DE CUENTAS DEMO */}
          <div className="space-y-4">
            {/* HEADER DE DEMOS */}
            <div className="text-center">
              <p className="text-sm font-medium text-default-700 mb-1">
                Acceso Rápido - Cuentas Demo
              </p>
              <p className="text-xs text-default-500">
                Haz clic en cualquier rol para autocompletar las credenciales
              </p>
            </div>
            
            {/* GRID DE BOTONES DEMO */}
            <div className="grid grid-cols-2 gap-3">
              {DEMO_USERS.map((demoUser) => (
                <Button 
                  key={demoUser.key}
                  variant={selectedDemo === demoUser.key ? "solid" : "bordered"}
                  color={selectedDemo === demoUser.key ? "primary" : "default"}
                  size="lg"
                  onPress={() => handleDemoSelect(demoUser.key)}
                  isDisabled={isLoading}
                  className="h-auto py-3 px-3"
                >
                  <div className="flex items-start gap-2 w-full">
                    <Icon 
                      icon={demoUser.icono} 
                      className="text-xl flex-shrink-0 mt-0.5" 
                    />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs font-semibold">
                        {demoUser.nombre}
                      </span>
                      <span className="text-xs text-default-500 font-normal">
                        {demoUser.descripcion}
                      </span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            {/* INFORMACIÓN ADICIONAL */}
            <div className="bg-default-100 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <Icon 
                  icon="lucide:lightbulb" 
                  className="text-warning text-lg flex-shrink-0 mt-0.5" 
                />
                <p className="text-xs text-default-600 leading-relaxed">
                  <strong>Tip:</strong> Los permisos de cada rol pueden modificarse 
                  en tiempo real desde "Gestión de Roles". Los cambios se aplican 
                  inmediatamente a todos los usuarios con ese rol.
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

export default LoginPage;