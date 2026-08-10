import { Router } from 'express';
import core from './walletCore.js';
import bnb from './walletBnb.js';

const router = Router();
// BNB specific routes first so they are not swallowed by /:telegramId
router.use(bnb);
router.use(core);
export default router;
