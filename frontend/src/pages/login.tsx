import React from 'react';
import { useHistory } from 'react-router-dom';
import { Card, CardBody, Input, Button, Checkbox, Divider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../contexts/auth-context';
import { motion } from 'framer-motion';

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
    email: 'ma.delarahash@kubhub.cl',
    password: 'matheusmago',
    icono: 'lucide:shield-check',
    descripcion: 'Casi todos los permisos'
  },
  {
    key: 'gestor',
    nombre: 'Gestor',
    email: 'gestorhash@kuhub.cl',
    password: 'gestor123',
    icono: 'lucide:shopping-cart',
    descripcion: 'Gestión de pedidos'
  },
  {
    key: 'profesor',
    nombre: 'Profesor',
    email: 'profesorhash@kuhub.cl',
    password: 'profesor123',
    icono: 'lucide:book',
    descripcion: 'Solicitudes'
  },
  {
    key: 'bodega',
    nombre: 'Bodega',
    email: 'bodegahash@kuhub.cl',
    password: 'bodega123',
    icono: 'lucide:package',
    descripcion: 'Inventario'
  },
  {
    key: 'asistente',
    nombre: 'Asistente',
    email: 'asistentehash@kuhub.cl',
    password: 'asistente123',
    icono: 'lucide:warehouse',
    descripcion: 'Tránsito'
  }
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [recordar, setRecordar] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = React.useState<string | null>(null);

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
        console.log('✅ Login exitoso, redirigiendo...');
        history.push('/');
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
    <div className="min-h-screen flex items-center justify-center bg-default-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-secondary dark:bg-content1 text-primary rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <Icon icon="lucide:package-open" width={32} height={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-secondary dark:text-foreground tracking-tight">
            KuHub
          </h2>
          <p className="mt-2 text-sm text-default-500">
            Gestión de Bodega e Inventario <span className="font-bold text-primary-600 dark:text-primary">DuocUC</span>
          </p>
        </div>

        <Card className="shadow-xl border-t-4 border-primary bg-white dark:bg-content1">
          <CardBody className="p-8 space-y-6">
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-secondary dark:text-foreground">
                Iniciar Sesión
              </h1>
              <p className="text-sm text-default-500">
                Ingrese sus credenciales para acceder al sistema
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-danger-50 dark:bg-danger-50/10 border border-danger-200 dark:border-danger-100/20 text-danger-700 dark:text-danger-400 p-3 rounded-lg flex items-start gap-2"
              >
                <Icon icon="lucide:alert-circle" className="text-xl flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{error}</span>
              </motion.div>
            )}


            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Correo Electrónico"
                type="email"
                value={email}
                onValueChange={(value) => {
                  setEmail(value);
                  handleManualInput();
                }}
                placeholder="correo@duoc.cl"
                startContent={
                  <Icon icon="lucide:mail" className="text-default-400 text-lg" />
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
                  <Icon icon="lucide:lock" className="text-default-400 text-lg" />
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

              <div className="flex items-center justify-between">
                <Checkbox
                  isSelected={recordar}
                  onValueChange={setRecordar}
                  isDisabled={isLoading}
                  size="sm"
                  classNames={{
                    label: "text-sm text-default-500"
                  }}
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
                className="w-full font-bold text-secondary shadow-md transform hover:scale-[1.02] transition-transform"
                size="lg"
                isLoading={isLoading}
                isDisabled={isLoading}
                startContent={!isLoading && <Icon icon="lucide:log-in" className="text-xl" />}
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

          </CardBody>
        </Card>

        <p className="text-center text-xs text-default-400">
          © {new Date().getFullYear()} KuHub - Sistema de Gestión Gastronómica DuocUC
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;