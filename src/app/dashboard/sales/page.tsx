import { SalesView } from '@/components/sales/SalesView';
import { PresenceTracker } from '@/components/PresenceTracker';

export default function SalesPage() {
    return (
        <div className="space-y-6">
            <PresenceTracker />
            <SalesView />
        </div>
    );
}
