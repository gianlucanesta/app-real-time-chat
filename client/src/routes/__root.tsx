import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { AuthContextType } from "../contexts/AuthContext";

interface MyRouterContext {
  auth: AuthContextType;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </ErrorBoundary>
  ),
});
