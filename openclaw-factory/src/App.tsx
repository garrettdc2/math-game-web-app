import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SSEProvider } from "@/hooks/use-sse";
import { useToastNotifications } from "@/hooks/use-toasts";
import { ConnectionStatus } from "@/components/connection-status";
import { Topbar } from "@/components/topbar";
import { Sidebar } from "@/components/sidebar";
import DashboardPage from "@/pages/dashboard";
import PipelinePage from "@/pages/pipeline";
import NewPipelinePage from "@/pages/new-pipeline";
import PipelineManagementPage from "@/pages/pipeline-management";

function AppShell() {
  useToastNotifications();

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 bg-surface overflow-auto">
        <Topbar />
        <div className="fixed top-3 right-4 z-50">
          <ConnectionStatus />
        </div>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pipelines" element={<PipelineManagementPage />} />
          <Route path="/pipeline/:taskId" element={<PipelinePage />} />
          <Route path="/new" element={<NewPipelinePage />} />
        </Routes>
      </main>
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
          theme="light"
          toastOptions={{
            style: {
              background: "var(--color-surface-container-lowest)",
              border: "1px solid var(--color-outline-ghost)",
              color: "var(--color-on-surface)",
            },
          }}
        />
      </SSEProvider>
    </BrowserRouter>
  );
}
