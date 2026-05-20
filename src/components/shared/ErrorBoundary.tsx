import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted p-8">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center text-danger text-2xl">
            ⚠
          </div>
          <h2 className="text-lg font-semibold text-text-primary">發生了意外錯誤</h2>
          <p className="text-sm text-center max-w-md text-text-secondary">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
