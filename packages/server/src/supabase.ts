import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY 가 비어있습니다. .env 파일을 확인하세요.'
  );
}

// 서버는 service_role 키로 RLS를 우회한다.
export const supabase = createClient(url, key ?? '', {
  auth: { persistSession: false, autoRefreshToken: false }
});
