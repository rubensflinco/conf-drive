const jwt = require('jsonwebtoken');

// Middleware para verificar se o usuário está autenticado
async function checkAuth(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação não fornecido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const userDb = req.dbs.users;
    try {
      const user = await userDb.getData(`/users/${decoded.userId}`);
      req.user = user;
      req.user.id = decoded.userId;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
}; 

// Middleware para verificar se o usuário é admin
async function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores podem acessar esta rota.'
    });
  }
  next();
};

module.exports = { checkAuth, isAdmin };