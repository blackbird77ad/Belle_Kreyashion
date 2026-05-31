import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export const signAdminToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '30d' });

export const signCustomerToken = (customer) => jwt.sign({
  id: String(customer._id || ''),
  customerId: customer.customerId,
  phone: customer.phone,
  email: customer.email || '',
  name: customer.name,
  emailVerified: !!customer.emailVerified,
}, SECRET, { expiresIn: '30d' });

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const protectCustomer = (req, res, next) => {
  const token = req.headers['x-customer-token'];
  if (!token) return res.status(401).json({ message: 'Customer session required' });
  try {
    req.customerAuth = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Customer session expired' });
  }
};

export const protectAdminOrCron = (req, res, next) => {
  const cronSecret = process.env.DIGITAL_TRIAL_CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'];

  if (cronSecret && providedSecret && providedSecret === cronSecret) {
    req.cronAuthType = 'secret';
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Admin token or cron secret required' });

  try {
    req.admin = jwt.verify(token, SECRET);
    req.cronAuthType = 'admin';
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
