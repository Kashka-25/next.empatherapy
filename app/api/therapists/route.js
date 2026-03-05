import { therapists } from '@/data/therapists';

export async function GET() {
  return Response.json(therapists);
}
