import { Inngest } from "inngest";

// Define strict event typings for the zero-gap system
export type Events = {
  "ai/generate_case_study": {
    data: {
      interviewId: string;
      orgId: string;
    };
  };
  "email/send_invite": {
    data: {
      interviewId: string;
      email: string;
      clientName: string | null;
      token: string;
      orgId: string;
    };
  };
  "email/send_reminder": {
    data: {
      interviewId: string;
      email: string;
      clientName: string | null;
      token: string;
      orgId: string;
    };
  };
  "domain/verify": {
    data: {
      domainId: string;
      domainString: string;
      orgId: string;
    };
  };
  "interview/started": {
    data: {
      interviewId: string;
      orgId: string;
    };
  };
};

// Create a client to send and receive events
export const inngest = new Inngest({ 
  id: "caseflow-backend",
  schemas: {
    // Inject the generic type definitions to strongly type `.send()` usages
    events: {} as Events,
  }
});
