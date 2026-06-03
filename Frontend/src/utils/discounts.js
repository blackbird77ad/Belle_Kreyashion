export const roundDiscountMoney = (value = 0) => Math.max(0, Math.round(Number(value) || 0));

export const toDiscountDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const isDiscountLive = (discount = {}, now = new Date()) => {
  if (!discount?.active) return false;

  const startDate = discount?.startDate ? new Date(discount.startDate) : null;
  if (startDate && !Number.isNaN(startDate.getTime()) && startDate > now) return false;

  const endDate = discount?.endDate ? new Date(discount.endDate) : null;
  if (endDate && !Number.isNaN(endDate.getTime()) && endDate < now) return false;

  const limitCustomers = Math.max(0, Number(discount?.limitCustomers) || 0);
  const usedCount = Math.max(0, Number(discount?.usedCount) || 0);
  if (limitCustomers > 0 && usedCount >= limitCustomers) return false;

  return true;
};

export const buildDiscountPresentation = (retailPrice, discount = {}, options = {}) => {
  const { respectLiveState = false } = options;
  const basePrice = roundDiscountMoney(retailPrice);
  const type = discount?.type === 'fixed' ? 'fixed' : 'percent';
  const discountValue = Math.max(0, Number(discount?.value) || 0);
  const label = String(discount?.label || '').trim();
  const limitCustomers = Math.max(0, Number(discount?.limitCustomers) || 0);
  const isConfigured = basePrice > 0 && discountValue > 0;
  const discounted = respectLiveState
    ? (isConfigured && isDiscountLive(discount))
    : isConfigured;

  let finalPrice = basePrice;
  if (discounted) {
    finalPrice = type === 'percent'
      ? roundDiscountMoney(basePrice * (1 - (discountValue / 100)))
      : Math.max(0, roundDiscountMoney(basePrice - discountValue));
  }

  const savedAmount = Math.max(0, basePrice - finalPrice);
  const savedPercent = basePrice > 0
    ? Math.round((savedAmount / basePrice) * 100)
    : 0;
  const offerText = type === 'percent'
    ? `${discountValue}% off`
    : `Save GHS ${savedAmount.toLocaleString()}`;
  const limitText = limitCustomers
    ? `for first ${limitCustomers} customer${limitCustomers === 1 ? '' : 's'}`
    : '';

  return {
    discounted,
    isConfigured,
    basePrice,
    finalPrice,
    savedAmount,
    savedPercent,
    type,
    discountValue,
    label,
    limitCustomers,
    offerText,
    limitText,
  };
};
