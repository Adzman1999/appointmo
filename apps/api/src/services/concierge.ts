import { query } from '../db';
import { AvailabilityService, TimeSlot } from './availability';

export interface ConciergeRecommendation {
  serviceId: string;
  serviceName: string;
  businessId?: string;
  businessName?: string;
  businessCategory?: string;
  businessRating?: number;
  businessReviewCount?: number;
  serviceRating?: number;
  serviceReviewCount?: number;
  price: number;
  durationMinutes: number;
  category: string;
  staffId: string;
  staffName: string;
  staffRating?: number;
  staffReviewCount?: number;
  slot: TimeSlot;
  matchScore: number;
  badge?: 'Best Match' | 'Top Value' | 'Soonest Available' | 'Top Rated';
  matchReasons: string[];
}

export class ConciergeService {
  static async getRecommendations(businessId: string, params: {
    query: string;
    preferredDate?: string;
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
    maxBudget?: number;
    preferredStaffId?: string;
  }): Promise<{ recommendations: ConciergeRecommendation[]; extractedPreferences: any; alternatives?: ConciergeRecommendation[] }> {
    const qLower = params.query.toLowerCase();

    // 1. Fetch all active services for business (Synthetic catalogue only)
    const servicesRes = await query(
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
    const services = servicesRes.rows;
    const businessReviewsRes = await query(
      'SELECT COALESCE(AVG(rating), 0)::numeric(3, 1) AS rating, COUNT(*)::int AS "reviewCount" FROM reviews WHERE business_id = $1',
      [businessId]
    );
    const businessRating = Number(businessReviewsRes.rows[0]?.rating || 0);
    const businessReviewCount = Number(businessReviewsRes.rows[0]?.reviewCount || 0);
    const staffReviewsRes = await query(
      `SELECT staff_id AS "staffId", AVG(staff_rating)::numeric(3, 1) AS rating, COUNT(*)::int AS "reviewCount"
       FROM reviews
       WHERE business_id = $1 AND staff_id IS NOT NULL AND staff_rating IS NOT NULL
       GROUP BY staff_id`,
      [businessId]
    );
    const staffRatings = new Map<string, { rating: number; reviewCount: number }>(
      staffReviewsRes.rows.map((row: any) => [row.staffId, { rating: Number(row.rating), reviewCount: Number(row.reviewCount) }])
    );

    // Detect user preferences from query text
    const isSensitive = qLower.includes('sensitive') || qLower.includes('gentle') || qLower.includes('mild');
    const isDeep = qLower.includes('deep') || qLower.includes('intense') || qLower.includes('extraction');
    const isMassage = qLower.includes('massage') || qLower.includes('relax') || qLower.includes('body') || qLower.includes('stress');
    const isFacial = qLower.includes('facial') || qLower.includes('skin') || qLower.includes('face') || qLower.includes('glow');
    const isNails = qLower.includes('nail') || qLower.includes('manicure') || qLower.includes('pedicure') || qLower.includes('feet') || qLower.includes('hands');
    const isDental = qLower.includes('dental') || qLower.includes('tooth') || qLower.includes('teeth') || qLower.includes('whitening') || qLower.includes('cleaning') || qLower.includes('ortho');
    const isVet = qLower.includes('pet') || qLower.includes('dog') || qLower.includes('cat') || qLower.includes('vaccine') || qLower.includes('puppy') || qLower.includes('kitten') || qLower.includes('vet');
    const isLegal = qLower.includes('legal') || qLower.includes('law') || qLower.includes('contract') || qLower.includes('advisory') || qLower.includes('consult') || qLower.includes('attorney');

    // Extract stated budget
    const budgetMatch = qLower.match(/(under|below|budget of|max|less than)?\s*(?:₱|php)?\s*(\d{3,5})/i);
    const statedBudget = params.maxBudget || (budgetMatch ? parseInt(budgetMatch[2], 10) : undefined);

    // 2. Score candidate services
    const candidateServices = services.map(s => {
      let score = 0;
      const reasons: string[] = [];
      const sDesc = (s.description || '').toLowerCase();
      const sName = s.name.toLowerCase();
      const sCat = (s.category || '').toLowerCase();

      // Category matching
      if (isFacial && (sCat.includes('facial') || sCat.includes('skin'))) {
        score += 80;
        reasons.push('Matches your requested facial & skincare goal');
      } else if (isMassage && (sCat.includes('body') || sCat.includes('massage') || sCat.includes('wellness'))) {
        score += 80;
        reasons.push('Matches your relaxation and body wellness focus');
      } else if (isNails && sCat.includes('nail')) {
        score += 80;
        reasons.push('Matches your nail care grooming preference');
      } else if (isDental && (sCat.includes('dental') || sCat.includes('preventive') || sCat.includes('cosmetic') || sCat.includes('orthodontics'))) {
        score += 80;
        reasons.push('Specialized dental and oral health service');
      } else if (isVet && (sCat.includes('veterinary') || sCat.includes('pet') || sCat.includes('clinical') || sCat.includes('grooming'))) {
        score += 80;
        reasons.push('Qualified veterinary and pet healthcare care');
      } else if (isLegal && (sCat.includes('legal') || sCat.includes('corporate') || sCat.includes('advisory') || sCat.includes('consultation'))) {
        score += 80;
        reasons.push('Professional legal and advisory consultation');
      }

      // Specific attributes
      if (isSensitive) {
        if (sDesc.includes('gentle') || sName.includes('basic') || sDesc.includes('soothing')) {
          score += 30;
          reasons.push('Specially curated formula suitable for sensitive skin');
        } else if (isDeep && sName.includes('deep')) {
          score -= 10; // slightly penalize intense extractions for sensitive skin
        }
      }

      if (isDeep && sName.includes('deep')) {
        score += 25;
        reasons.push('Features deep extraction and ultrasonic pore cleansing');
      }

      // Keyword match in name
      const nameWords = sName.split(' ');
      for (const w of nameWords) {
        if (w.length > 3 && qLower.includes(w)) {
          score += 20;
          reasons.push(`Direct match with ${s.name}`);
          break;
        }
      }

      // Budget scoring
      if (statedBudget) {
        const priceNum = Number(s.price);
        if (priceNum <= statedBudget) {
          score += 25;
          reasons.push(`Within stated budget (₱${priceNum} <= ₱${statedBudget})`);
        } else {
          score -= 40; // penalize if over budget
        }
      }

      // Baseline score for category matches
      if (score === 0 && (s.category === 'Facial' && isFacial)) score = 10;

      return {
        service: s,
        score,
        reasons,
        budget: statedBudget,
      };
    }).sort((a, b) => b.score - a.score);

    // 3. Determine target date (default tomorrow if "tomorrow" mentioned, or next working day)
    let targetDateStr = params.preferredDate;
    if (!targetDateStr) {
      const targetDate = new Date();
      if (qLower.includes('tomorrow')) {
        targetDate.setDate(targetDate.getDate() + 1);
      } else {
        targetDate.setDate(targetDate.getDate() + 2);
      }
      if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1); // skip Sunday
      targetDateStr = targetDate.toISOString().split('T')[0];
    }

    // Determine time of day
    let timeOfDay = params.preferredTimeOfDay;
    if (!timeOfDay || timeOfDay === 'any') {
      if (qLower.includes('morning')) timeOfDay = 'morning';
      else if (qLower.includes('afternoon')) timeOfDay = 'afternoon';
      else if (qLower.includes('evening')) timeOfDay = 'evening';
    }

    const recommendations: ConciergeRecommendation[] = [];
    const alternatives: ConciergeRecommendation[] = [];

    // 4. Query real slots for top candidate services
    for (const item of candidateServices) {
      try {
        const slots = await AvailabilityService.getAvailableSlots(
          businessId,
          item.service.id,
          targetDateStr,
          params.preferredStaffId
        );

        if (slots.length > 0) {
          // Filter slots by time of day if requested
          let filteredSlots = slots;
          if (timeOfDay === 'morning') {
            filteredSlots = slots.filter(s => new Date(s.startTime).getHours() < 12);
          } else if (timeOfDay === 'afternoon') {
            filteredSlots = slots.filter(s => {
              const h = new Date(s.startTime).getHours();
              return h >= 12 && h < 17;
            });
          } else if (timeOfDay === 'evening') {
            filteredSlots = slots.filter(s => new Date(s.startTime).getHours() >= 17);
          }

          const slotChoices = filteredSlots.length > 0 ? filteredSlots : slots;
          const sortedSlots = [...slotChoices].sort((a, b) => {
            const aRating = staffRatings.get(a.staffId);
            const bRating = staffRatings.get(b.staffId);
            const aBoost = aRating && aRating.reviewCount >= 3 ? aRating.rating : 0;
            const bBoost = bRating && bRating.reviewCount >= 3 ? bRating.rating : 0;
            return bBoost - aBoost || new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          });
          const chosenSlot = sortedSlots[0];
          const chosenStaffRating = staffRatings.get(chosenSlot.staffId);
          const reasons = [...item.reasons];
          if (timeOfDay && filteredSlots.length > 0) {
            reasons.push(`Available in your preferred ${timeOfDay} time frame`);
          } else if (timeOfDay && filteredSlots.length === 0) {
            reasons.push(`Nearest open opening (outside preferred ${timeOfDay})`);
          }
          reasons.push(`Verified open slot with certified specialist ${chosenSlot.staffName}`);
          if (chosenStaffRating && chosenStaffRating.reviewCount >= 3) {
            reasons.push(`Highly rated specialist (${chosenStaffRating.rating.toFixed(1)}/5 from ${chosenStaffRating.reviewCount} reviews)`);
          }
          if (Number(item.service.service_review_count || 0) >= 3) {
            reasons.push(`Customers rate this service ${Number(item.service.service_rating).toFixed(1)}/5 (${item.service.service_review_count} reviews)`);
          }
          if (businessReviewCount >= 3) {
            reasons.push(`Customer rated store ${businessRating.toFixed(1)}/5 (${businessReviewCount} reviews)`);
          }

          const trustedStaffBoost = chosenStaffRating && chosenStaffRating.reviewCount >= 3
            ? Math.min(18, chosenStaffRating.rating * 3)
            : 0;
          const trustedBusinessBoost = businessReviewCount >= 3 ? Math.min(8, businessRating * 1.5) : 0;

          const recItem: ConciergeRecommendation = {
            serviceId: item.service.id,
            serviceName: item.service.name,
            price: Number(item.service.price),
            durationMinutes: item.service.duration_minutes,
            category: item.service.category,
            staffId: chosenSlot.staffId,
            staffName: chosenSlot.staffName,
            staffRating: chosenStaffRating?.rating || 0,
            staffReviewCount: chosenStaffRating?.reviewCount || 0,
            businessRating,
            businessReviewCount,
            serviceRating: Number(item.service.service_rating || 0),
            serviceReviewCount: Number(item.service.service_review_count || 0),
            slot: chosenSlot,
            matchScore: item.score * 10 + (filteredSlots.length > 0 ? 15 : 0) + trustedStaffBoost + trustedBusinessBoost +
              (Number(item.service.service_review_count || 0) >= 3 ? Math.min(6, Number(item.service.service_rating || 0) * 1.2) : 0),
            matchReasons: reasons,
          };

          if (item.score > 0) {
            recommendations.push(recItem);
          } else {
            alternatives.push(recItem);
          }
        }
      } catch (err) {
        // Skip service if availability fails
      }
    }

    // Sort by matchScore and assign badges
    const sortedRecs = recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
    if (sortedRecs.length > 0) {
      sortedRecs[0].badge = 'Best Match';
      const topRatedIndex = sortedRecs.findIndex((item) =>
        ((item.staffReviewCount || 0) >= 3 && (item.staffRating || 0) >= 4.5) ||
        ((item.businessReviewCount || 0) >= 3 && (item.businessRating || 0) >= 4.5)
      );
      if (topRatedIndex > 0) sortedRecs[topRatedIndex].badge = 'Top Rated';
      if (sortedRecs.length > 1) {
        // Assign Top Value to lowest price among remaining
        let lowestIdx = 1;
        for (let i = 2; i < sortedRecs.length; i++) {
          if (sortedRecs[i].price < sortedRecs[lowestIdx].price) lowestIdx = i;
        }
        sortedRecs[lowestIdx].badge = 'Top Value';
      }
    }

    return {
      recommendations: sortedRecs,
      alternatives: alternatives.slice(0, 2),
      extractedPreferences: {
        targetDate: targetDateStr,
        timeOfDay: timeOfDay || 'any',
        budget: statedBudget,
        sensitiveSkin: isSensitive,
      },
    };
  }
}
