import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class Boundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed && typeof parsed === 'object' && 'error' in parsed) {
            errorMessage = `Database error: ${parsed.error}`;
          }
        }
      } catch {
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
          <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl border border-neutral-100 p-12 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-4">Application Exception</h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-neutral-800 transition-all shadow-lg"
            >
              Restart Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
