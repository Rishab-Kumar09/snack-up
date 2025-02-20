const supabase = require('../supabase');

// Verify user belongs to company
const verifyCompanyAccess = async (req, res, next) => {
  const userId = req.query.userId || req.body.userId;
  const companyId = req.query.companyId || req.body.companyId || req.params.companyId;

  if (!userId || !companyId) {
    return res.status(400).json({ error: 'User ID and Company ID are required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.company_id !== companyId) {
      return res.status(403).json({ error: 'Access denied: User does not belong to this company' });
    }

    next();
  } catch (error) {
    console.error('Error verifying company access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify user is company admin
const verifyCompanyAdmin = async (req, res, next) => {
  const userId = req.query.userId || req.body.userId;
  const companyId = req.query.companyId || req.body.companyId || req.params.companyId;

  if (!userId || !companyId) {
    return res.status(400).json({ error: 'User ID and Company ID are required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('company_id, is_admin')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.company_id !== companyId || !user.is_admin) {
      return res.status(403).json({ error: 'Access denied: User is not an admin of this company' });
    }

    next();
  } catch (error) {
    console.error('Error verifying admin access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  verifyCompanyAccess,
  verifyCompanyAdmin
}; 