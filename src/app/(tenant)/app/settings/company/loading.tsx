import { FormPageSkeleton } from '@/components/tenant/LoadingShapes';

/** Shape shared across the tenant settings screens — see LoadingShapes
 *  for why these are not fourteen bespoke files. */
export default function Loading() {
  return <FormPageSkeleton label="Loading company details" />;
}
