import Sidebar from '@/components/Sidebar';
import { PresenceProvider } from '@/context/PresenceContext';
import { PermissionsProvider } from '@/context/PermissionsContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PermissionsProvider>
            <PresenceProvider>
                <div className="flex min-h-screen bg-background text-foreground">
                    <Sidebar />
                    <div className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
                        {/* Header would go here if we had one */}
                        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-secondary/10">
                            {children}
                        </main>
                    </div>
                </div>
            </PresenceProvider>
        </PermissionsProvider>
    );
}
