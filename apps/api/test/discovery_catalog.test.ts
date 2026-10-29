import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';
import { seedTestDatabase } from './support/seedTestDatabase';

const app = createApp();

beforeAll(async () => {
  await seedTestDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe('Smart Business Discovery & Multi-Category Catalog API', () => {
  it('1. GET /api/categories returns all distinct business categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toContain('Beauty & Wellness');
    expect(res.body.categories).toContain('Dental Services');
    expect(res.body.categories).toContain('Veterinary Services');
    expect(res.body.categories).toContain('Professional Consultations');
  });

  it('2. GET /api/businesses lists businesses with branch coordinates and rating summaries', async () => {
    const res = await request(app).get('/api/businesses');
    expect(res.status).toBe(200);
    expect(res.body.businesses.length).toBeGreaterThanOrEqual(4);

    const apex = res.body.businesses.find((b: any) => b.slug === 'apex-dental-orthodontics');
    expect(apex).toBeDefined();
    expect(apex.category).toBe('Dental Services');
    expect(apex.branches.length).toBe(2);
    expect(Number(apex.branches[0].latitude)).toBeCloseTo(14.5547, 2);
    expect(Number(apex.branches[0].longitude)).toBeCloseTo(121.0244, 2);
  });

  it('3. GET /api/businesses filters by category and search keyword', async () => {
    // Filter by Dental Services
    const dentalRes = await request(app).get('/api/businesses?category=Dental%20Services');
    expect(dentalRes.status).toBe(200);
    expect(dentalRes.body.businesses.length).toBeGreaterThan(0);
    expect(dentalRes.body.businesses.every((b: any) => b.category === 'Dental Services')).toBe(true);

    // Search keyword
    const searchRes = await request(app).get('/api/businesses?search=Paws');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.businesses.length).toBe(1);
    expect(searchRes.body.businesses[0].name).toContain('Paws & Whiskers');
  });

  it('4. GET /api/businesses/:slug returns full business profile, branches, services and synthetic reviews', async () => {
    const res = await request(app).get('/api/businesses/apex-dental-orthodontics');
    expect(res.status).toBe(200);
    expect(res.body.business.name).toBe('Apex Dental & Orthodontics');
    expect(res.body.business.services.length).toBeGreaterThan(0);
    expect(res.body.business.branches.length).toBe(2);
    expect(res.body.business.reviews.length).toBeGreaterThan(0);
  });
});
