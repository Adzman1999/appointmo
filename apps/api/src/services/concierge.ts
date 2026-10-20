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
  }): Promise<{ recommendations: ConciergeRecommendation[]; extractedPreferences: any }> {
    const qLower = params.query.toLowerCase();

    // 1. Fetch all active services for business
    const servicesRes = await query(
      'SELECT id, name, description, duration_minutes, price, category FROM services WHERE business_id = $1 AND is_active = true',
      [businessId]
    );
    const services = servicesRes.rows;

    // 2. Identify service matches via keyword or description
    const candidateServices = services.map(s => {
      let score = 0;
      const reasons: string[] = [];

      const nameWords = s.name.toLowerCase().split(' ');
      for (const w of nameWords) {
        if (qLower.includes(w)) {
          score += 40;
          reasons.push(`Direct match with ${s.name}`);
          break;
        }
      }

      if (qLower.includes('facial') && s.category === 'Facial') {
        score += 30;
        reasons.push('Matches requested facial category');
      } else if ((qLower.includes('massage') || qLower.includes('relax') || qLower.includes('body')) && s.category.includes('Body')) {
        score += 30;
        reasons.push('Matches body & relaxation wellness preference');
      } else if ((qLower.includes('nail') || qLower.includes('manicure') || qLower.includes('pedicure')) && s.category === 'Nails') {
        score += 30;
        reasons.push('Matches nail care preference');
      }

      // Budget check
      const budget = params.maxBudget || (qLower.match(/(under|below|budget of|max)?\s*(?:₱|php)?\s*(\d{3,4})/)?.[2] ? parseInt(qLower.match(/(under|below|budget of|max)?\s*(?:₱|php)?\s*(\d{3,4})/)![2], 10) : undefined);
      if (budget) {
        if (Number(s.price) <= budget) {
          score += 25;
          reasons.push(`Within specified budget (₱${s.price} <= ₱${budget})`);
        } else {
          score -= 30; // penalty if over budget
        }
      }

      return {
        service: s,
        score,
        reasons,
        budget,
      };
    }).sort((a, b) => b.score - a.score);

    // 3. Determine target date (default tomorrow if "tomorrow" mentioned, or next working day)
    let targetDateStr = params.preferredDate;
    if (!targetDateStr) {
      const tomorrow = new Date();
      if (qLower.includes('tomorrow')) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      } else {
        tomorrow.setDate(tomorrow.getDate() + 2);
      }
      targetDateStr = tomorrow.toISOString().split('T')[0];
    }

    // Determine time of day
    let timeOfDay = params.preferredTimeOfDay;
    if (!timeOfDay || timeOfDay === 'any') {
      if (qLower.includes('morning')) timeOfDay = 'morning';
      else if (qLower.includes('afternoon')) timeOfDay = 'afternoon';
      else if (qLower.includes('evening')) timeOfDay = 'evening';
    }

    const recommendations: ConciergeRecommendation[] = [];

    // 4. Query real slots for top candidate services
    for (const item of candidateServices.slice(0, 3)) {
      if (item.score <= 0 && candidateServices[0].score > 0) continue;

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
          }
          reasons.push(`Verified open slot with certified specialist ${chosenSlot.staffName}`);

          recommendations.push({
            serviceId: item.service.id,
            serviceName: item.service.name,
            price: Number(item.service.price),
            durationMinutes: item.service.duration_minutes,
            category: item.service.category,
            staffId: chosenSlot.staffId,
            staffName: chosenSlot.staffName,
            slot: chosenSlot,
            matchScore: item.score + (filteredSlots.length > 0 ? 15 : 0),
            matchReasons: reasons,
          });
        }
      } catch (err) {
        // Continue if service fails availability check
      }
    }

    return {
      recommendations: recommendations.sort((a, b) => b.matchScore - a.matchScore),
      extractedPreferences: {
        targetDate: targetDateStr,
        timeOfDay: timeOfDay || 'any',
        budget: candidateServices[0]?.budget,
      },
    };
  }
}
