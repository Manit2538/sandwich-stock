import { requireStore } from '@/lib/supabase/queries';
import ExpensesClient from './ExpensesClient';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const { storeId } = await requireStore();
  return <ExpensesClient storeId={storeId} />;
}
