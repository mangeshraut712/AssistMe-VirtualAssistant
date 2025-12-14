import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Enhanced Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            eventId: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Store error info for display
        this.setState({
            errorInfo,
            eventId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

        // In production, you might send this to an error tracking service
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null, eventId: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-8 space-y-6 shadow-elevated scale-in">
                        {/* Error Icon with Animation */}
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center animate-pulse-subtle">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>

                        {/* Error Message */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                We're sorry, but something unexpected happened.
                                Don't worry, your data is safe.
                            </p>
                        </div>

                        {/* Event ID for support */}
                        {this.state.eventId && (
                            <div className="bg-muted/50 rounded-lg px-4 py-2 text-center">
                                <span className="text-xs text-muted-foreground font-mono">
                                    Error ID: {this.state.eventId}
                                </span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-all hover-lift focus-ring"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-all hover-lift focus-ring"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>

                        {/* Reload Button */}
                        <button
                            onClick={this.handleReload}
                            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                        >
                            Or reload the entire page
                        </button>

                        {/* Error Details (Collapsible) */}
                        {this.state.error && (
                            <details className="group">
                                <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                                    <Bug className="w-4 h-4" />
                                    <span>Technical Details</span>
                                    <span className="ml-auto text-xs opacity-60 group-open:hidden">Click to expand</span>
                                </summary>
                                <div className="mt-3 bg-muted/50 rounded-lg p-4 overflow-hidden">
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="text-xs font-medium text-foreground mb-1">Error Message</h4>
                                            <pre className="text-xs text-red-500 dark:text-red-400 whitespace-pre-wrap break-words font-mono bg-background/50 p-2 rounded">
                                                {this.state.error.toString()}
                                            </pre>
                                        </div>
                                        {this.state.errorInfo?.componentStack && (
                                            <div>
                                                <h4 className="text-xs font-medium text-foreground mb-1">Component Stack</h4>
                                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words font-mono bg-background/50 p-2 rounded max-h-40 overflow-auto scrollbar-thin">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </details>
                        )}

                        {/* Help Text */}
                        <p className="text-center text-xs text-muted-foreground">
                            If this problem persists, please{' '}
                            <a
                                href="https://github.com/mangeshraut712/AssistMe-VirtualAssistant/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                report an issue
                            </a>
                            {' '}with the error ID above.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
