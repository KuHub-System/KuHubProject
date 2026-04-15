import React from 'react';
import { useHistory } from 'react-router-dom';
import { Card, CardBody, Input, Button, Checkbox, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CONFIGURACIÓN DE USUARIOS DEMO - ACTUALIZADOS
 * ✅ Ahora coinciden con los usuarios hasheados creados en la BD
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
    nombre: 'Administrador',
    email: 'adminhash@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:shield',
    descripcion: 'Acceso total'
  },
  {
    key: 'coadmin',
    nombre: 'Co-Admin',
    email: 'coadminhash@kubhub.cl',
    password: 'admin123',
    icono: 'lucide:shield-check',
    descripcion: 'Casi todo'
  },
  {
    key: 'gestor',
    nombre: 'Gestor',
    email: 'gestorhash@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:shopping-cart',
    descripcion: 'Pedidos'
  },
  {
    key: 'profesor',
    nombre: 'Prof. a Cargo',
    email: 'profesorcargohash@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:book-open',
    descripcion: 'Académico'
  },
  {
    key: 'docente',
    nombre: 'Docente',
    email: 'docentehash@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:graduation-cap',
    descripcion: 'Solicitudes'
  },
  {
    key: 'bodega',
    nombre: 'Enc. Bodega',
    email: 'bodegahash@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:package',
    descripcion: 'Inventario'
  },
  {
    key: 'asistente',
    nombre: 'Asist. Bodega',
    email: 'asisbodegahash@kuhub.cl',
    password: 'admin123',
    icono: 'lucide:warehouse',
    descripcion: 'Tránsito'
  }
];

const IS_LOCAL = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const LoginPage: React.FC = () => {
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [recordar, setRecordar] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = React.useState<string | null>(null);
  const [irisOpen,     setIrisOpen]     = React.useState<boolean>(false);

  const { login } = useAuth();
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Por favor, complete todos los campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingrese un email válido');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 Intentando login con:', email);

      const success = await login(email, password);

      if (success) {
        console.log('✅ Login exitoso, iniciando transición...');
        setIrisOpen(true);
      } else {
        setError('Email o contraseña incorrectos');
        console.log('❌ Credenciales inválidas');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intente nuevamente.');
      console.error('❌ Error de inicio de sesión:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleManualInput = () => {
    setSelectedDemo(null);
  };

  return (
    <div className="font-sans w-full">
      {/* Contenido */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card
          className="shadow-xl border-t-4 border-primary"
          classNames={{
            base: "bg-white dark:bg-content1",
            body: "bg-white dark:bg-content1",
          }}
        >
          <CardBody className="px-8 pt-8 pb-6">

            {/* ── Logo y título ── */}
            <div className="text-center mb-5">
              <img
                src="/nrelogoo-Photoroom.png"
                alt="KuHub"
                className="mx-auto h-32 w-32 mb-3 drop-shadow-md"
              />
              <h2 className="text-3xl font-extrabold text-secondary dark:text-foreground tracking-tight">
                KuHub
              </h2>
              <p className="mt-1 text-sm text-default-500">
                Gestión de Bodega e Inventario{' '}
                <span className="font-bold text-primary-600 dark:text-primary">DuocUC</span>
              </p>
            </div>

            <Divider className="mb-5" />

            {/* ── Subtítulo del form ── */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-secondary dark:text-foreground">
                Iniciar Sesión
              </h1>
              <p className="text-sm text-default-500 mt-0.5">
                Ingrese sus credenciales para acceder al sistema
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-4 bg-danger-50 dark:bg-danger-50/10 border border-danger-200 dark:border-danger-100/20 text-danger-700 dark:text-danger-400 p-3 rounded-lg flex items-start gap-2"
              >
                <Icon icon="lucide:alert-circle" className="text-xl flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <Input
                label="Correo Electrónico"
                type="email"
                value={email}
                onValueChange={(value) => { setEmail(value); handleManualInput(); }}
                placeholder="correo@duoc.cl"
                startContent={<Icon icon="lucide:mail" className="text-default-400 text-lg" />}
                isRequired
                isDisabled={isLoading}
                variant="bordered"
                classNames={{
                  input: "text-sm dark:text-foreground",
                  label: "text-sm font-medium text-default-600 dark:text-default-400",
                  inputWrapper: "bg-default-50 dark:bg-default-100/50 hover:bg-default-100 dark:hover:bg-default-100 transition-colors border-default-200 dark:border-default-100"
                }}
              />

              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onValueChange={(value) => { setPassword(value); handleManualInput(); }}
                placeholder="••••••••"
                startContent={<Icon icon="lucide:lock" className="text-default-400 text-lg" />}
                endContent={
                  <button
                    type="button"
                    tabIndex={-1}
                    className="text-default-400 hover:text-default-600 dark:hover:text-default-300 transition-colors focus:outline-none"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} className="text-lg" />
                  </button>
                }
                isRequired
                isDisabled={isLoading}
                variant="bordered"
                classNames={{
                  input: "text-sm dark:text-foreground",
                  label: "text-sm font-medium text-default-600 dark:text-default-400",
                  inputWrapper: "bg-default-50 dark:bg-default-100/50 hover:bg-default-100 dark:hover:bg-default-100 transition-colors border-default-200 dark:border-default-100"
                }}
              />

              <div className="flex items-center justify-between pt-1">
                <Checkbox
                  isSelected={recordar}
                  onValueChange={setRecordar}
                  isDisabled={isLoading}
                  size="sm"
                  classNames={{ label: "text-sm text-default-500" }}
                >
                  Recordar sesión
                </Checkbox>
                <Button
                  variant="light"
                  size="sm"
                  className="text-primary-600 dark:text-primary-400 text-sm font-medium h-auto p-0"
                  isDisabled={isLoading}
                >
                  ¿Olvidó su contraseña?
                </Button>
              </div>

              <Button
                type="submit"
                color="primary"
                className="w-full font-bold text-secondary shadow-md transform hover:scale-[1.02] transition-transform mt-1"
                size="lg"
                isLoading={isLoading}
                isDisabled={isLoading}
                startContent={!isLoading && <Icon icon="lucide:log-in" className="text-xl" />}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            {IS_LOCAL && (
              <>
                <Divider className="my-5" />
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-default-400 uppercase tracking-wider text-center">
                    Accesos Rápidos (Demo)
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {DEMO_USERS.map((user) => (
                      <Button
                        key={user.key}
                        variant={selectedDemo === user.key ? 'solid' : 'flat'}
                        color={selectedDemo === user.key ? 'primary' : 'default'}
                        size="sm"
                        className="flex flex-col h-auto py-2 gap-1 w-[calc(25%-6px)] min-w-0"
                        onPress={() => handleDemoSelect(user.key)}
                        isDisabled={isLoading}
                      >
                        <Icon icon={user.icono} className="text-lg" />
                        <span className="text-[11px] font-medium leading-tight text-center break-words whitespace-normal w-full">{user.nombre}</span>
                        <span className="text-[10px] opacity-70 text-center w-full">{user.descripcion}</span>
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-warning-50 dark:bg-warning-50/10 rounded-lg">
                    <Icon icon="lucide:info" className="text-warning-600 dark:text-warning-400 text-sm flex-shrink-0" />
                    <p className="text-xs text-warning-700 dark:text-warning-400">
                      Solo visible en localhost. En producción no aparece.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ── Copyright ── */}
            <Divider className="mt-5 mb-3" />
            <p className="text-center text-xs text-default-400">
              © {new Date().getFullYear()} KuHub · Sistema de Gestión Gastronómica DuocUC
            </p>

          </CardBody>
        </Card>
      </motion.div>

      {/* ── Animación de transición al entrar al sistema ── */}
      <AnimatePresence>
        {irisOpen && (
          <>
            {/* 1. Barrido dorado desde esquina inferior izquierda expandiéndose hacia arriba-derecha */}
            <motion.div
              initial={{ clipPath: 'polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)' }}
              animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              style={{
                position: 'fixed', inset: 0, zIndex: 98,
                background: 'linear-gradient(135deg, #FFB800 0%, #e09500 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* 2. Logo KuHub aparece en el centro con pop elástico */}
            <motion.div
              initial={{ opacity: 0, scale: 0.4, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1.1, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
              style={{
                position: 'fixed', top: '48%', left: '50%',
                zIndex: 99,
                pointerEvents: 'none',
              }}
            >
              <img
                src="/nrelogoo-Photoroom.png"
                alt="KuHub"
                style={{ width: 220, height: 220, objectFit: 'contain' }}
              />
            </motion.div>

            {/* 3. Fade a blanco → dispara la navegación al terminar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 1.1 }}
              onAnimationComplete={() => history.push('/')}
              style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: '#fff',
                pointerEvents: 'none',
              }}
            />
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LoginPage;