import { query } from '../db';

export async function listBusinesses(filters: { category?: string; search?: string }) {
  let sql = `
    SELECT
      b.id, b.name, b.slug, b.description, b.category, b.currency, b.timezone, b.logo_url AS "logoUrl",
      b.operational_status AS "operationalStatus",
      b.temporary_closure_reason AS "temporaryClosureReason",
      b.expected_reopen_at AS "expectedReopenAt",
      b.booking_policies AS "bookingPolicies",
      b.phone, b.email, b.address, b.city, b.opening_hours AS "openingHours",
      b.website, b.instagram, COALESCE(b.social_handle, b.instagram) AS "socialHandle", b.tagline,
      COUNT(DISTINCT br.id)::int AS "branchCount",
      COUNT(DISTINCT s.id)::int AS "serviceCount",
      MIN(s.price)::numeric AS "minPrice",
      MAX(s.price)::numeric AS "maxPrice",
      COALESCE(review_summary.rating, 0)::numeric(3, 1) AS "rating",
      COALESCE(review_summary."reviewCount", 0)::int AS "reviewCount"
    FROM businesses b
    LEFT JOIN branches br ON b.id = br.business_id AND br.is_active = true
    LEFT JOIN services s ON b.id = s.business_id AND s.is_active = true
    LEFT JOIN LATERAL (
      SELECT AVG(r.rating) AS rating, COUNT(*) AS "reviewCount"
      FROM reviews r
      WHERE r.business_id = b.id
    ) review_summary ON true
    WHERE 1=1
  `;
  const params: string[] = [];

  if (filters.category && filters.category !== 'all') {
    params.push(filters.category);
    sql += ` AND b.category ILIKE $${params.length}`;
  }

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    sql += ` AND (b.name ILIKE $${params.length} OR b.description ILIKE $${params.length} OR b.category ILIKE $${params.length})`;
  }

  sql += ` GROUP BY b.id, review_summary.rating, review_summary."reviewCount" ORDER BY "rating" DESC, "reviewCount" DESC, b.name ASC`;

  const result = await query(sql, params);
  return Promise.all(result.rows.map(async (business: any) => {
    const branches = await query(
      `SELECT id, name, address, city, phone, latitude, longitude,
              location_description AS "locationDescription"
       FROM branches
       WHERE business_id = $1 AND is_active = true`,
      [business.id]
    );
    return { ...business, branches: branches.rows };
  }));
}

export async function findBusinessBySlugOrId(slugOrId: string) {
  const result = await query(
    `SELECT b.id, b.name, b.slug, b.description, b.category, b.currency, b.timezone, b.logo_url AS "logoUrl",
            b.operational_status AS "operationalStatus",
            b.temporary_closure_reason AS "temporaryClosureReason",
            b.expected_reopen_at AS "expectedReopenAt",
            b.booking_policies AS "bookingPolicies",
            b.phone, b.email, b.address, b.city, b.opening_hours AS "openingHours",
            b.website, b.instagram, COALESCE(b.social_handle, b.instagram) AS "socialHandle", b.tagline
     FROM businesses b
     WHERE b.slug = $1 OR b.id::text = $1
     LIMIT 1`,
    [slugOrId]
  );
  return result.rows[0];
}

export async function listBusinessBranches(businessId: string) {
  const result = await query(
    `SELECT id, name, address, city, phone, latitude, longitude,
            location_description AS "locationDescription"
     FROM branches
     WHERE business_id = $1 AND is_active = true
     ORDER BY name ASC`,
    [businessId]
  );
  return result.rows;
}

export async function listBusinessServices(businessId: string) {
  const result = await query(
    `SELECT id, name, description, duration_minutes AS "durationMinutes", price, category,
            suitability_tags AS "suitabilityTags"
     FROM services
     WHERE business_id = $1 AND is_active = true
     ORDER BY price ASC`,
    [businessId]
  );
  return result.rows;
}

export async function listBusinessStaff(businessId: string) {
  const result = await query(
    `SELECT sp.id, sp.name, sp.bio, sp.avatar_url AS "avatarUrl",
            COALESCE(AVG(r.staff_rating), 0)::numeric(3, 1) AS "rating",
            COUNT(r.id)::int AS "reviewCount"
     FROM staff_profiles sp
     LEFT JOIN reviews r ON r.staff_id = sp.id AND r.staff_rating IS NOT NULL
     WHERE sp.business_id = $1 AND sp.is_active = true
     GROUP BY sp.id
     ORDER BY "rating" DESC, "reviewCount" DESC, sp.name ASC`,
    [businessId]
  );
  return result.rows;
}

export async function listBusinessReviews(businessId: string) {
  const result = await query(
    `SELECT r.id, r.customer_name AS "customerName", r.rating, r.staff_rating AS "staffRating",
            r.staff_id AS "staffId", sp.name AS "staffName", r.comment, r.created_at AS "createdAt"
     FROM reviews r
     LEFT JOIN staff_profiles sp ON r.staff_id = sp.id
     WHERE r.business_id = $1
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [businessId]
  );
  return result.rows;
}

export async function listBusinessCategories() {
  const result = await query('SELECT DISTINCT category FROM businesses ORDER BY category ASC');
  return result.rows.map((row: { category: string }) => row.category);
}
