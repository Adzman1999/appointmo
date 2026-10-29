import {
  findBusinessBySlugOrId,
  listBusinessBranches,
  listBusinessCategories,
  listBusinessReviews,
  listBusinessServices,
  listBusinessStaff,
  listBusinesses as listBusinessRecords,
} from '../repositories/discoveryRepository';

export function listBusinesses(filters: { category?: string; search?: string }) {
  return listBusinessRecords(filters);
}

export async function getBusinessDetails(slugOrId: string) {
  const business = await findBusinessBySlugOrId(slugOrId);
  if (!business) return null;

  const businessId = String(business.id);
  const branches = await listBusinessBranches(businessId);
  const services = await listBusinessServices(businessId);
  const staff = await listBusinessStaff(businessId);
  const reviews = await listBusinessReviews(businessId);

  return { ...business, branches, services, staff, reviews };
}

export function listCategories() {
  return listBusinessCategories();
}
