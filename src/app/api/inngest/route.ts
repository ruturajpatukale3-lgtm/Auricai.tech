import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

// Next.js Route Handler for Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
