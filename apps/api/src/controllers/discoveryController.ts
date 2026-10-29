import { Request, Response } from 'express';
import { getBusinessDetails, listBusinesses, listCategories } from '../services/discoveryService';

export async function getBusinesses(req: Request, res: Response) {
  try {
    const { category, search } = req.query;
    const businesses = await listBusinesses({
      category: typeof category === 'string' ? category : undefined,
      search: typeof search === 'string' ? search : undefined,
    });
    return res.json({ businesses });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to retrieve businesses: ${message}` });
  }
}

export async function getBusiness(req: Request, res: Response) {
  try {
    const business = await getBusinessDetails(req.params.slugOrId);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    return res.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to retrieve business: ${message}` });
  }
}

export async function getCategories(_req: Request, res: Response) {
  try {
    return res.json({ categories: await listCategories() });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve categories' });
  }
}
