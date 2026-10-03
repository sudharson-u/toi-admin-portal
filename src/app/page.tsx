import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function RootPage() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const isDemo = cookieStore.get('demo_session')?.value === 'true';
    if (isDemo) {
      redirect('/dashboard');
    } else {
      redirect('/login');
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
