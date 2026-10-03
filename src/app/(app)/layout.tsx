import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: any = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) {
      redirect('/login');
    }
  } else {
    const cookieStore = await cookies();
    const hasDemo = cookieStore.get('demo_session')?.value === 'true';
    if (!hasDemo) {
      redirect('/login');
    }
    user = {
      id: 'demo-admin-id',
      email: 'admin@timesgroup.com',
      user_metadata: { name: 'TOI Admin' },
    };
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
