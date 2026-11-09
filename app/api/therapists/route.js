import { therapists } from '@/lib/data';

export async function GET() {
  return Response.json(therapists);
}
