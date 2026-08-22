import React from 'react';
import { ServerErrorPage } from '../pages/ErrorPages';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Keep the user-facing page generic while retaining a console trace for local diagnosis.
    console.error('واجهة النظام واجهت خطأ غير متوقع:', error, errorInfo);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return <ServerErrorPage />;
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
