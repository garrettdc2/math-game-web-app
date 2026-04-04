import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SSEProvider } from "@/hooks/use-sse";
import { useToastNotifications } from "@/hooks/use-toasts";
import { ConnectionStatus } from "@/components/connection-status";
import { Topbar } from "@/components/topbar";
import DashboardPage from "@/pages/dashboard";
import PipelinePage from "@/pages/pipeline";
import NewPipelinePage from "@/pages/new-pipeline";

function AppShell() {
  useToastNotifications();

  return (
    <div className="min-h-screen">
      <Topbar />
      <div className="fixed top-3 right-4 z-50">
        <ConnectionStatus />
      </div>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pipeline/:taskId" element={<PipelinePage />} />
        <Route path="/new" element={<NewPipelinePage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SSEProvider>
        <AppShell />
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--color-elevated)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--color-text-primary)",
            },
          }}
        />
      </SSEProvider>
    </BrowserRouter>
  );
}
