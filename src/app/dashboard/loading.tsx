import GlobalDashboardSkeleton from "@/components/dashboard/SkeletonLoaders";

/**
 * Global Dashboard Loading State
 * 
 * Automatically triggered by Next.js during RSC resolution for any dashboard sub-page.
 * Ensures initial perceived performance is extremely high.
 */
export default function DashboardLoading() {
  return <GlobalDashboardSkeleton />;
}
