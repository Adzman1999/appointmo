import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// 1. List all active businesses with branch counts, service categories, and rating summaries
router.get('/businesses', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    let sql = `
      SELECT 
        b.id, b.name, b.slug, b.description, b.category, b.currency, b.timezone, b.logo_url AS "logoUrl",
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
    const params: any[] = [];

    if (category && typeof category === 'string' && category !== 'all') {
      params.push(category);
      sql += ` AND b.category ILIKE $${params.length}`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (b.name ILIKE $${params.length} OR b.description ILIKE $${params.length} OR b.category ILIKE $${params.length})`;
    }

    sql += ` GROUP BY b.id, review_summary.rating, review_summary."reviewCount" ORDER BY "rating" DESC, "reviewCount" DESC, b.name ASC`;

    const result = await query(sql, params);

    // Fetch branches for each business to support map pins
    const bizList = await Promise.all(result.rows.map(async (biz) => {
      const branchesRes = await query(`
        SELECT id, name, address, city, phone, latitude, longitude, location_description AS "locationDescription"
        FROM branches
        WHERE business_id = $1 AND is_active = true
      `, [biz.id]);

      return {
        ...biz,
        branches: branchesRes.rows,
      };
    }));

    res.json({ businesses: bizList });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve businesses: ' + err.message });
  }
});

// 2. Get specific business details by slug or ID with its branches, services, and synthetic reviews
router.get('/businesses/:slugOrId', async (req: Request, res: Response) => {
  try {
    const { slugOrId } = req.params;

    const bizRes = await query(`
      SELECT b.id, b.name, b.slug, b.description, b.category, b.currency, b.timezone, b.logo_url AS "logoUrl",
             b.booking_policies AS "bookingPolicies",
             b.phone, b.email, b.address, b.city, b.opening_hours AS "openingHours",
             b.website, b.instagram, COALESCE(b.social_handle, b.instagram) AS "socialHandle", b.tagline
      FROM businesses b
      WHERE b.slug = $1 OR b.id::text = $1
      LIMIT 1
    `, [slugOrId]);

    if (bizRes.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = bizRes.rows[0];

    // Branches
    const branchesRes = await query(`
      SELECT id, name, address, city, phone, latitude, longitude, location_description AS "locationDescription"
      FROM branches
      WHERE business_id = $1 AND is_active = true
      ORDER BY name ASC
    `, [business.id]);

    // Services
    const servicesRes = await query(`
      SELECT id, name, description, duration_minutes AS "durationMinutes", price, category, suitability_tags AS "suitabilityTags"
      FROM services
      WHERE business_id = $1 AND is_active = true
      ORDER BY price ASC
    `, [business.id]);

    // Staff
    const staffRes = await query(`
      SELECT sp.id, sp.name, sp.bio, sp.avatar_url AS "avatarUrl",
             COALESCE(AVG(r.staff_rating), 0)::numeric(3, 1) AS "rating",
             COUNT(r.id)::int AS "reviewCount"
      FROM staff_profiles sp
      LEFT JOIN reviews r ON r.staff_id = sp.id AND r.staff_rating IS NOT NULL
      WHERE sp.business_id = $1 AND sp.is_active = true
      GROUP BY sp.id
      ORDER BY "rating" DESC, "reviewCount" DESC, sp.name ASC
    `, [business.id]);

    // Reviews
    const reviewsRes = await query(`
      SELECT r.id, r.customer_name AS "customerName", r.rating, r.staff_rating AS "staffRating",
             r.staff_id AS "staffId", sp.name AS "staffName", r.comment, r.created_at AS "createdAt"
      FROM reviews r
      LEFT JOIN staff_profiles sp ON sp.id = r.staff_id
      WHERE r.business_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [business.id]);

    res.json({
      business: {
        ...business,
        branches: branchesRes.rows,
        services: servicesRes.rows,
        staff: staffRes.rows,
        reviews: reviewsRes.rows,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve business: ' + err.message });
  }
});

// 3. Get distinct categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const catRes = await query(`
      SELECT DISTINCT category
      FROM businesses
      ORDER BY category ASC
    `);

    res.json({ categories: catRes.rows.map(r => r.category) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

export default router;
