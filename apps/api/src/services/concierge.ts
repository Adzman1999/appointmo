import { query } from '../db';
import { AvailabilityService, TimeSlot } from './availability';

export interface ConciergeRecommendation {
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  category: string;
  staffId: string;
  staffName: string;
  slot: TimeSlot;
  matchScore: number;
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
      'SELECT id, name, description, duration_minutes, price, category FROM services WHERE business_id = $1 AND is_active = true',
      [businessId]
    );
    const services = servicesRes.rows;

    // Detect user preferences from query text
    const isSensitive = qLower.includes('sensitive') || qLower.includes('gentle') || qLower.includes('mild');
    const isDeep = qLower.includes('deep') || qLower.includes('intense') || qLower.includes('extraction');
    const isMassage = qLower.includes('massage') || qLower.includes('relax') || qLower.includes('body') || qLower.includes('stress');
    const isFacial = qLower.includes('facial') || qLower.includes('skin') || qLower.includes('face') || qLower.includes('glow');
    const isNails = qLower.includes('nail') || qLower.includes('manicure') || qLower.includes('pedicure') || qLower.includes('feet') || qLower.includes('hands');

    // Extract stated budget
    const budgetMatch = qLower.match(/(under|below|budget of|max|less than)?\s*(?:₱|php)?\s*(\d{3,4})/i);
    const statedBudget = params.maxBudget || (budgetMatch ? parseInt(budgetMatch[2], 10) : undefined);

    // 2. Score candidate services
    const candidateServices = services.map(s => {
      let score = 0;
      const reasons: string[] = [];
      const sDesc = (s.description || '').toLowerCase();
      const sName = s.name.toLowerCase();

      // Category matching
      if (isFacial && s.category === 'Facial') {
        score += 80;
        reasons.push('Matches your requested facial & skincare goal');
      } else if (isMassage && s.category.includes('Body')) {
        score += 80;
        reasons.push('Matches your relaxation and body wellness focus');
      } else if (isNails && s.category === 'Nails') {
        score += 80;
        reasons.push('Matches your nail care grooming preference');
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

          const chosenSlot = filteredSlots.length > 0 ? filteredSlots[0] : slots[0];
          const reasons = [...item.reasons];
          if (timeOfDay && filteredSlots.length > 0) {
            reasons.push(`Available in your preferred ${timeOfDay} time frame`);
          } else if (timeOfDay && filteredSlots.length === 0) {
            reasons.push(`Nearest open opening (outside preferred ${timeOfDay})`);
          }
          reasons.push(`Verified open slot with certified specialist ${chosenSlot.staffName}`);

          const recItem: ConciergeRecommendation = {
            serviceId: item.service.id,
            serviceName: item.service.name,
            price: Number(item.service.price),
            durationMinutes: item.service.duration_minutes,
            category: item.service.category,
            staffId: chosenSlot.staffId,
            staffName: chosenSlot.staffName,
            slot: chosenSlot,
            matchScore: item.score * 10 + (filteredSlots.length > 0 ? 15 : 0),
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

    return {
      recommendations: recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3),
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
