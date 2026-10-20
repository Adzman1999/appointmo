import { query, pool } from './index';
import { runMigrations } from './migrate';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const seedData = async () => {
  // Ensure all schema and tables (e.g. notifications, demo_sessions) exist
  await runMigrations();

  console.log('Seeding deterministic Lumière Beauty Studio demo data...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check or Clean demo dataset (isolated to lumiere)
    const existingBiz = await client.query("SELECT id FROM businesses WHERE slug = 'lumiere-beauty-studio'");
    let businessId: string;

    if (existingBiz.rows.length > 0) {
      businessId = existingBiz.rows[0].id;
      // Clean previous demo appointments, staff, services for idempotent deterministic re-seeding
      await client.query('DELETE FROM appointments WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM customers WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM staff_profiles WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM services WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM branches WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM users WHERE business_id = $1', [businessId]);
    } else {
      const bizRes = await client.query(`
        INSERT INTO businesses (name, slug, description, currency, timezone)
        VALUES ('Lumière Beauty Studio', 'lumiere-beauty-studio', 'Premium aesthetic, skincare and wellness studio.', 'PHP', 'Asia/Manila')
        RETURNING id
      `);
      businessId = bizRes.rows[0].id;
    }

    // 2. Create branch (Fictional synthetic branch)
    const branchRes = await client.query(`
      INSERT INTO branches (business_id, name, address, city, phone)
      VALUES ($1, 'Lumière Studio (Fictional Demo Branch)', 'Suite 404, Fictional Innovation Tower, Demo District', 'Quezon City', '+63 2 8000 0000')
      RETURNING id
    `, [businessId]);
    const branchId = branchRes.rows[0].id;

    // 3. Create business admin user and platform admin user
    const passwordHash = await bcrypt.hash('Lumiere2026!', 10);
    const platformPasswordHash = await bcrypt.hash('AppointmoAdmin2026!', 10);

    await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name)
      VALUES ($1, 'demo.manager@example.com', $2, 'business_admin', 'Camille Del Rosario (Synthetic Admin)')
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
    `, [businessId, passwordHash]);

    await client.query(`
      INSERT INTO users (business_id, email, password_hash, role, name)
      VALUES (NULL, 'admin@appointmo.demo', $1, 'platform_admin', 'Appointmo Platform Admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
    `, [platformPasswordHash]);

    // 4. Create 6 Services
    const serviceDefs = [
      { name: 'Basic Facial', desc: 'Gentle exfoliation, pore cleansing, and light hydration.', duration: 45, price: 800, category: 'Facial' },
      { name: 'Signature Facial', desc: 'Custom enzyme peel, lymphatic drainage, and peptide infusion.', duration: 60, price: 1200, category: 'Facial' },
      { name: 'Deep Cleansing Facial', desc: 'Intensive extraction, ultrasonic skin scrubbing, and soothing mask.', duration: 75, price: 1500, category: 'Facial' },
      { name: 'Relaxation Massage', desc: 'Full body Swedish massage with aromatic calming oils.', duration: 60, price: 1000, category: 'Body & Wellness' },
      { name: 'Manicure', desc: 'Nail shaping, cuticle care, hand scrub, and organic polish.', duration: 30, price: 350, category: 'Nails' },
      { name: 'Pedicure', desc: 'Foot soak, callous smoothing, cuticle care, and nourishing balm.', duration: 45, price: 450, category: 'Nails' },
    ];

    const serviceMap = new Map<string, string>();
    for (const s of serviceDefs) {
      const sRes = await client.query(`
        INSERT INTO services (business_id, name, description, duration_minutes, price, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [businessId, s.name, s.desc, s.duration, s.price, s.category]);
      serviceMap.set(s.name, sRes.rows[0].id);
    }

    // 5. Create 3 Staff members
    const staffDefs = [
      {
        name: 'Maria Santos',
        bio: 'Senior aesthetician with over 8 years of clinical skincare experience.',
        services: ['Basic Facial', 'Signature Facial', 'Deep Cleansing Facial'],
      },
      {
        name: 'Ana Reyes',
        bio: 'Holistic wellness therapist specializing in body therapy and relaxation massage.',
        services: ['Relaxation Massage', 'Basic Facial'],
      },
      {
        name: 'Kristine Lim',
        bio: 'Certified nail artist and wellness specialist with an eye for detail.',
        services: ['Manicure', 'Pedicure', 'Relaxation Massage'],
      },
    ];

    const staffMap = new Map<string, string>();
    for (const st of staffDefs) {
      const stRes = await client.query(`
        INSERT INTO staff_profiles (business_id, name, bio)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [businessId, st.name, st.bio]);
      const staffId = stRes.rows[0].id;
      staffMap.set(st.name, staffId);

      // Link staff services
      for (const sName of st.services) {
        const sId = serviceMap.get(sName);
        if (sId) {
          await client.query(`
            INSERT INTO staff_services (staff_id, service_id)
            VALUES ($1, $2)
          `, [staffId, sId]);
        }
      }

      // Add working hours (Mon-Sat, 9:00 to 18:00, lunch 12:00 to 13:00)
      for (let day = 1; day <= 6; day++) {
        await client.query(`
          INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, break_start, break_end, is_working)
          VALUES ($1, $2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', true)
        `, [staffId, day]);
      }
      // Sunday off
      await client.query(`
        INSERT INTO staff_working_hours (staff_id, day_of_week, start_time, end_time, is_working)
        VALUES ($1, 0, '09:00:00', '18:00:00', false)
      `, [staffId]);
    }

    // 6. Seed 40 deterministic fictional customers
    const customerNames = [
      'Beatriz Alonzo', 'Carla Gomez', 'Diana Mendoza', 'Elena Torres', 'Francesca Cruz',
      'Grace Tan', 'Hannah Villanueva', 'Isabella Aquino', 'Jasmine Ramos', 'Katrina Bautista',
      'Lorenzo Diaz', 'Miguel Santos', 'Nathaniel Reyes', 'Oliver Soriano', 'Patricia Sy',
      'Queenie Lopez', 'Rhea Mercado', 'Stephanie Garcia', 'Theresa Morales', 'Ursula Castillo',
      'Valerie Pascual', 'Wendy Navarro', 'Xenia David', 'Ysabelle Cordero', 'Zoe Fernandez',
      'Andrea Lim', 'Bianca Castro', 'Chloe Valenzuela', 'Danielle Co', 'Evelyn Pineda',
      'Faith Salazar', 'Gillian Henson', 'Hazel Ocampo', 'Iris Dizon', 'Joyce Evangelista',
      'Kirsten Guinto', 'Leila Tolentino', 'Maureen Macaraig', 'Nadine Ilustre', 'Olivia Constantino'
    ];

    const customerIds: string[] = [];
    for (let i = 0; i < customerNames.length; i++) {
      const name = customerNames[i];
      const email = `customer${i + 1}@example.com`;
      const phone = `+63 900 000 ${1000 + i}`;
      const cRes = await client.query(`
        INSERT INTO customers (business_id, name, email, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [businessId, name, email, phone]);
      customerIds.push(cRes.rows[0].id);
    }

    // 7. Seed Appointments (100 completed past, 15 upcoming, 10 cancelled)
    const staffList = Array.from(staffMap.entries());
    const serviceList = serviceDefs;

    const baseDate = new Date(); // anchor date
    const pad = (n: number) => (n < 10 ? '0' + n : n);

    let apptCount = 0;

    // A. 100 Past Completed Appointments (past 30 days)
    for (let i = 100; i >= 1; i--) {
      apptCount++;
      const daysAgo = Math.floor(i / 3.5) + 1;
      const apptDate = new Date(baseDate.getTime() - daysAgo * 24 * 3600 * 1000);
      if (apptDate.getDay() === 0) apptDate.setDate(apptDate.getDate() - 1); // skip Sunday

      const hour = 9 + (i % 7); // 9am to 4pm
      apptDate.setHours(hour, 0, 0, 0);

      const staffIdx = i % staffList.length;
      const [staffName, sStaffId] = staffList[staffIdx];
      const staffEligibleServices = staffDefs.find(st => st.name === staffName)!.services;
      const chosenServiceName = staffEligibleServices[i % staffEligibleServices.length];
      const chosenService = serviceDefs.find(s => s.name === chosenServiceName)!;
      const sServiceId = serviceMap.get(chosenServiceName)!;

      const endDate = new Date(apptDate.getTime() + chosenService.duration * 60 * 1000);
      const customerId = customerIds[i % customerIds.length];
      const bookingRef = `APT-PAST-${pad(i)}`;
      const tokenHash = crypto.createHash('sha256').update(bookingRef + 'secret').digest('hex');

      await client.query(`
        INSERT INTO appointments (
          booking_reference, business_id, branch_id, customer_id, service_id, staff_id,
          start_time, end_time, status, price_snapshot, currency, notes, management_token_hash, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9, 'PHP', 'Regular appointment', $10, $11)
      `, [bookingRef, businessId, branchId, customerId, sServiceId, sStaffId, apptDate, endDate, chosenService.price, tokenHash, apptDate]);
    }

    // B. 15 Upcoming Confirmed Appointments (next 7 days)
    for (let i = 1; i <= 15; i++) {
      apptCount++;
      const daysAhead = Math.floor(i / 3) + 1;
      const apptDate = new Date(baseDate.getTime() + daysAhead * 24 * 3600 * 1000);
      if (apptDate.getDay() === 0) apptDate.setDate(apptDate.getDate() + 1); // skip Sunday

      const hour = 10 + (i % 6);
      apptDate.setHours(hour, 0, 0, 0);

      const staffIdx = (i + 1) % staffList.length;
      const [staffName, sStaffId] = staffList[staffIdx];
      const staffEligibleServices = staffDefs.find(st => st.name === staffName)!.services;
      const chosenServiceName = staffEligibleServices[i % staffEligibleServices.length];
      const chosenService = serviceDefs.find(s => s.name === chosenServiceName)!;
      const sServiceId = serviceMap.get(chosenServiceName)!;

      const endDate = new Date(apptDate.getTime() + chosenService.duration * 60 * 1000);
      const customerId = customerIds[(i + 10) % customerIds.length];
      const bookingRef = `APT-UP-${pad(i)}`;
      const tokenHash = crypto.createHash('sha256').update(bookingRef + 'secret').digest('hex');

      await client.query(`
        INSERT INTO appointments (
          booking_reference, business_id, branch_id, customer_id, service_id, staff_id,
          start_time, end_time, status, price_snapshot, currency, notes, management_token_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, 'PHP', 'First-time client request', $10)
      `, [bookingRef, businessId, branchId, customerId, sServiceId, sStaffId, apptDate, endDate, chosenService.price, tokenHash]);
    }

    // C. 10 Cancelled Appointments
    for (let i = 1; i <= 10; i++) {
      apptCount++;
      const daysAgo = i * 2;
      const apptDate = new Date(baseDate.getTime() - daysAgo * 24 * 3600 * 1000);
      apptDate.setHours(14, 0, 0, 0);

      const [staffName, sStaffId] = staffList[i % staffList.length];
      const staffEligibleServices = staffDefs.find(st => st.name === staffName)!.services;
      const chosenServiceName = staffEligibleServices[0];
      const chosenService = serviceDefs.find(s => s.name === chosenServiceName)!;
      const sServiceId = serviceMap.get(chosenServiceName)!;

      const endDate = new Date(apptDate.getTime() + chosenService.duration * 60 * 1000);
      const customerId = customerIds[(i + 20) % customerIds.length];
      const bookingRef = `APT-CANC-${pad(i)}`;
      const tokenHash = crypto.createHash('sha256').update(bookingRef + 'secret').digest('hex');

      await client.query(`
        INSERT INTO appointments (
          booking_reference, business_id, branch_id, customer_id, service_id, staff_id,
          start_time, end_time, status, price_snapshot, currency, cancellation_reason, management_token_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cancelled', $9, 'PHP', 'Client had travel conflict', $10)
      `, [bookingRef, businessId, branchId, customerId, sServiceId, sStaffId, apptDate, endDate, chosenService.price, tokenHash]);
    }

    // 8. Seed sample Demo Access Request for testing platform admin
    await client.query(`
      INSERT INTO demo_access_requests (full_name, email, business_name, message, status)
      VALUES 
        ('Synthetic Demo Visitor', 'visitor.one@example.com', 'Fictional Aesthetics Studio', 'Evaluating SaaS booking platforms for synthetic case study.', 'pending'),
        ('Synthetic Portfolio Reviewer', 'reviewer.two@example.com', 'Fictional Labs', 'Evaluating scheduling system performance.', 'approved')
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    console.log(`✅ Seed completed: 1 Business, 1 Branch, 6 Services, 3 Staff, 40 Customers, ${apptCount} Appointments seeded.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seedData()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
