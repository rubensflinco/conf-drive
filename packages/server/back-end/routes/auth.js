const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const argon2 = require('argon2');
const crypto = require('crypto');
const { createAuditLog } = require('./audit');
const { checkAuth, isAdmin } = require('../middleware/auth');
require('dotenv').config();


// Chave para criptografia do hash (32 bytes = 256 bits)
const HASH_KEY = crypto.scryptSync(process.env.JWT_SECRET, 'salt', 32);


// Função para encriptar o hash do Argon2
const encryptHash = (hash) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', HASH_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(hash, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Combina IV + AuthTag + Hash encriptado em base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

// Função para decriptar o hash
const decryptHash = (encryptedHash) => {
  try {
    const buffer = Buffer.from(encryptedHash, 'base64');
    
    // Extrai IV, AuthTag e hash encriptado
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', HASH_KEY, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (error) {
    console.error('Erro ao decriptar hash:', error);
    return null;
  }
};

// Funções de autenticação
const generateHash = async (password) => {
  const argonHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1
  });
  
  return encryptHash(argonHash);
};

const verifyHash = async (encryptedHash, password) => {
  try {
    const argonHash = decryptHash(encryptedHash);
    if (!argonHash) return false;
    
    return await argon2.verify(argonHash, password);
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Autenticação
 *     summary: Realiza login do usuário (visitante)
 *     description: Autentica o usuário e retorna um token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const userDb = req.dbs.users;

    // Buscar usuário pelo email
    let userId;
    try {
      userId = await userDb.getData(`/users_by_email/${email}`);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    const user = await userDb.getData(`/users/${userId}`);

    // Verificar senha
    const isMatch = await verifyHash(user.password, password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // Gerar token
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Autenticação
 *     summary: Obtém dados do usuário atual (user)
 *     description: Retorna os dados do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', checkAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do usuário'
    });
  }
});

module.exports = {
  router,
  generateHash,
  verifyHash
}; 