/**
 * Bookings API — future implementation
 * Will integrate with Cal.com, Calendly, or custom scheduling + Stripe.
 */
export async function POST(request) {
  const body = await request.json();

  // TODO: validate body, create booking record in Supabase, send confirmation email
  console.log('Booking request received:', body);

  return Response.json({ success: true, message: 'Booking received. We will be in touch shortly.' });
}
