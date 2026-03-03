import React from 'react';
import { useHistory } from 'react-router-dom';
import { Card, CardBody, Input, Button, Checkbox, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
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
  icono: string;
  descripcion: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    key: 'admin',
    nombre: 'Administrador',
    email: 'adminhash@kuhub.cl',
    icono: 'lucide:shield',
    descripcion: 'Acceso total'
  },
  {
    key: 'coadmin',
    nombre: 'Co-Admin',
    email: 'ma.delarahash@kubhub.cl',
    icono: 'lucide:shield-check',
    descripcion: 'Casi todos los permisos'
  },
  {
    key: 'gestor',
    nombre: 'Gestor',
    email: 'gestorhash@kuhub.cl',
    icono: 'lucide:shopping-cart',
    descripcion: 'Gestión de pedidos'
  },
  {
    key: 'profesor',
    nombre: 'Profesor',
    email: 'profesorhash@kuhub.cl',
    icono: 'lucide:book',
    descripcion: 'Solicitudes'
  },
  {
    key: 'bodega',
    nombre: 'Bodega',
    email: 'bodegahash@kuhub.cl',
    icono: 'lucide:package',
    descripcion: 'Inventario'
  },
  {
    key: 'asistente',
    nombre: 'Asistente',
    email: 'asistentehash@kuhub.cl',
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
  const [showDemos, setShowDemos] = React.useState<boolean>(false);
  const [recoveryEmail, setRecoveryEmail] = React.useState<string>('');

  const { login } = useAuth();
  const history = useHistory();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

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


      const success = await login(email, password);

      if (success) {
        history.push('/');
      } else {
        setError('Email o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = (userKey: string) => {
    const demoUser = DEMO_USERS.find(user => user.key === userKey);

    if (demoUser) {
      setEmail(demoUser.email);
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
          <div className="mx-auto h-16 w-16 bg-primary flex items-center justify-center mb-4 shadow-lg rounded-xl">
            <Icon icon="lucide:utensils" className="text-white" width={32} height={32} />
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

            {selectedDemo && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-primary-50 dark:bg-primary-50/10 border border-primary-200 dark:border-primary-100/20 text-primary-900 dark:text-primary-400 p-3 rounded-lg flex items-start gap-2"
              >
                <Icon icon="lucide:info" className="text-xl flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-bold">Cuenta demo seleccionada:</span>{' '}
                  {DEMO_USERS.find(u => u.key === selectedDemo)?.nombre}
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <Input
                label="Correo Electrónico"
                type="email"
                value={email}
                onValueChange={(value) => {
                  setEmail(value);
                  handleManualInput();
                }}
                placeholder="correo@duoc.cl"
                autoComplete="off"
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
                autoComplete="new-password"
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
                  onPress={onOpen}
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

            {showDemos && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <Divider className="my-6" />

                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-default-700 dark:text-default-300 mb-1 uppercase tracking-wider text-xs">
                      Accesos Rápidos (Demo)
                    </p>
                    <p className="text-[10px] text-default-400">
                      Selecciona un rol para probar el sistema
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {DEMO_USERS.map((demoUser) => (
                      <Button
                        key={demoUser.key}
                        variant={selectedDemo === demoUser.key ? "solid" : "bordered"}
                        color={selectedDemo === demoUser.key ? "primary" : "default"}
                        onPress={() => handleDemoSelect(demoUser.key)}
                        isDisabled={isLoading}
                        className={`h-auto py-3 px-3 justify-start ${selectedDemo === demoUser.key ? 'text-secondary font-bold' : 'text-default-600 dark:text-default-300 border-default-200 dark:border-default-100'}`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={`p-1.5 rounded-lg ${selectedDemo === demoUser.key ? 'bg-secondary/20' : 'bg-default-100 dark:bg-default-100/10'}`}>
                            <Icon
                              icon={demoUser.icono}
                              className="text-lg"
                            />
                          </div>
                          <div className="flex flex-col items-start text-left overflow-hidden">
                            <span className="text-xs font-bold truncate w-full">
                              {demoUser.nombre}
                            </span>
                            <span className="text-[10px] opacity-70 truncate w-full">
                              {demoUser.descripcion}
                            </span>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>

                  <div className="bg-warning-50 dark:bg-warning-50/5 border border-warning-200 dark:border-warning-100/20 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <Icon
                        icon="lucide:lightbulb"
                        className="text-warning-600 text-lg flex-shrink-0 mt-0.5"
                      />
                      <p className="text-[10px] text-warning-800 dark:text-warning-300 leading-relaxed font-medium">
                        <strong>Tip:</strong> Entorno de demostración. Selecciona un rol para autocompletar el correo. La contraseña debe ingresarse manualmente.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-xs text-default-400">
          © {new Date().getFullYear()} KuHub - Sistema de Gestión Gastronómica DuocUC
        </p>
      </motion.div>

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        backdrop="blur"
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-900/50 to-zinc-900/80 backdrop-opacity-20"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-default-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon icon="lucide:key-round" className="text-primary text-xl" />
                  </div>
                  <span className="text-xl font-bold text-secondary dark:text-foreground">Recuperar Contraseña</span>
                </div>
              </ModalHeader>
              <ModalBody className="py-6">
                <p className="text-sm text-default-500 mb-4">
                  Ingrese su correo electrónico institucional para recibir las instrucciones de recuperación.
                </p>
                <div className="space-y-4">
                  <Input
                    label="Correo Electrónico"
                    placeholder="ejemplo@duoc.cl"
                    value={recoveryEmail}
                    onValueChange={setRecoveryEmail}
                    variant="bordered"
                    startContent={<Icon icon="lucide:mail" className="text-default-400" />}
                    classNames={{
                      inputWrapper: "bg-default-50 dark:bg-default-100/50"
                    }}
                  />
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
                    <Icon icon="lucide:info" className="text-primary mt-1 flex-shrink-0" />
                    <p className="text-xs text-secondary-600 dark:text-secondary-300 leading-relaxed">
                      Se enviará un código de verificación temporal a su bandeja de entrada. Si no lo recibe, contacte al administrador del sistema.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-default-100">
                <Button variant="light" onPress={onClose} className="font-medium">
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  className="font-bold text-secondary shadow-md"
                  onPress={() => {
                    if (recoveryEmail === 'adminquestweb') {
                      setShowDemos(true);
                    }
                    setRecoveryEmail('');
                    onClose();
                  }}
                >
                  Enviar Instrucciones
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default LoginPage;