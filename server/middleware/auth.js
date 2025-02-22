const supabase = require('../supabase');

const authMiddleware = async (req, res, next) => {
  try {
    // Get user ID from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Extract the token from the Bearer format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) // Remove 'Bearer ' prefix
      : authHeader;

    if (!token) {
      return res.status(401).json({ error: 'No user ID provided' });
    }

    // Verify user exists and get their details
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, is_admin, company_id')
      .eq('id', token)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware; 