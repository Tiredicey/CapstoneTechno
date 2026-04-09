export class TrackingService {
  static STATUSES = ['new', 'processing', 'quality_check', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

  static getStatusIndex(status) {
    return TrackingService.STATUSES.indexOf(status);
  }

  static getNextStatus(currentStatus) {
    const idx = TrackingService.getStatusIndex(currentStatus);
    return idx < TrackingService.STATUSES.length - 1 ? TrackingService.STATUSES[idx + 1] : null;
  }

  static buildTimeline(trackingSteps) {
    return TrackingService.STATUSES.map(status => {
      const step = trackingSteps.find(s => s.status === status);
      return {
        status,
        label: TrackingService.label(status),
        completed: !!step,
        timestamp: step?.timestamp || null
      };
    });
  }

  static label(status) {
    const labels = {
      new: 'Order Received', processing: 'Processing', quality_check: 'Quality Check',
      packed: 'Packed & Ready', shipped: 'Shipped', out_for_delivery: 'Out for Delivery', delivered: 'Delivered'
    };
    return labels[status] || status;
  }

  static estimatedDelivery(deliveryDate, slot) {
    const slotTimes = { morning: '9am–12pm', afternoon: '12pm–4pm', evening: '4pm–8pm' };
    return `${deliveryDate} ${slotTimes[slot] || ''}`;
  }
}