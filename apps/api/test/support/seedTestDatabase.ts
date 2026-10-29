import { pool } from '../../src/db';
import { seedData } from '../../src/db/seed';

const weeklySchedule = [
  { day: 'Monday', isWorking: true, startTime: '09:00', endTime: '18:00' },
  { day: 'Tuesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
  { day: 'Wednesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
  { day: 'Thursday', isWorking: true, startTime: '09:00', endTime: '18:00' },
  { day: 'Friday', isWorking: true, startTime: '09:00', endTime: '18:00' },
  { day: 'Saturday', isWorking: true, startTime: '09:00', endTime: '18:00' },
  { day: 'Sunday', isWorking: false, startTime: '09:00', endTime: '18:00' },
];

const catalog = [
  { name: 'Signature Facial', description: 'Gentle facial and soothing skincare treatment.', durationMinutes: 45, price: 600, category: 'Facial' },
  { name: 'Relaxation Massage', description: 'Relaxing body massage for stress relief.', durationMinutes: 60, price: 1000, category: 'Massage' },
  { name: 'Manicure Care', description: 'Classic nail care and manicure service.', durationMinutes: 45, price: 500, category: 'Nail Care' },
  { name: 'Pedicure Care', description: 'Classic nail care and pedicure service.', durationMinutes: 45, price: 650, category: 'Nail Care' },
  { name: 'Standard Consultation', description: 'A general consultation with a wellness specialist.', durationMinutes: 30, price: 300, category: 'Consultation' },
  { name: 'Deep Cleansing Facial', description: 'A gentle, soothing facial for sensitive skin.', durationMinutes: 60, price: 900, category: 'Facial' },
];

const businesses = [
  {
    name: 'Apex Dental & Orthodontics', slug: 'apex-dental-orthodontics', category: 'Dental Services',
    description: 'Family dental care and orthodontic consultations.', branches: [
      { name: 'Apex Dental - Makati', address: 'Makati City', city: 'Makati', phone: '+63 2 8000 0001', latitude: 14.5547, longitude: 121.0244 },
      { name: 'Apex Dental - Taguig', address: 'Taguig City', city: 'Taguig', phone: '+63 2 8000 0002', latitude: 14.5176, longitude: 121.0509 },
    ],
  },
  {
    name: 'Paws & Whiskers Veterinary Clinic', slug: 'paws-whiskers-veterinary-clinic', category: 'Veterinary Services',
    description: 'Veterinary wellness and preventive care for pets.', branches: [
      { name: 'Paws & Whiskers - Quezon City', address: 'Quezon City', city: 'Quezon City', phone: '+63 2 8000 0003', latitude: 14.6507, longitude: 121.0336 },
    ],
  },
  {
    name: 'Northstar Professional Advisory', slug: 'northstar-professional-advisory', category: 'Professional Consultations',
    description: 'Professional advisory and consultation services.', branches: [
      { name: 'Northstar - Makati', address: 'Makati City', city: 'Makati', phone: '+63 2 8000 0004', latitude: 14.5547, longitude: 121.0244 },
    ],
  },
];

async function ensureService(
  client: Awaited<ReturnType<typeof pool.connect>>,
  businessId: string,
  service: typeof catalog[number]
) {
  const existing = await client.query(
    'SELECT id FROM services WHERE business_id = $1 AND name = $2 LIMIT 1',
    [businessId, service.name]
  );
  if (existing.rows[0]) {
    const updated = await client.query(
      `UPDATE services SET description = $1, duration_minutes = $2, price = $3, category = $4,
         is_active = true, updated_at = NOW() WHERE id = $5 RETURNING id`,
      [service.description, service.durationMinutes, service.price, service.category, existing.rows[0].id]
    );
    return updated.rows[0].id as string;
  }
  const inserted = await client.query(
    `INSERT INTO services (business_id, name, description, duration_minutes, price, category, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
    [businessId, service.name, service.description, service.durationMinutes, service.price, service.category]
  );
  return inserted.rows[0].id as string;
}

async function ensureBranch(
  client: Awaited<ReturnType<typeof pool.connect>>,
  businessId: string,
  branch: typeof businesses[number]['branches'][number]
) {
  const existing = await client.query(
    'SELECT id FROM branches WHERE business_id = $1 AND name = $2 LIMIT 1',
    [businessId, branch.name]
  );
  if (existing.rows[0]) {
    const updated = await client.query(
      `UPDATE branches SET address = $1, city = $2, phone = $3, latitude = $4, longitude = $5,
         is_active = true, updated_at = NOW() WHERE id = $6 RETURNING id`,
      [branch.address, branch.city, branch.phone, branch.latitude, branch.longitude, existing.rows[0].id]
    );
    return updated.rows[0].id as string;
  }
  const inserted = await client.query(
    `INSERT INTO branches (business_id, name, address, city, phone, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [businessId, branch.name, branch.address, branch.city, branch.phone, branch.latitude, branch.longitude]
  );
  return inserted.rows[0].id as string;
}

async function ensureBusiness(
  client: Awaited<ReturnType<typeof pool.connect>>,
  business: typeof businesses[number]
) {
  const result = await client.query(
    `INSERT INTO businesses (name, slug, description, category, currency, timezone, status, weekly_schedule, booking_policies)
     VALUES ($1, $2, $3, $4, 'PHP', 'Asia/Manila', 'approved', $5::jsonb, $6::jsonb)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
       category = EXCLUDED.category, status = 'approved', weekly_schedule = EXCLUDED.weekly_schedule,
       booking_policies = EXCLUDED.booking_policies, updated_at = NOW()
     RETURNING id`,
    [business.name, business.slug, business.description, business.category, JSON.stringify(weeklySchedule), JSON.stringify({ slotInterval: 45 })]
  );
  const businessId = result.rows[0].id as string;
  for (const branch of business.branches) await ensureBranch(client, businessId, branch);
  return businessId;
}

export async function seedTestDatabase() {
  await seedData();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['appointmo:test-fixtures']);

    const primaryBusiness = await client.query(
      "SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio' LIMIT 1"
    );
    const businessId = primaryBusiness.rows[0]?.id as string | undefined;
    if (!businessId) throw new Error('The local account seed did not create its store.');

    await client.query(
      'UPDATE businesses SET weekly_schedule = $1::jsonb, booking_policies = $2::jsonb WHERE id = $3',
      [JSON.stringify(weeklySchedule), JSON.stringify({ slotInterval: 45 }), businessId]
    );

    const serviceIds: string[] = [];
    for (const service of catalog) serviceIds.push(await ensureService(client, businessId, service));

    const staff = [];
    for (const name of ['Jennie Batumbakal', 'Ava Reyes']) {
      const existing = await client.query(
        'SELECT id FROM staff_profiles WHERE business_id = $1 AND name = $2 LIMIT 1',
        [businessId, name]
      );
      const result = existing.rows[0]
        ? await client.query(
            `UPDATE staff_profiles SET bio = 'Appointment specialist', is_active = true, status = 'active', updated_at = NOW()
             WHERE id = $1 RETURNING id`,
            [existing.rows[0].id]
          )
        : await client.query(
            `INSERT INTO staff_profiles (business_id, name, bio, is_active, status)
             VALUES ($1, $2, 'Appointment specialist', true, 'active') RETURNING id`,
            [businessId, name]
          );
      staff.push({ id: result.rows[0].id as string, name });
    }

    for (const specialist of staff) {
      await client.query('DELETE FROM staff_working_hours WHERE staff_id = $1', [specialist.id]);
      for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek += 1) {
        await client.query(
          `INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, break_start, break_end, is_working)
           VALUES ($1, $2, '09:00', '18:00', '12:00', '13:00', true)`,
          [specialist.id, dayOfWeek]
        );
      }
      for (const serviceId of serviceIds) {
        await client.query(
          'INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [specialist.id, serviceId]
        );
      }
    }

    const apex = await ensureBusiness(client, businesses[0]);
    await ensureService(client, apex, {
      name: 'Preventive Dental Consultation',
      description: 'Routine dental consultation and preventive oral health review.',
      durationMinutes: 45,
      price: 800,
      category: 'Dental Services',
    });
    await ensureBusiness(client, businesses[1]);
    await ensureBusiness(client, businesses[2]);
    const apexReview = await client.query(
      `SELECT id FROM reviews WHERE business_id = $1 AND customer_name = 'Test Customer' AND comment = 'Fixture rating' LIMIT 1`,
      [apex]
    );
    if (!apexReview.rows[0]) {
      await client.query(
        `INSERT INTO reviews (business_id, customer_name, rating, comment)
         VALUES ($1, 'Test Customer', 5, 'Fixture rating')`,
        [apex]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
