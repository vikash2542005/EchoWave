import {Router} from 'express';
import { login, signup } from '../controllers/user.controller.js';
import { addUserHistory, getUserHistory } from '../controllers/user.controller.js';

const router = Router();

// Routes

router.route("/login").post(login);
router.route("/signup").post(signup);
router.route("/add_activity").post(addUserHistory);
router.route("/get_all_activities").get(getUserHistory);


export default router;
