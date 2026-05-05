"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
          <div style={{ maxWidth: "32rem", width: "100%", margin: "0 1rem", padding: "1.5rem", background: "white", borderRadius: "0.75rem", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", textAlign: "center" }}>
            <div style={{ width: "4rem", height: "4rem", margin: "0 auto 1rem", background: "var(--cream)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle style={{ width: "2rem", height: "2rem", color: "var(--rose)" }} />
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>
              系统出现错误
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              {this.state.error?.message || "AI 服务暂时不可用，请稍后重试"}
            </p>
            <button
              onClick={this.handleRetry}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--accent)", color: "white", borderRadius: "0.5rem", cursor: "pointer", border: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
            >
              <RefreshCw style={{ width: "1rem", height: "1rem" }} />
              刷新重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;