"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <Card className="glass max-w-md p-8 text-center">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.message || "An unexpected error occurred."}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => this.setState({ hasError: false, message: undefined })}
            >
              Try again
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
