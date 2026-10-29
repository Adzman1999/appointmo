import { query } from '../db';

export async function listServicesWithRatings(businessId: string) {
  const result = await query(
    `SELECT s.id, s.name, s.description, s.duration_minutes, s.price, s.category,
            COALESCE(service_reviews.rating, 0)::numeric(3, 1) AS service_rating,
            COALESCE(service_reviews.review_count, 0)::int AS service_review_count
     FROM services s
     LEFT JOIN LATERAL (
       SELECT AVG(r.rating) AS rating, COUNT(*) AS review_count
       FROM reviews r WHERE r.service_id = s.id
     ) service_reviews ON true
     WHERE s.business_id = $1 AND s.is_active = true`,
    [businessId]
  );
  return result.rows;
}

export async function getBusinessRatingSummary(businessId: string) {
  const result = await query(
    'SELECT COALESCE(AVG(rating), 0)::numeric(3, 1) AS rating, COUNT(*)::int AS "reviewCount" FROM reviews WHERE business_id = $1',
    [businessId]
  );
  return result.rows[0];
}

export async function listStaffRatingSummaries(businessId: string) {
  const result = await query(
    `SELECT staff_id AS "staffId", AVG(staff_rating)::numeric(3, 1) AS rating, COUNT(*)::int AS "reviewCount"
     FROM reviews
     WHERE business_id = $1 AND staff_id IS NOT NULL AND staff_rating IS NOT NULL
     GROUP BY staff_id`,
    [businessId]
  );
  return result.rows;
}
