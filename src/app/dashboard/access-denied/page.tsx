export default function AccessDeniedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-muted-foreground text-lg mb-6">
                You do not have permission to view this page.
            </p>
            <a href="/dashboard" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Return to Dashboard
            </a>
        </div>
    );
}
