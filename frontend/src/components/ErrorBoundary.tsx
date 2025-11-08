/**
 * ERROR BOUNDARY
 * Captura errores de React y muestra una UI de fallback
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { Icon } from '@iconify/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error (solo en desarrollo)
    if (import.meta.env.DEV) {
      console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Aquí podrías enviar el error a un servicio de logging
    // Ej: Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="flex flex-col items-center gap-2 pb-4">
              <Icon 
                icon="lucide:alert-circle" 
                className="text-danger text-6xl" 
              />
              <h1 className="text-2xl font-bold text-danger">
                Algo salió mal
              </h1>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-default-600 text-center">
                Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta recargar la página.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <div className="mt-4 p-4 bg-danger-50 rounded-lg">
                  <p className="text-sm font-mono text-danger-800 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-danger-700">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-60 p-2 bg-danger-100 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center mt-6">
                <Button
                  color="primary"
                  variant="solid"
                  onPress={this.handleReload}
                  startContent={<Icon icon="lucide:refresh-cw" />}
                >
                  Recargar Página
                </Button>
                <Button
                  color="default"
                  variant="bordered"
                  onPress={this.handleReset}
                  startContent={<Icon icon="lucide:undo" />}
                >
                  Intentar de Nuevo
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

