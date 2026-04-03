import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

// 1. Clerk Authentication Matchers
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/api/inngest(.*)',
  '/api/public/(.*)',
  '/api/webhooks/(.*)',
  '/i/(.*)', // Short interview links
  '/c/(.*)', // Public case study slugs
  '/interview/(.*)', // Public interview links
  '/', // Landing
])

// API routes that require authentication (everything except public/webhooks/inngest)
const isProtectedAPI = createRouteMatcher([
  "/api/analytics(.*)",
  "/api/assistant(.*)",
  "/api/billing(.*)",
  "/api/case-studies(.*)",
  "/api/danger(.*)",
  "/api/deals(.*)",
  "/api/domain(.*)",
  "/api/events(.*)",
  "/api/feedback(.*)",
  "/api/integrations(.*)",
  "/api/interviews(.*)",
  "/api/jobs(.*)",
  "/api/notifications(.*)",
  "/api/onboard(.*)",
  "/api/org(.*)",
  "/api/org-profile(.*)",
  "/api/settings(.*)",
  "/api/subscription(.*)",
  "/api/team(.*)",
  "/api/usage(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl
  const hostname = req.headers.get('host') || ''
  const identifier = req.headers.get('x-forwarded-for') || '127.0.0.1'

  // A. Public Route Rate Limiting (DDoS Protection)
  if (isPublicRoute(req)) {
    const { success } = await checkRateLimit(identifier, 60, '1 m');
    if (!success) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // B. Branded Short Links (/i/[token] -> /interview/[token])
  if (url.pathname.startsWith('/i/')) {
    const token = url.pathname.split('/')[2];
    if (token) {
      return NextResponse.rewrite(new URL(`/interview/${token}`, req.url));
    }
  }

  // C. Custom Domain Routing (Rewrite Logic)
  const isMainDomain = hostname.includes('localhost') || hostname.includes('auricai.tech') || hostname.includes('caseflow.so')
  
  if (!isMainDomain && !url.pathname.startsWith('/api')) {
    return NextResponse.rewrite(new URL(`/public-site/${hostname}${url.pathname}`, req.url))
  }

  // D. Security Isolation (Clerk Auth)
  if (!isPublicRoute(req) || isProtectedAPI(req)) {
    // For API routes: let the route handler manage auth (returns JSON errors).
    // auth.protect() would redirect to sign-in HTML, breaking fetch() calls.
    if (url.pathname.startsWith('/api/')) {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }
    } else {
      await auth.protect()
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
