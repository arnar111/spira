import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Þegar þetta gildi breytist (t.d. pathname) er villustaðan hreinsuð, svo
   * að notandi kemst áfram með því að fletta á aðra síðu.
   */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[spira] óvænt villa í viðmóti', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center"
        style={{ color: 'var(--cream-100)' }}
      >
        <div className="sp-display" style={{ fontSize: 24, letterSpacing: '-0.015em' }}>
          Eitthvað fór úrskeiðis
        </div>
        <p className="text-sm" style={{ color: 'var(--cream-300)', maxWidth: 360 }}>
          Þetta var ekki þér að kenna. Gögnin þín eru örugg á tækinu — prófaðu að
          endurhlaða síðunni.
        </p>
        <Button onClick={() => window.location.reload()}>Endurhlaða</Button>
        <pre
          className="sp-mono max-w-full overflow-x-auto rounded-lg px-4 py-3 text-left text-[11px]"
          style={{
            color: 'var(--terra-300)',
            background: 'rgba(231,217,168,0.06)',
            border: '1px solid rgba(231,217,168,0.12)',
          }}
        >
          {error.message || String(error)}
        </pre>
      </div>
    );
  }
}
