import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Dashboard } from "@/pages/Dashboard";
import { Tasks } from "@/pages/Tasks";
import { Emails } from "@/pages/Emails";
import { Calendar } from "@/pages/Calendar";
import { Reports } from "@/pages/Reports";
import { Documents } from "@/pages/Documents";
import { Settings } from "@/pages/Settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { Toaster } from "@/components/ui/Toaster";
import { useCreateTask } from "@/hooks/useTasks";
import type { CreateTaskPayload } from "@/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10_000 },
  },
});

function AppShell() {
  const loadSettings = useSettingsStore((s) => s.load);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const createTask = useCreateTask();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function handleCreateTask(data: CreateTaskPayload) {
    createTask.mutate(data, { onSuccess: () => setNewTaskOpen(false) });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onNewTask={() => setNewTaskOpen(true)} />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
      <Toaster />
      <TaskFormDialog
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        onSubmit={handleCreateTask}
        loading={createTask.isPending}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
